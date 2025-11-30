import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const notificationResult = await sendNotification(action.config);
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
    success: true
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
    success: true
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
        results.push({ plantId, success: true, result });

        await prisma.analysisBatch.update({
          where: { id: batchId },
          data: {
            completedCount: { increment: 1 }
          }
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
      success: true
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
  // This would integrate with the actual analysis API
  return {
    triggered: true,
    plantId,
    config,
    timestamp: new Date().toISOString()
  };
}

async function triggerTrichomeAnalysis(plantId: string, config?: any) {
  return {
    triggered: true,
    plantId,
    type: 'trichome',
    config,
    timestamp: new Date().toISOString()
  };
}

async function triggerHealthAnalysis(plantId: string, config?: any) {
  return {
    triggered: true,
    plantId,
    type: 'health',
    config,
    timestamp: new Date().toISOString()
  };
}

async function triggerCapture(plantId: string | null, config?: any) {
  return {
    triggered: true,
    plantId,
    config,
    timestamp: new Date().toISOString()
  };
}

async function sendNotification(config: any) {
  return {
    sent: true,
    config,
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
  // This would run anomaly detection logic
  return {
    checked: true,
    plantId,
    config,
    timestamp: new Date().toISOString()
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
