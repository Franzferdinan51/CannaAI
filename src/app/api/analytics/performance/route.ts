import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const endpoint = searchParams.get('endpoint');

    let startDate: Date;
    let endDate: Date = new Date();

    switch (timeframe) {
      case '1h':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = startOfDay(subDays(endDate, 1));
        break;
      case '7d':
        startDate = startOfDay(subDays(endDate, 7));
        break;
      case '30d':
        startDate = startOfDay(subDays(endDate, 30));
        break;
      default:
        startDate = startOfDay(subDays(endDate, 1));
    }

    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (endpoint) {
      whereClause.endpoint = endpoint;
    }

    // Get API performance metrics
    const metrics = await prisma.aPIPerformanceMetrics.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    // Calculate summary statistics
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const avgResponseTime = totalRequests > 0
      ? metrics.reduce((acc, m) => acc + m.responseTime, 0) / totalRequests
      : 0;

    const minResponseTime = totalRequests > 0 ? Math.min(...metrics.map(m => m.responseTime)) : 0;
    const maxResponseTime = totalRequests > 0 ? Math.max(...metrics.map(m => m.responseTime)) : 0;

    // Get status code distribution
    const statusCodeDistribution = metrics.reduce((acc, item) => {
      const code = item.statusCode;
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Get endpoint-specific stats
    const endpointStats = metrics.reduce((acc, item) => {
      const ep = item.endpoint;
      if (!acc[ep]) {
        acc[ep] = {
          endpoint: ep,
          method: item.method,
          count: 0,
          totalResponseTime: 0,
          avgResponseTime: 0,
          successCount: 0,
          errorCount: 0,
        };
      }
      acc[ep].count++;
      acc[ep].totalResponseTime += item.responseTime;
      if (item.success) {
        acc[ep].successCount++;
      } else {
        acc[ep].errorCount++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.values(endpointStats).forEach((stats: any) => {
      stats.avgResponseTime = stats.totalResponseTime / stats.count;
      stats.successRate = (stats.successCount / stats.count) * 100;
    });

    // Get hourly response time trends
    const trends = await prisma.$queryRaw`
      SELECT
        strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
        endpoint,
        AVG(responseTime) as avgResponseTime,
        COUNT(*) as requestCount,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount
      FROM APIPerformanceMetrics
      WHERE timestamp >= ${startDate.toISOString()} AND timestamp <= ${endDate.toISOString()}
      ${endpoint ? prisma.$unsafe(`AND endpoint = '${endpoint}'`) : ''}
      GROUP BY hour, endpoint
      ORDER BY hour ASC
      LIMIT 100
    ` as any[];

    // Calculate 95th percentile response time
    const sortedResponseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const percentile95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p95ResponseTime = sortedResponseTimes.length > 0
      ? sortedResponseTimes[percentile95Index]
      : 0;

    // Get top slowest requests
    const slowestRequests = metrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    // Get most frequent errors
    const errorTypes = metrics
      .filter(m => !m.success)
      .reduce((acc, item) => {
        const error = item.errorMessage || `Status ${item.statusCode}`;
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topErrors = Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          successfulRequests,
          failedRequests,
          successRate: Number(successRate.toFixed(2)),
          avgResponseTime: Number(avgResponseTime.toFixed(2)),
          minResponseTime,
          maxResponseTime,
          p95ResponseTime: Number(p95ResponseTime.toFixed(2)),
          statusCodeDistribution,
        },
        endpointStats: Object.values(endpointStats),
        trends: trends.slice(0, 200),
        slowestRequests,
        topErrors,
        metrics: metrics.slice(0, 100),
        timeframe,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      endpoint,
      method,
      statusCode,
      responseTime,
      success,
      errorMessage,
      requestSize,
      responseSize,
      userAgent,
      ipAddress,
    } = body;

    if (!endpoint || !method || !statusCode || responseTime === undefined || success === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: endpoint, method, statusCode, responseTime, success',
        },
        { status: 400 }
      );
    }

    const metric = await prisma.aPIPerformanceMetrics.create({
      data: {
        endpoint,
        method,
        statusCode: Number(statusCode),
        responseTime: Number(responseTime),
        success: Boolean(success),
        errorMessage: errorMessage || null,
        requestSize: requestSize ? Number(requestSize) : null,
        responseSize: responseSize ? Number(responseSize) : null,
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: metric,
    });
  } catch (error) {
    console.error('Error creating performance metric:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create performance metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
