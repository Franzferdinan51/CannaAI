import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzePlantHealth } from '@/lib/ai';
import { sendNotification as deliverNotification, type NotificationData } from '@/lib/notifications';

interface RunRequest {
  type: 'rule' | 'schedule' | 'workflow' | 'batch';
  id: string;
  data?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RunRequest;
    const { type, id, data } = body;

    let result;

    switch (type) {
      case 'rule':
        result = await executeAutomationRule(id, data);
        break;
      case 'schedule':
        result = await executeSchedule(id);
        break;
      case 'workflow':
        result = await executeWorkflow(id, data);
        break;
      case 'batch':
        result = await executeBatch(id);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid execution type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Automation execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute automation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function executeAutomationRule(ruleId: string, data?: any) {
  const rule = await prisma.automationRule.findUnique({
    where: { id: ruleId },
    include: { plant: true, schedule: true, trigger: true }
  });

  if (!rule) {
    throw new Error('Automation rule not found');
  }

  if (!rule.enabled) {
    throw new Error('Automation rule is disabled');
  }

  // Execute actions based on rule type
  const actions = rule.actions as any[];
  const results = [];

  for (const action of actions) {
    switch (action.type) {
      case 'analyze':
        // Trigger photo analysis
        const analysisResult = await triggerAnalysis(rule.plantId, action.config);
        results.push({ action: 'analyze', result: analysisResult });
        break;

      case 'capture':
        // Trigger photo capture
        const captureResult = await triggerCapture(rule.plantId, action.config);
        results.push({ action: 'capture', result: captureResult });
        break;

      case 'notify':
        // Send notification
        const notificationResult = await sendNotification({
          ...(action.config || {}),
          plantId: action.config?.plantId ?? rule.plantId
        });
        results.push({ action: 'notify', result: notificationResult });
        break;

      case 'create-task':
        // Create task
        const taskResult = await createTask(rule.plantId, action.config);
        results.push({ action: 'create-task', result: taskResult });
        break;

      case 'check-anomalies':
        // Check for anomalies
        const anomalyResult = await checkAnomalies(rule.plantId, action.config);
        results.push({ action: 'check-anomalies', result: anomalyResult });
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  return {
    ruleId,
    executedAt: new Date().toISOString(),
    results,
    success: results.every((item: any) => item.result?.success !== false)
  };
}

async function executeSchedule(scheduleId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { rules: true }
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  if (!schedule.enabled) {
    throw new Error('Schedule is disabled');
  }

  // Update last run time
  await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      lastRun: new Date(),
      runCount: { increment: 1 }
    }
  });

  // Execute all rules associated with this schedule
  const results = [];
  for (const rule of schedule.rules) {
    if (rule.enabled) {
      const result = await executeAutomationRule(rule.id);
      results.push(result);
    }
  }

  return {
    scheduleId,
    executedAt: new Date().toISOString(),
    rulesExecuted: results.length,
    results,
    success: true
  };
}

async function executeWorkflow(workflowId: string, data?: any) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId }
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (!workflow.enabled) {
    throw new Error('Workflow is disabled');
  }

  const steps = workflow.steps as any[];
  const results = [];
  let currentStep = 0;

  while (currentStep < steps.length) {
    const step = steps[currentStep];
    let stepResult;

    switch (step.type) {
      case 'if':
        // Evaluate condition
        const conditionMet = evaluateCondition(step.condition, data);
        if (conditionMet) {
          // Execute then branch
          stepResult = await executeWorkflowStep(step.then, data);
        } else if (step.else) {
          // Execute else branch
          stepResult = await executeWorkflowStep(step.else, data);
        } else {
          stepResult = { skipped: true };
        }
        break;

      case 'analyze':
        stepResult = await triggerAnalysis(data?.plantId, step.config);
        break;

      case 'capture':
        stepResult = await triggerCapture(data?.plantId, step.config);
        break;

      case 'notify':
        stepResult = await sendNotification(step.config);
        break;

      case 'wait':
        // Wait for specified duration
        await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
        stepResult = { waited: step.duration || 1000 };
        break;

      case 'loop':
        // Execute loop
        const loopResults = [];
        for (let i = 0; i < (step.count || 1); i++) {
          const loopResult = await executeWorkflowStep(step.do, data);
          loopResults.push(loopResult);
        }
        stepResult = { loopResults, iterations: step.count || 1 };
        break;

      default:
        stepResult = { warning: `Unknown step type: ${step.type}` };
    }

    results.push({
      stepIndex: currentStep,
      stepType: step.type,
      result: stepResult
    });

    currentStep++;
  }

  return {
    workflowId,
    executedAt: new Date().toISOString(),
    stepsExecuted: results.length,
    results,
    success: results.every((item: any) => item.result?.success !== false)
  };
}

async function executeBatch(batchId: string) {
  const batch = await prisma.analysisBatch.findUnique({
    where: { id: batchId }
  });

  if (!batch) {
    throw new Error('Batch not found');
  }

  if (!['pending', 'failed'].includes(batch.status)) {
    throw new Error(`Cannot execute batch with status: ${batch.status}`);
  }

  // Update batch status to running
  await prisma.analysisBatch.update({
    where: { id: batchId },
    data: {
      status: 'running',
      startedAt: new Date()
    }
  });

  try {
    const plantIds = JSON.parse(batch.plantIds) as string[];
    const results = [];

    for (const plantId of plantIds) {
      try {
        let result;
        switch (batch.type) {
          case 'photo':
            result = await triggerAnalysis(plantId, batch.config);
            break;
          case 'trichome':
            result = await triggerTrichomeAnalysis(plantId, batch.config);
            break;
          case 'health':
            result = await triggerHealthAnalysis(plantId, batch.config);
            break;
          default:
            result = await triggerAnalysis(plantId, batch.config);
        }
        const actionSucceeded = result?.success !== false && result?.available !== false;
        results.push({ plantId, success: actionSucceeded, result });

        await prisma.analysisBatch.update({
          where: { id: batchId },
          data: actionSucceeded
            ? { completedCount: { increment: 1 } }
            : { failedCount: { increment: 1 } }
        });
      } catch (error) {
        console.error(`Batch analysis failed for plant ${plantId}:`, error);
        results.push({
          plantId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await prisma.analysisBatch.update({
          where: { id: batchId },
          data: {
            failedCount: { increment: 1 }
          }
        });
      }
    }

    // Update batch status to completed
    await prisma.analysisBatch.update({
      where: { id: batchId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        results: { results }
      }
    });

    return {
      batchId,
      executedAt: new Date().toISOString(),
      totalCount: plantIds.length,
      completedCount: batch.completedCount + 1,
      failedCount: batch.failedCount,
      results,
      success: results.every((item: any) => item.success)
    };
  } catch (error) {
    // Update batch status to failed
    await prisma.analysisBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        completedAt: new Date()
      }
    });

    throw error;
  }
}

// Helper functions
async function triggerAnalysis(plantId: string | null, config?: any) {
  if (!plantId) throw new Error('A plant is required for automated analysis');

  const imageData = [config?.imageData, config?.plantImage, config?.image]
    .find((value) => typeof value === 'string' && value.trim());
  if (!imageData) {
    return {
      success: false,
      available: false,
      status: 'awaiting_capture',
      plantId,
      message: 'Automated analysis requires an image. Create a capture task or provide imageData.'
    };
  }

  const analysis = await analyzePlantHealth(imageData, {
    model: typeof config?.model === 'string' ? config.model : undefined,
    baseUrl: typeof config?.baseUrl === 'string' ? config.baseUrl : undefined,
    primaryProvider: typeof config?.primaryProvider === 'string' ? config.primaryProvider : undefined,
    observationScope: config?.observationScope === 'multiple-plants' || config?.observationScope === 'crop' ? config.observationScope : 'single-plant',
    expectedPlantCount: typeof config?.expectedPlantCount === 'number' ? config.expectedPlantCount : undefined,
    strain: config?.strain,
    growthStage: config?.growthStage,
    medium: config?.medium,
    temperature: typeof config?.temperature === 'number' ? config.temperature : undefined,
    humidity: typeof config?.humidity === 'number' ? config.humidity : undefined,
    phLevel: typeof config?.phLevel === 'number' ? config.phLevel : undefined,
    symptoms: Array.isArray(config?.symptoms) ? config.symptoms : undefined
  });

  await prisma.analysisHistory.create({
    data: {
      plantId,
      analysisType: 'automated_health',
      data: {
        diagnosis: analysis.diagnosis,
        confidence: analysis.confidence,
        recommendations: analysis.recommendations,
        urgency: analysis.urgency,
        potentialIssues: analysis.potentialIssues,
        suggestedActions: analysis.suggestedActions,
        nextSteps: analysis.nextSteps
      },
      metadata: { source: 'automation_run', automated: true }
    }
  });

  return {
    success: true,
    available: true,
    triggered: true,
    plantId,
    result: analysis,
    timestamp: new Date().toISOString()
  };
}

async function triggerTrichomeAnalysis(plantId: string, config?: any) {
  return {
    success: false,
    available: false,
    status: 'awaiting_capture',
    plantId,
    type: 'trichome',
    message: 'Trichome analysis requires a captured image. Create a photo capture task first.'
  };
}

async function triggerHealthAnalysis(plantId: string, config?: any) {
  return {
    success: false,
    available: false,
    status: 'awaiting_capture',
    plantId,
    type: 'health',
    message: 'Health analysis requires a captured image. Create a photo capture task first.'
  };
}

async function triggerCapture(plantId: string | null, config?: any) {
  const task = await prisma.task.create({
    data: {
      title: config?.title || 'Automated Photo Capture',
      description: config?.description || 'Photo capture requested by automation',
      type: 'photo_capture',
      priority: config?.priority || 'medium',
      status: 'pending',
      plantId,
      data: {
        captureType: config?.captureType || 'automation',
        deviceInfo: config?.deviceInfo || {},
        requestedBy: 'automation'
      }
    }
  });

  return {
    success: true,
    available: true,
    triggered: true,
    plantId,
    status: 'awaiting_capture',
    taskId: task.id,
    timestamp: new Date().toISOString()
  };
}

async function sendNotification(config: any) {
  const channels = Array.isArray(config?.channels) && config.channels.length > 0
    ? config.channels
    : ['in_app'];
  if (!config?.title || !config?.message) {
    return {
      success: false,
      sent: false,
      error: 'Notification title and message are required'
    };
  }

  const notification: NotificationData = {
    type: config.type || 'automation_event',
    title: config.title,
    message: config.message,
    severity: config.severity || 'info',
    channels,
    metadata: config.metadata || {},
    plantId: config.plantId,
    sensorId: config.sensorId,
    roomId: config.roomId,
    userId: config.userId
  };
  const result = await deliverNotification(notification);
  const deliveries = result.deliveries || [];
  const success = deliveries.length > 0 && deliveries.every((delivery) => delivery.success);

  return {
    success,
    sent: success,
    notificationId: result.notification?.id,
    deliveries,
    timestamp: new Date().toISOString()
  };
}

async function createTask(plantId: string | null, config: any) {
  const task = await prisma.task.create({
    data: {
      title: config.title || 'Automated Task',
      description: config.description,
      type: config.type || 'analysis',
      priority: config.priority || 'medium',
      status: 'pending',
      plantId,
      data: config.data || {}
    }
  });

  return {
    created: true,
    task,
    timestamp: new Date().toISOString()
  };
}

async function checkAnomalies(plantId: string | null, config: any) {
  return {
    success: false,
    available: false,
    checked: false,
    plantId,
    message: 'Anomaly detection is unavailable until persisted sensor or analysis data is provided.'
  };
}

function evaluateCondition(condition: any, data?: any): boolean {
  // Simple condition evaluator - can be extended
  if (condition.type === 'value') {
    return condition.value === true;
  }
  if (condition.type === 'equals') {
    return data?.[condition.key] === condition.expected;
  }
  if (condition.type === 'greater_than') {
    return data?.[condition.key] > condition.threshold;
  }
  return false;
}

async function executeWorkflowStep(step: any, data?: any) {
  if (Array.isArray(step)) {
    const results = [];
    for (const subStep of step) {
      const result = await executeWorkflowStep(subStep, data);
      results.push(result);
    }
    return { results };
  } else if (typeof step === 'object') {
    // Single step
    switch (step.type) {
      case 'analyze':
        return await triggerAnalysis(data?.plantId, step.config);
      case 'capture':
        return await triggerCapture(data?.plantId, step.config);
      case 'notify':
        return await sendNotification(step.config);
      default:
        return { warning: `Unknown step type: ${step.type}` };
    }
  }
  return { warning: 'Invalid step definition' };
}
