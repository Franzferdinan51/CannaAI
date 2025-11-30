import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const sensorId = searchParams.get('sensorId');
    const roomId = searchParams.get('roomId');

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

    // Build where clause for sensor analytics
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (sensorId) {
      whereClause.sensorId = sensorId;
    } else if (roomId) {
      // Get all sensors in the room
      const sensors = await prisma.sensor.findMany({
        where: { roomId },
        select: { id: true },
      });
      const sensorIds = sensors.map(s => s.id);
      if (sensorIds.length > 0) {
        whereClause.sensorId = { in: sensorIds };
      }
    }

    // Get sensor analytics data
    const analytics = await prisma.sensorAnalytics.findMany({
      where: whereClause,
      include: {
        sensor: {
          include: {
            room: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    // Get summary statistics
    const summary = {
      totalReadings: analytics.length,
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

    // Get time-series data for charts
    const timeSeriesData = await prisma.$queryRaw`
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
      ${sensorId ? prisma.$unsafe(`AND sensorId = '${sensorId}'`) : ''}
      GROUP BY hour, sensorId
      ORDER BY hour ASC
    ` as any[];

    // Get sensor-specific stats
    const sensorStats: Record<string, any> = {};
    for (const reading of analytics) {
      const sid = reading.sensorId;
      if (!sensorStats[sid]) {
        sensorStats[sid] = {
          sensorId: sid,
          sensorName: reading.sensor.name,
          sensorType: reading.sensor.type,
          room: reading.sensor.room?.name || 'Unknown',
          totalReadings: 0,
          readings: [],
          statuses: {},
          avgReading: 0,
          avgAnomaly: 0,
        };
      }
      sensorStats[sid].readings.push(reading.reading);
      sensorStats[sid].totalReadings++;
      sensorStats[sid].statuses[reading.status] = (sensorStats[sid].statuses[reading.status] || 0) + 1;
      if (reading.anomalyScore !== null) {
        sensorStats[sid].avgAnomaly += reading.anomalyScore;
      }
    }

    // Calculate averages
    Object.values(sensorStats).forEach((stats: any) => {
      if (stats.readings.length > 0) {
        stats.avgReading = stats.readings.reduce((a: number, b: number) => a + b, 0) / stats.readings.length;
      }
      stats.avgAnomaly = stats.avgAnomaly / stats.totalReadings;
    });

    // Get alerts from sensor readings
    const alerts = await prisma.alert.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(sensorId ? { sensorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sensor: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        analytics: analytics.slice(0, 200),
        summary,
        timeSeriesData,
        sensorStats: Object.values(sensorStats),
        alerts: alerts.slice(0, 50),
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

    // Verify sensor exists
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sensor not found',
        },
        { status: 404 }
      );
    }

    const analytics = await prisma.sensorAnalytics.create({
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
        sensor: true,
      },
    });

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
