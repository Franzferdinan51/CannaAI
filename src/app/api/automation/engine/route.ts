import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHours, addDays, addWeeks, addMonths } from 'date-fns';
import { analyzePlantHealth } from '@/lib/ai';
import { sendNotification } from '@/lib/notifications';
import { exportManager } from '@/lib/export-import-utils';

export async function GET(request: NextRequest) {
  try {
    const engineStatus = await getEngineStatus();

    return NextResponse.json({
      success: true,
      data: engineStatus
    });
  } catch (error) {
    console.error('Engine status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get engine status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    let result;

    switch (action) {
      case 'run':
        result = await runAutomationEngine();
        break;
      case 'check-schedules':
        result = await checkSchedules();
        break;
      case 'check-anomalies':
        result = await checkForAnomalies();
        break;
      case 'generate-milestones':
        result = await generateMilestones();
        break;
      case 'cleanup':
        result = await cleanupOldData();
        break;
      default:
        result = await runAutomationEngine();
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Engine execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute automation engine',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function runAutomationEngine() {
  const results = {
    schedulesChecked: 0,
    schedulesExecuted: 0,
    anomaliesDetected: 0,
    milestonesGenerated: 0,
    errors: []
  };

  try {
    // 1. Check and execute scheduled tasks
    const scheduleResults = await checkSchedules();
    results.schedulesChecked = scheduleResults.checked;
    results.schedulesExecuted = scheduleResults.executed;

    // 2. Check for anomalies
    const anomalyResults = await checkForAnomalies();
    results.anomaliesDetected = anomalyResults.detected;

    // 3. Generate milestones
    const milestoneResults = await generateMilestones();
    results.milestonesGenerated = milestoneResults.generated;

    // Cleanup is exposed as an explicit action. A random branch here made
    // scheduled runs nondeterministic and could unexpectedly delete retained
    // records during an ordinary automation pass.

  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    console.error('Automation engine error:', error);
  }

  return {
    executedAt: new Date().toISOString(),
    ...results,
    success: results.errors.length === 0
  };
}

async function checkSchedules() {
  const now = new Date();

  // Find AnalysisScheduler tasks that are due
  const dueSchedulers = await prisma.analysisScheduler.findMany({
    where: {
      enabled: true,
      nextRun: {
        lte: now
      }
    },
    include: {
      plant: true
    }
  });

  let executed = 0;
  const results = [];

  for (const scheduler of dueSchedulers) {
    try {
      console.log(`Executing scheduled analysis for plant ${scheduler.plantId}: ${scheduler.analysisType}`);

      // Execute the analysis
      let analysisResult;
      switch (scheduler.analysisType) {
        case 'photo':
          analysisResult = await triggerPhotoAnalysis(scheduler.plantId, scheduler.config);
          break;
        case 'trichome':
          analysisResult = await triggerTrichomeAnalysis(scheduler.plantId, scheduler.config);
          break;
        case 'health':
          analysisResult = await triggerHealthAnalysis(scheduler.plantId, scheduler.config);
          break;
        default:
          analysisResult = await triggerPhotoAnalysis(scheduler.plantId, scheduler.config);
      }

      // Calculate next run time
      let nextRun: Date;
      const now = new Date();

      switch (scheduler.frequency) {
        case 'hourly':
          nextRun = addHours(now, 1);
          break;
        case 'daily':
          nextRun = addDays(now, 1);
          if (scheduler.timeOfDay) {
            const [hours, minutes] = scheduler.timeOfDay.split(':').map(Number);
            nextRun.setHours(hours, minutes, 0, 0);
          }
          break;
        case 'bi_weekly':
          nextRun = addWeeks(now, 2);
          break;
        case 'weekly':
          nextRun = addWeeks(now, 1);
          break;
        case 'monthly':
          nextRun = addMonths(now, 1);
          break;
        default:
          nextRun = addDays(now, 1);
      }

      const actionSucceeded = analysisResult?.success !== false;

      // Update scheduler even when a capture is unavailable so an hourly/daily
      // job does not spin continuously and overload the local machine.
      await prisma.analysisScheduler.update({
        where: { id: scheduler.id },
        data: {
          lastRun: now,
          nextRun
        }
      });

      if (actionSucceeded) executed++;

      results.push({
        schedulerId: scheduler.id,
        plantId: scheduler.plantId,
        analysisType: scheduler.analysisType,
        success: actionSucceeded,
        ...(actionSucceeded ? {} : { message: analysisResult?.message }),
        nextRun
      });

      if (actionSucceeded) {
        // Store only real provider-backed analysis results in history.
        await prisma.analysisHistory.create({
          data: {
            plantId: scheduler.plantId,
            analysisType: `automated_${scheduler.analysisType}`,
            data: analysisResult,
            metadata: {
              schedulerId: scheduler.id,
              executedAt: now.toISOString(),
              type: 'scheduled'
            }
          }
        });

        // Check for anomalies only when analysis produced real data.
        await analyzeAndDetectAnomalies(scheduler.plantId, analysisResult);
      }

    } catch (error) {
      console.error(`Failed to execute scheduler ${scheduler.id}:`, error);
      results.push({
        schedulerId: scheduler.id,
        plantId: scheduler.plantId,
        analysisType: scheduler.analysisType,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Also check Schedule models
  const dueSchedules = await prisma.schedule.findMany({
    where: {
      enabled: true,
      nextRun: {
        lte: now
      }
    },
    include: {
      rules: true
    }
  });

  for (const schedule of dueSchedules) {
    try {
      console.log(`Executing schedule: ${schedule.name}`);
      let scheduleSucceeded = true;

      if (schedule.type === 'export') {
        const config = schedule.config && typeof schedule.config === 'object' && !Array.isArray(schedule.config)
          ? schedule.config as Record<string, any>
          : {};
        const jobId = await exportManager.createExportJob({
          format: config.format || 'zip',
          filters: config.filters,
          includeMetadata: config.includeMetadata !== false,
          includeThumbnails: config.includeThumbnails,
          customFields: config.customFields
        });
        results.push({ scheduleId: schedule.id, type: 'export', success: true, jobId });
      }

      if (schedule.type !== 'export') {
        // Execute all rules for this schedule
        for (const rule of schedule.rules) {
          if (rule.enabled) {
            const ruleResult = await executeRule(rule.id);
            results.push({ ruleId: rule.id, ...ruleResult });
            scheduleSucceeded = scheduleSucceeded && ruleResult.success === true;
          }
        }
      }

      // Calculate next run
      let nextRun: Date;
      const now = new Date();

      if (schedule.cronExpression) {
        // For simplicity, using interval instead of full cron parsing
        // In production, use a proper cron library
        nextRun = addDays(now, 1);
      } else if (schedule.interval) {
        switch (schedule.interval) {
          case 'hourly':
            nextRun = addHours(now, 1);
            break;
          case 'daily':
            nextRun = addDays(now, 1);
            break;
          case 'weekly':
            nextRun = addWeeks(now, 1);
            break;
          case 'monthly':
            nextRun = addMonths(now, 1);
            break;
          default:
            nextRun = addDays(now, 1);
        }
      } else {
        nextRun = addDays(now, 1);
      }

      // Update schedule
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          lastRun: now,
          nextRun,
          runCount: { increment: 1 }
        }
      });

      if (scheduleSucceeded) executed++;

    } catch (error) {
      console.error(`Failed to execute schedule ${schedule.id}:`, error);
    }
  }

  return {
    checked: dueSchedulers.length + dueSchedules.length,
    executed,
    results
  };
}

async function checkForAnomalies() {
  // Get recent analyses
  const recentAnalyses = await prisma.analysisHistory.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    include: {
      plant: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  let detected = 0;

  for (const history of recentAnalyses) {
    try {
      await analyzeAndDetectAnomalies(history.plantId, history.data);
      detected++;
    } catch (error) {
      console.error(`Anomaly detection failed for plant ${history.plantId}:`, error);
    }
  }

  return {
    detected,
    checked: recentAnalyses.length
  };
}

async function generateMilestones() {
  // Get recent analyses that might indicate milestones
  const recentAnalyses = await prisma.analysisHistory.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // Last 12 hours
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  let generated = 0;

  for (const history of recentAnalyses) {
    try {
      const data = history.data as any;

      // Check for harvest readiness
      if (data?.trichomeAnalysis?.harvestReadiness?.ready) {
        const existing = await prisma.analysisMilestone.findFirst({
          where: {
            plantId: history.plantId,
            type: 'harvest_ready',
            detectedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        if (!existing) {
          await prisma.analysisMilestone.create({
            data: {
              plantId: history.plantId,
              type: 'harvest_ready',
              title: 'Harvest Ready - Autom Detected',
              description: `Plants are ready for harvest based on trichome analysis`,
              data: data.trichomeAnalysis
            }
          });
          generated++;
        }
      }

      // Check for flowering stage
      if (data?.stage === 'flowering') {
        const existing = await prisma.analysisMilestone.findFirst({
          where: {
            plantId: history.plantId,
            type: 'flowering_start'
          }
        });

        if (!existing) {
          await prisma.analysisMilestone.create({
            data: {
              plantId: history.plantId,
              type: 'flowering_start',
              title: 'Flowering Stage Started',
              description: 'Plants have entered the flowering stage',
              data: data
            }
          });
          generated++;
        }
      }

      // Check for critical issues
      if (data?.severity === 'critical' || data?.healthScore < 50) {
        const existing = await prisma.analysisMilestone.findFirst({
          where: {
            plantId: history.plantId,
            type: 'deficiency_detected',
            detectedAt: {
              gte: new Date(Date.now() - 6 * 60 * 60 * 1000)
            }
          }
        });

        if (!existing) {
          await prisma.analysisMilestone.create({
            data: {
              plantId: history.plantId,
              type: 'deficiency_detected',
              title: 'Critical Issue Detected',
              description: 'Significant plant health issues detected',
              data: data
            }
          });
          generated++;
        }
      }

    } catch (error) {
      console.error(`Milestone generation failed for history ${history.id}:`, error);
    }
  }

  return {
    generated,
    checked: recentAnalyses.length
  };
}

async function cleanupOldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Cleanup old anomalies
  const deletedAnomalies = await prisma.anomalyDetection.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo
      },
      resolved: true
    }
  });

  // Cleanup old notifications
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo
      },
      acknowledged: true
    }
  });

  // Cleanup old analysis history (keep only 200 per plant)
  const plants = await prisma.plant.findMany({
    select: { id: true }
  });

  for (const plant of plants) {
    const histories = await prisma.analysisHistory.findMany({
      where: { plantId: plant.id },
      orderBy: { createdAt: 'desc' },
      skip: 200
    });

    if (histories.length > 0) {
      await prisma.analysisHistory.deleteMany({
        where: {
          id: {
            in: histories.map(h => h.id)
          }
        }
      });
    }
  }

  return {
    deletedAnomalies: deletedAnomalies.count,
    deletedNotifications: deletedNotifications.count,
    cleanedAt: new Date().toISOString()
  };
}

async function getEngineStatus() {
  const [schedulerCount, scheduleCount, pendingBatches, activeAnomalies] = await Promise.all([
    prisma.analysisScheduler.count({ where: { enabled: true } }),
    prisma.schedule.count({ where: { enabled: true } }),
    prisma.analysisBatch.count({ where: { status: 'pending' } }),
    prisma.anomalyDetection.count({ where: { resolved: false } })
  ]);

  return {
    enabled: true,
    version: '1.0.0',
    activeSchedulers: schedulerCount,
    activeSchedules: scheduleCount,
    pendingBatches,
    activeAnomalies,
    lastRun: new Date().toISOString()
  };
}

// Helper functions
async function triggerPhotoAnalysis(plantId: string | null, config?: any) {
  if (!plantId) {
    return { success: false, available: false, status: 'invalid', message: 'A plant is required for scheduled analysis.' };
  }
  const imageData = [config?.imageData, config?.plantImage, config?.image]
    .find((value) => typeof value === 'string' && value.trim());
  if (!imageData) {
    return {
      success: false,
      available: false,
      status: 'awaiting_capture',
      plantId,
      type: 'photo',
      message: 'Scheduled photo analysis requires an image capture.'
    };
  }

  const analysis = await analyzePlantHealth(imageData, {
    strain: config?.strain,
    growthStage: config?.growthStage,
    medium: config?.medium,
    temperature: typeof config?.temperature === 'number' ? config.temperature : undefined,
    humidity: typeof config?.humidity === 'number' ? config.humidity : undefined,
    phLevel: typeof config?.phLevel === 'number' ? config.phLevel : undefined,
    symptoms: Array.isArray(config?.symptoms) ? config.symptoms : undefined
  });

  return {
    success: true,
    available: true,
    plantId,
    type: 'photo',
    triggered: true,
    timestamp: new Date().toISOString(),
    analysis
  };
}

async function triggerTrichomeAnalysis(plantId: string | null, config?: any) {
  return {
    success: false,
    available: false,
    status: 'awaiting_capture',
    plantId,
    type: 'trichome',
    message: 'Scheduled trichome analysis requires a captured microscope image.'
  };
}

async function triggerHealthAnalysis(plantId: string | null, config?: any) {
  const result = await triggerPhotoAnalysis(plantId, config);
  return { ...result, type: 'health' };
}

async function executeRule(ruleId: string) {
  const rule = await prisma.automationRule.findUnique({
    where: { id: ruleId }
  });

  if (!rule) {
    return { success: false, available: false, message: 'Automation rule not found.' };
  }

  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  const results = [];
  for (const action of actions) {
    const config = { ...(rule.config as any || {}), ...(action?.config || {}) };
    let result;
    switch (action?.type) {
      case 'analyze':
      case 'health':
        result = await triggerHealthAnalysis(rule.plantId, config);
        break;
      case 'capture': {
        const task = await prisma.task.create({
          data: {
            title: config.title || 'Automated Photo Capture',
            description: config.description || 'Photo capture requested by automation',
            type: 'photo_capture',
            priority: config.priority || 'medium',
            status: 'pending',
            plantId: rule.plantId,
            data: { captureType: config.captureType || 'automation', deviceInfo: config.deviceInfo || {}, requestedBy: 'automation' }
          }
        });
        result = { success: true, available: true, triggered: true, status: 'awaiting_capture', taskId: task.id };
        break;
      }
      case 'notify': {
        if (!config.title || !config.message) {
          result = { success: false, available: false, message: 'Notification title and message are required.' };
          break;
        }
        const delivery = await sendNotification({
          type: config.type || 'automation_event',
          title: config.title,
          message: config.message,
          severity: config.severity || 'info',
          channels: Array.isArray(config.channels) && config.channels.length ? config.channels : ['in_app'],
          metadata: config.metadata || {},
          plantId: config.plantId ?? rule.plantId,
          sensorId: config.sensorId,
          roomId: config.roomId,
          userId: config.userId
        });
        result = { success: delivery.deliveries.some((item) => item.success), available: true, notificationId: delivery.notification.id, deliveries: delivery.deliveries };
        break;
      }
      default:
        result = { success: false, available: false, message: `Unsupported automation action: ${String(action?.type || 'unknown')}` };
    }
    results.push({ type: action?.type || 'unknown', result });
  }

  return {
    success: results.length > 0 && results.every((item: any) => item.result?.success === true),
    available: true,
    results,
    executedAt: new Date().toISOString()
  };
}

async function analyzeAndDetectAnomalies(plantId: string | null, data: any) {
  if (!plantId || !data) return;

  // Health score anomaly detection
  const healthScore = data.healthScore || data.analysis?.healthScore;
  if (healthScore && healthScore < 60) {
    // Check if anomaly already exists
    const existing = await prisma.anomalyDetection.findFirst({
      where: {
        plantId,
        metric: 'health_score',
        resolved: false
      }
    });

    if (!existing) {
      await prisma.anomalyDetection.create({
        data: {
          plantId,
          type: 'health',
          metric: 'health_score',
          severity: healthScore < 40 ? 'critical' : 'high',
          threshold: 60,
          currentValue: healthScore,
          data: { analysisData: data }
        }
      });
    }
  }

  // Trichome stage anomaly detection
  const trichomeStage = data.trichomeAnalysis?.overallMaturity?.stage;
  if (trichomeStage === 'amber' && data.trichomeAnalysis?.harvestReadiness?.ready) {
    const existing = await prisma.anomalyDetection.findFirst({
      where: {
        plantId,
        metric: 'trichome_maturity',
        resolved: false
      }
    });

    if (!existing) {
      await prisma.anomalyDetection.create({
        data: {
          plantId,
          type: 'trichome',
          metric: 'trichome_maturity',
          severity: 'medium',
          threshold: 70,
          currentValue: data.trichomeAnalysis?.trichomeDistribution?.amber || 0,
          data: { trichomeData: data.trichomeAnalysis }
        }
      });
    }
  }
}
