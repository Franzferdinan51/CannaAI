import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackPrismaQuery } from '@/lib/db-monitoring';
import { QueryBuilder } from '@/lib/db-optimization';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
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

    // Check if report already exists with optimized query
    const existingReport = await trackPrismaQuery(
      'dailyReport.findUnique',
      () => prisma.dailyReport.findUnique({
        where: { date: startDate },
        select: {
          id: true,
          date: true,
          summary: true,
          metrics: true,
          alertsCount: true,
          actionsCount: true,
          analysisCount: true,
          sensorReadings: true,
          generatedAt: true,
        },
      })
    );

    if (existingReport) {
      return NextResponse.json({
        success: true,
        data: existingReport,
        cached: true,
      });
    }

    // Gather all metrics with parallel queries and tracking
    const [
      alertsCount,
      actionsCount,
      analysisCount,
      sensorReadingsCount,
      plantHealthSummary,
      apiMetricsSummary,
    ] = await Promise.all([
      trackPrismaQuery(
        'alert.count',
        () => prisma.alert.count({
          where: QueryBuilder.timeRange('createdAt', startDate, endDate),
        })
      ),
      trackPrismaQuery(
        'action.count',
        () => prisma.action.count({
          where: QueryBuilder.timeRange('createdAt', startDate, endDate),
        })
      ),
      trackPrismaQuery(
        'plantAnalysis.count',
        () => prisma.plantAnalysis.count({
          where: QueryBuilder.timeRange('createdAt', startDate, endDate),
        })
      ),
      trackPrismaQuery(
        'sensorReading.count',
        () => prisma.sensorReading.count({
          where: QueryBuilder.timeRange('timestamp', startDate, endDate),
        })
      ),
      // Use aggregation for better performance
      trackPrismaQuery(
        'plantHealthAnalytics.aggregate',
        () => prisma.plantHealthAnalytics.aggregate({
          where: QueryBuilder.timeRange('timestamp', startDate, endDate),
          _count: true,
          _avg: {
            healthScore: true,
          },
          _min: {
            healthScore: true,
          },
          _max: {
            healthScore: true,
          },
        })
      ),
      // Use aggregation for API metrics
      trackPrismaQuery(
        'apiPerformanceMetrics.aggregate',
        () => prisma.aPIPerformanceMetrics.aggregate({
          where: QueryBuilder.timeRange('timestamp', startDate, endDate),
          _count: true,
          _avg: {
            responseTime: true,
          },
          _sum: {
            requestSize: true,
            responseSize: true,
          },
        })
      ),
    ]);

    // Build summary object
    const summary = {
      alerts: alertsCount,
      actions: actionsCount,
      analyses: analysisCount,
      sensorReadings: sensorReadingsCount,
    };

    const metrics = {
      plantHealth: {
        total: plantHealthSummary._count,
        avgScore: plantHealthSummary._avg.healthScore || 0,
        minScore: plantHealthSummary._min.healthScore || 0,
        maxScore: plantHealthSummary._max.healthScore || 0,
      },
      api: {
        totalRequests: apiMetricsSummary._count,
        avgResponseTime: apiMetricsSummary._avg.responseTime || 0,
        totalRequestSize: apiMetricsSummary._sum.requestSize || 0,
        totalResponseSize: apiMetricsSummary._sum.responseSize || 0,
      },
    };

    // Create and cache the report
    const report = await trackPrismaQuery(
      'dailyReport.create',
      () => prisma.dailyReport.create({
        data: {
          date: startDate,
          summary,
          metrics,
          alertsCount,
          actionsCount,
          analysisCount,
          sensorReadings: sensorReadingsCount,
          generatedAt: new Date(),
        },
      })
    );

    return NextResponse.json({
      success: true,
      data: report,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating analytics report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
