import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackPrismaQuery } from '@/lib/db-monitoring';
import { paginate, optimizeInclude, QueryBuilder } from '@/lib/db-optimization';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const sensorId = searchParams.get('sensorId');
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const orderBy = searchParams.get('orderBy') || 'timestamp';

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

    // Build optimized where clause using QueryBuilder
    const whereClause = {
      ...QueryBuilder.timeRange('timestamp', startDate, endDate),
      ...(sensorId && { sensorId }),
      ...(status && { status }),
    };

    // If roomId is provided, get all sensors in the room
    if (roomId && !sensorId) {
      const sensorIds = await trackPrismaQuery(
        'sensor.findMany.room_filter',
        () => prisma.sensor.findMany({
          where: { roomId },
          select: { id: true },
        })
      );

      if (sensorIds.length > 0) {
        whereClause.sensorId = { in: sensorIds.map(s => s.id) };
      }
    }

    // Optimized include with depth control to prevent N+1
    const optimizedInclude = optimizeInclude({
      sensor: {
        include: {
          room: true,
        },
      },
    });

    // Get paginated sensor analytics data
    const result = await trackPrismaQuery(
      'sensorAnalytics.findMany.paginated',
      () => paginate(prisma.sensorAnalytics, {
        page,
        limit,
        orderBy,
        orderDirection: 'desc',
      }, whereClause, optimizedInclude)
    );

    // Calculate summary statistics from the paginated data
    const analytics = result.data;
    const summary = {
      totalReadings: analytics.length,
      page: result.meta.page,
      limit: result.meta.limit,
      statusDistribution: analytics.reduce((acc, item) => {
        const status = item.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      avgReading: analytics.length > 0
        ? analytics.reduce((acc, item) => acc + item.reading, 0) / analytics.length
        : 0,
      avgAnomalyScore: analytics.filter(a => a.anomalyScore !== null).length > 0
        ? analytics.reduce((acc, item) => acc + (item.anomalyScore || 0), 0) / analytics.length
        : 0,
    };

    // Use $queryRaw for complex aggregations (more efficient than JS processing)
    const timeSeriesData = await trackPrismaQuery(
      'sensorAnalytics.queryRaw.timeseries',
      () => prisma.$queryRaw`
        SELECT
          strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
          sensorId,
          AVG(reading) as avgReading,
          MIN(reading) as minReading,
          MAX(reading) as maxReading,
          AVG(anomalyScore) as avgAnomaly,
          COUNT(*) as count
        FROM SensorAnalytics
        WHERE timestamp >= ${startDate.toISOString()} AND timestamp <= ${endDate.toISOString()}
        ${sensorId ? prisma.$unsafe(`AND sensorId = '${sensorId}'`) : roomId ? prisma.$unsafe(`AND sensorId IN (${JSON.stringify(result.data.map(a => a.sensorId)).replace(/[\[\]"]/g, '')})`) : prisma.$unsafe('')}
        GROUP BY hour, sensorId
        ORDER BY hour ASC
      `
    );

    // Get alerts with pagination
    const alertsResult = await trackPrismaQuery(
      'alert.findMany.with_pagination',
      () => paginate(prisma.alert, {
        page: 1,
        limit: 50,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }, {
        ...QueryBuilder.timeRange('createdAt', startDate, endDate),
        ...(sensorId && { sensorId }),
      }, {
        sensor: true,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        summary,
        timeSeriesData,
        pagination: result.meta,
        alerts: {
          data: alertsResult.data,
          meta: alertsResult.meta,
        },
        timeframe,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sensor analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sensor analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sensorId, reading, value, status, threshold, anomalyScore, temperature, humidity } = body;

    if (!sensorId || reading === undefined || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sensorId, reading, status',
        },
        { status: 400 }
      );
    }

    // Verify sensor exists with optimized query
    const sensor = await trackPrismaQuery(
      'sensor.findUnique.verify',
      () => prisma.sensor.findUnique({
        where: { id: sensorId },
        select: { id: true, name: true, type: true },
      })
    );

    if (!sensor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sensor not found',
        },
        { status: 404 }
      );
    }

    // Create analytics record with validation
    const analytics = await trackPrismaQuery(
      'sensorAnalytics.create',
      () => prisma.sensorAnalytics.create({
        data: {
          sensorId,
          reading: Number(reading),
          value: value || {},
          status,
          threshold: threshold ? Number(threshold) : null,
          anomalyScore: anomalyScore !== undefined ? Number(anomalyScore) : null,
          temperature: temperature !== undefined ? Number(temperature) : null,
          humidity: humidity !== undefined ? Number(humidity) : null,
          timestamp: new Date(),
        },
        include: {
          sensor: {
            select: {
              id: true,
              name: true,
              type: true,
              room: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error creating sensor analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create sensor analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
