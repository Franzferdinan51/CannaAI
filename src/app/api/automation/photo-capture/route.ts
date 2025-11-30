import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const status = searchParams.get('status');

    const where: any = {};
    if (plantId) where.plantId = plantId;
    if (status) where.status = status;

    const captures = await prisma.task.findMany({
      where: {
        type: 'photo_capture',
        ...where
      },
      include: {
        plant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: captures
    });
  } catch (error) {
    console.error('Photo capture fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch photo captures',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      plantId,
      type,
      deviceInfo,
      config,
      scheduleCapture,
      scheduleTime
    } = body;

    // Create photo capture task
    const task = await prisma.task.create({
      data: {
        title: `Photo Capture: ${type || 'General'}`,
        description: `Automated photo capture for ${type || 'analysis'}`,
        type: 'photo_capture',
        priority: 'medium',
        status: scheduleCapture ? 'scheduled' : 'pending',
        plantId,
        data: {
          captureType: type || 'general',
          deviceInfo: deviceInfo || {},
          config: config || {},
          scheduledFor: scheduleTime
        }
      },
      include: {
        plant: true
      }
    });

    // If scheduled, schedule the capture
    if (scheduleCapture && scheduleTime) {
      // The actual capture would be executed by the automation engine
      // when the scheduled task becomes due
      await prisma.analysisScheduler.create({
        data: {
          plantId,
          analysisType: 'photo',
          frequency: 'once',
          enabled: true,
          config: {
            taskId: task.id,
            captureType: type
          },
          nextRun: new Date(scheduleTime)
        }
      });
    } else {
      // Execute capture immediately
      executeCapture(task.id).catch(err => console.error('Photo capture error:', err));
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Photo capture creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create photo capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, imageData, result } = body;

    // Update task with capture result
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: status || 'completed',
        data: {
          ...body.data,
          imageData,
          result,
          capturedAt: new Date().toISOString()
        },
        completedAt: new Date()
      },
      include: {
        plant: true
      }
    });

    // If capture was successful and has image data, trigger analysis
    if (imageData && task.plantId) {
      triggerAnalysisAfterCapture(task.plantId, imageData, task.data).catch(err =>
        console.error('Post-capture analysis error:', err)
      );
    }

    return NextResponse.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Photo capture update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update photo capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function executeCapture(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { plant: true }
    });

    if (!task) return;

    // Update status to running
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'running'
      }
    });

    // Simulate photo capture
    // In a real implementation, this would interface with camera APIs
    console.log(`Executing photo capture for plant ${task.plantId}`);

    const captureResult = {
      success: true,
      capturedAt: new Date().toISOString(),
      deviceInfo: task.data.deviceInfo || {},
      imageUrl: null, // Would be populated with actual image URL
      message: 'Photo capture completed (simulated)'
    };

    // Update task with result
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        data: {
          ...task.data,
          ...captureResult
        }
      }
    });

    // Trigger analysis if image was captured
    if (task.plantId && task.data.imageData) {
      await triggerAnalysisAfterCapture(task.plantId, task.data.imageData, task.data);
    }

  } catch (error) {
    console.error('Capture execution error:', error);

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        }
      }
    });
  }
}

async function triggerAnalysisAfterCapture(plantId: string, imageData: string, captureData: any) {
  try {
    // Find analysis rules for this plant
    const rules = await prisma.automationRule.findMany({
      where: {
        plantId,
        enabled: true,
        type: 'trigger'
      },
      include: {
        trigger: true
      }
    });

    // Trigger photo analysis
    for (const rule of rules) {
      const trigger = rule.trigger;
      if (trigger && trigger.type === 'manual') {
        // Execute actions for this rule
        const actions = rule.actions as any[];
        for (const action of actions) {
          if (action.type === 'analyze') {
            await executeAnalysisAction(plantId, imageData, captureData, action.config);
          }
        }
      }
    }

  } catch (error) {
    console.error('Post-capture analysis error:', error);
  }
}

async function executeAnalysisAction(plantId: string, imageData: string, captureData: any, config: any) {
  // This would integrate with the actual analysis API
  // For now, just store in analysis history
  await prisma.analysisHistory.create({
    data: {
      plantId,
      analysisType: 'photo',
      data: {
        capturedAt: captureData.capturedAt,
        deviceInfo: captureData.deviceInfo,
        analysisType: 'automated_photo_capture'
      },
      metadata: {
        source: 'auto_capture',
        captureTask: captureData.taskId
      }
    }
  });
}
