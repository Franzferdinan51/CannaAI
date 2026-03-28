import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { subDays, startOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';

    await ensureSeedData();

    const today = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '1h':
        startDate = new Date(today.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = startOfDay(subDays(today, 1));
        break;
      case '7d':
        startDate = startOfDay(subDays(today, 7));
        break;
      default:
        startDate = startOfDay(subDays(today, 1));
    }

    const [
      plants,
      alerts,
      actions,
      sensorReadings,
      plantAnalyses,
      apiMetrics
    ] = await Promise.all([
      // Optimize: Only fetch health data for calculating average score
      // This avoids loading potentially large plant objects with images/metadata
      prisma.plant.findMany({
        select: {
          health: true,
        },
      }),
      prisma.alert.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: today,
          },
        },
      }),
      prisma.action.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: today,
          },
        },
      }),
      // Optimize: Only fetch value and timestamp for chart generation
      prisma.sensorReading.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: today,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: {
          value: true,
          timestamp: true,
        },
      }),
      prisma.plantAnalysis.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: today,
          },
        },
      }),
      // Optimize: Only fetch success/latency for metrics calculation
      prisma.aPIPerformanceMetrics.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: today,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        select: {
          success: true,
          responseTime: true,
        },
      }),
    ]);

    const healthAvg = plants.length
      ? plants.reduce((acc, p) => acc + ((p.health as any)?.score || 0), 0) / plants.length
      : 0;

    // Calculate success rate from API metrics
    const successRate = apiMetrics.length > 0
      ? (apiMetrics.filter(m => m.success).length / apiMetrics.length) * 100
      : 0;

    // Calculate average response time
    const avgResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((acc, m) => acc + m.responseTime, 0) / apiMetrics.length
      : 0;

    // Get sensor data for charts
    const chartData = sensorReadings.slice(0, 24).reverse().map(reading => ({
      name: new Date(reading.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: reading.value || 0,
      timestamp: reading.timestamp,
    }));

    // Get alerts by severity
    const alertsBySeverity = await prisma.alert.groupBy({
      by: ['severity'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: today,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sensors: {
          uptime: sensorReadings.length > 0 ? 0.99 : 0,
          anomalies: alerts,
          totalReadings: sensorReadings.length,
          chartData,
          alertsBySeverity,
        },
        plants: {
          healthAvg,
          issuesOpen: alerts,
          totalPlants: plants.length,
          analysesCount: plantAnalyses,
        },
        automation: {
          actionsToday: actions,
        },
        api: {
          successRate,
          avgResponseTime,
          totalRequests: apiMetrics.length,
        },
        timeframe,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

