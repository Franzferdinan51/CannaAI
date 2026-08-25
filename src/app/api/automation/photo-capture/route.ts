import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { executeCapture, triggerAnalysisAfterCapture } from '@/lib/photo-capture-service';

function asJsonRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

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

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask || existingTask.type !== 'photo_capture') {
      return NextResponse.json(
        { success: false, error: 'Photo capture task not found' },
        { status: 404 }
      );
    }

    const hasImageData = typeof imageData === 'string' && imageData.trim().length > 0;
    const requestedStatus = typeof status === 'string' ? status : undefined;
    if ((requestedStatus === 'completed' || !requestedStatus) && !hasImageData) {
      return NextResponse.json(
        { success: false, error: 'imageData is required to complete a photo capture' },
        { status: 400 }
      );
    }

    const nextStatus = requestedStatus || 'completed';

    // Update task with capture result
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: nextStatus,
        data: {
          ...asJsonRecord(existingTask.data),
          ...asJsonRecord(body.data),
          ...(hasImageData
            ? { imageData, capturedAt: new Date().toISOString() }
            : {}),
          ...(result !== undefined ? { result } : {})
        },
        completedAt: nextStatus === 'completed' ? new Date() : null
      },
      include: {
        plant: true
      }
    });

    // If capture was successful and has image data, trigger analysis
    if (imageData && task.plantId) {
      triggerAnalysisAfterCapture(task.plantId, imageData, {
        ...asJsonRecord(task.data),
        taskId: task.id
      }).catch(err =>
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
