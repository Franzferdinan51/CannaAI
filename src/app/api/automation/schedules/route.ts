import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, addWeeks, addMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');

    const where: any = {};
    if (plantId) where.plantId = plantId;
    if (type) where.type = type;
    if (enabled !== null) where.enabled = enabled === 'true';

    const schedules = await prisma.analysisScheduler.findMany({
      where,
      include: {
        plant: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Schedules fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plantId, analysisType, frequency, timeOfDay, enabled, config } = body;

    // Calculate next run time based on frequency
    const now = new Date();
    let nextRun: Date;

    switch (frequency) {
      case 'hourly':
        nextRun = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        nextRun = addDays(now, 1);
        if (timeOfDay) {
          const [hours, minutes] = timeOfDay.split(':').map(Number);
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

    const schedule = await prisma.analysisScheduler.create({
      data: {
        plantId,
        analysisType,
        frequency,
        timeOfDay,
        enabled: enabled ?? true,
        config: config || {},
        nextRun
      },
      include: {
        plant: true
      }
    });

    return NextResponse.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Schedule creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    // Recalculate next run if frequency or timeOfDay changed
    if (data.frequency || data.timeOfDay) {
      const schedule = await prisma.analysisScheduler.findUnique({
        where: { id }
      });

      if (schedule) {
        const now = new Date();
        let nextRun: Date;

        const frequency = data.frequency || schedule.frequency;
        const timeOfDay = data.timeOfDay || schedule.timeOfDay;

        switch (frequency) {
          case 'hourly':
            nextRun = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case 'daily':
            nextRun = addDays(now, 1);
            if (timeOfDay) {
              const [hours, minutes] = timeOfDay.split(':').map(Number);
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

        data.nextRun = nextRun;
      }
    }

    const schedule = await prisma.analysisScheduler.update({
      where: { id },
      data,
      include: {
        plant: true
      }
    });

    return NextResponse.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Schedule update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    await prisma.analysisScheduler.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Schedule deletion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
