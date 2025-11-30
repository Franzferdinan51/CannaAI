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
      plantHealthStats,
      apiStats,
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
      // Use aggregate for plant health statistics
      prisma.plantHealthAnalytics.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
        _avg: { healthScore: true },
      }),
      // Use aggregate for API performance statistics
      prisma.aPIPerformanceMetrics.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
        _avg: { responseTime: true },
      }),
    ]);

    // Get plant health status distribution using groupBy
    const plantHealthStatusDistribution = await prisma.plantHealthAnalytics.groupBy({
      by: ['healthStatus'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { healthStatus: true },
    });

    // Get API status code distribution using groupBy
    const apiStatusCodeDistribution = await prisma.aPIPerformanceMetrics.groupBy({
      by: ['statusCode'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { statusCode: true },
    });

    // Get top endpoints using groupBy
    const topEndpointsData = await prisma.aPIPerformanceMetrics.groupBy({
      by: ['endpoint'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 5,
    });

    // Calculate success/error counts
    const apiSuccessStats = await prisma.aPIPerformanceMetrics.groupBy({
      by: ['success'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { success: true },
    });

    // Calculate API summary from stats
    const apiSummary = {
      total: apiStats._count || 0,
      avgResponseTime: apiStats._avg.responseTime || 0,
      successCount: apiSuccessStats.find(s => s.success)?. _count.success || 0,
      errorCount: apiSuccessStats.find(s => !s.success)?. _count.success || 0,
      avgResponseTime: apiStats._avg.responseTime || 0,
      successRate: apiStats._count > 0
        ? ((apiSuccessStats.find(s => s.success)?. _count.success || 0) / apiStats._count) * 100
        : 0,
      statusCodes: apiStatusCodeDistribution.reduce((acc, item) => {
        acc[item.statusCode] = item._count.statusCode;
        return acc;
      }, {} as Record<number, number>),
    };

    // Calculate plant health summary from stats
    const plantHealthSummary = {
      total: plantHealthStats._count || 0,
      avgScore: plantHealthStats._avg.healthScore || 0,
      statusCounts: plantHealthStatusDistribution.reduce((acc, item) => {
        acc[item.healthStatus] = item._count.healthStatus;
        return acc;
      }, {} as Record<string, number>),
    };

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
        topEndpoints: topEndpointsData.map(item => ({
          endpoint: item.endpoint,
          count: item._count.endpoint,
        })),
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
