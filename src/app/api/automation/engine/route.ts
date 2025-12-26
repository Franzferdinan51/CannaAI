import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addHours, addDays, addWeeks, addMonths } from 'date-fns';

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

    // 4. Cleanup old data periodically
    if (Math.random() < 0.1) { // 10% chance to run cleanup
      await cleanupOldData();
    }

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

      // Update scheduler
      await prisma.analysisScheduler.update({
        where: { id: scheduler.id },
        data: {
          lastRun: now,
          nextRun
        }
      });

      executed++;

      results.push({
        schedulerId: scheduler.id,
        plantId: scheduler.plantId,
        analysisType: scheduler.analysisType,
        success: true,
        nextRun
      });

      // Store in analysis history
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

      // Check for anomalies
      await analyzeAndDetectAnomalies(scheduler.plantId, analysisResult);

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

      // Execute all rules for this schedule
      for (const rule of schedule.rules) {
        if (rule.enabled) {
          await executeRule(rule.id);
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

      executed++;

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
  // This would call the actual analysis API
  return {
    plantId,
    type: 'photo',
    triggered: true,
    timestamp: new Date().toISOString(),
    config: config || {}
  };
}

async function triggerTrichomeAnalysis(plantId: string | null, config?: any) {
  return {
    plantId,
    type: 'trichome',
    triggered: true,
    timestamp: new Date().toISOString(),
    config: config || {}
  };
}

async function triggerHealthAnalysis(plantId: string | null, config?: any) {
  return {
    plantId,
    type: 'health',
    triggered: true,
    timestamp: new Date().toISOString(),
    config: config || {}
  };
}

async function executeRule(ruleId: string) {
  // Implementation for executing automation rules
  const rule = await prisma.automationRule.findUnique({
    where: { id: ruleId }
  });

  if (!rule) return;

  // Execute actions
  const actions = rule.actions as any[];
  for (const action of actions) {
    // Execute action logic here
    console.log(`Executing action: ${action.type}`);
  }
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
