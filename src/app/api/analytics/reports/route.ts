import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // 'daily' or 'monthly'
    const dateParam = searchParams.get('date');

    let reportDate: Date;
    if (dateParam) {
      reportDate = new Date(dateParam);
    } else {
      reportDate = new Date();
    }

    let startDate: Date;
    let endDate: Date;

    if (type === 'daily') {
      startDate = startOfDay(reportDate);
      endDate = endOfDay(reportDate);
    } else {
      startDate = startOfMonth(reportDate);
      endDate = endOfMonth(reportDate);
    }

    // Check if report already exists
    const existingReport = await prisma.dailyReport.findUnique({
      where: { date: startDate },
    });

    if (existingReport) {
      return NextResponse.json({
        success: true,
        data: existingReport,
        cached: true,
      });
    }

    // Gather all metrics for the date range
    const [
      alertsCount,
      actionsCount,
      analysisCount,
      sensorReadings,
      plantHealthData,
      apiMetrics,
    ] = await Promise.all([
      prisma.alert.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.action.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.plantAnalysis.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.sensorReading.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
      }),
      prisma.plantHealthAnalytics.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        include: {
          plant: {
            include: {
              strain: true,
            },
          },
        },
      }),
      prisma.aPIPerformanceMetrics.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Calculate plant health statistics
    const plantHealthSummary = plantHealthData.reduce(
      (acc, item) => {
        acc.total++;
        acc.score += item.healthScore;
        const status = item.healthStatus;
        acc.statusCounts[status] = (acc.statusCounts[status] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        score: 0,
        statusCounts: {} as Record<string, number>,
        avgScore: 0,
      }
    );

    if (plantHealthSummary.total > 0) {
      plantHealthSummary.avgScore =
        plantHealthSummary.score / plantHealthSummary.total;
    }

    // Calculate API performance statistics
    const apiSummary = apiMetrics.reduce(
      (acc, item) => {
        acc.total++;
        acc.responseTime += item.responseTime;
        if (item.success) {
          acc.successCount++;
        } else {
          acc.errorCount++;
        }
        acc.statusCodes[item.statusCode] =
          (acc.statusCodes[item.statusCode] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        responseTime: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        successRate: 0,
        statusCodes: {} as Record<number, number>,
      }
    );

    if (apiSummary.total > 0) {
      apiSummary.avgResponseTime = apiSummary.responseTime / apiSummary.total;
      apiSummary.successRate = (apiSummary.successCount / apiSummary.total) * 100;
    }

    // Create comprehensive summary
    const summary = {
      alerts: alertsCount,
      actions: actionsCount,
      analyses: analysisCount,
      sensorReadings,
      plantHealth: {
        totalAnalyses: plantHealthSummary.total,
        averageHealthScore: Number(plantHealthSummary.avgScore.toFixed(2)),
        statusDistribution: plantHealthSummary.statusCounts,
      },
      api: {
        totalRequests: apiSummary.total,
        averageResponseTime: Number(apiSummary.avgResponseTime.toFixed(2)),
        successRate: Number(apiSummary.successRate.toFixed(2)),
        statusCodeDistribution: apiSummary.statusCodes,
      },
    };

    // Create detailed metrics
    const metrics = {
      sensors: {
        totalReadings: sensorReadings,
        activeSensors: await prisma.sensor.count({
          where: { enabled: true },
        }),
        alerts: alertsCount,
      },
      plants: {
        totalAnalyses: analysisCount,
        averageHealthScore: Number(plantHealthSummary.avgScore.toFixed(2)),
        healthStatusDistribution: plantHealthSummary.statusCounts,
      },
      automation: {
        actionsExecuted: actionsCount,
      },
      api: {
        totalRequests: apiSummary.total,
        successRate: Number(apiSummary.successRate.toFixed(2)),
        averageResponseTime: Number(apiSummary.avgResponseTime.toFixed(2)),
        topEndpoints: Object.entries(
          apiMetrics.reduce((acc, item) => {
            acc[item.endpoint] = (acc[item.endpoint] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([endpoint, count]) => ({ endpoint, count })),
      },
    };

    // Create or update the report
    const report = await prisma.dailyReport.upsert({
      where: { date: startDate },
      update: {
        summary,
        metrics,
        alertsCount,
        actionsCount,
        analysisCount,
        sensorReadings,
        generatedAt: new Date(),
      },
      create: {
        date: startDate,
        summary,
        metrics,
        alertsCount,
        actionsCount,
        analysisCount,
        sensorReadings,
      },
    });

    return NextResponse.json({
      success: true,
      data: report,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: date',
        },
        { status: 400 }
      );
    }

    const reportDate = new Date(date);
    const startDate = startOfDay(reportDate);

    await prisma.dailyReport.delete({
      where: { date: startDate },
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
