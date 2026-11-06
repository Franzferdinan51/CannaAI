import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  runAutomationEngine,
  checkSchedules,
  checkForAnomalies,
  generateMilestones
} from '@/lib/automation-engine';

// The engine implementation lives in @/lib/automation-engine so this
// manual endpoint and the in-process scheduler (src/lib/scheduler.ts)
// share one code path. Only the explicitly-manual cleanup action and the
// status readout remain local to this route — cleanup deletes retained
// records and is never run by a timer.

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
