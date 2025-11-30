import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfHour, endOfHour } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    const metricName = searchParams.get('metric');
    const category = searchParams.get('category');

    let startDate: Date;
    let endDate: Date = new Date();

    // Calculate date range based on timeframe
    switch (timeframe) {
      case '1h':
        startDate = startOfHour(subDays(endDate, 1));
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
      case '90d':
        startDate = startOfDay(subDays(endDate, 90));
        break;
      default:
        startDate = startOfDay(subDays(endDate, 1));
    }

    // Build where clause
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (metricName) {
      whereClause.name = metricName;
    }

    if (category) {
      whereClause.category = category;
    }

    // Get metrics data
    const metrics = await prisma.metric.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    // Get aggregated data for charts
    const aggregatedData = await prisma.dataAggregation.findMany({
      where: {
        period: timeframe === '24h' ? 'hourly' : timeframe === '7d' ? 'daily' : 'daily',
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Calculate summary statistics
    const summary = {
      totalMetrics: metrics.length,
      avgValue: metrics.length > 0
        ? metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length
        : 0,
      minValue: metrics.length > 0 ? Math.min(...metrics.map(m => m.value)) : 0,
      maxValue: metrics.length > 0 ? Math.max(...metrics.map(m => m.value)) : 0,
      uniqueMetrics: [...new Set(metrics.map(m => m.name))].length,
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: metrics.slice(0, 100), // Limit for performance
        aggregated: aggregatedData,
        summary,
        timeframe,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, value, tags } = body;

    if (!name || !type || value === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, type, value',
        },
        { status: 400 }
      );
    }

    const metric = await prisma.metric.create({
      data: {
        name,
        type,
        value: Number(value),
        tags: tags || {},
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: metric,
    });
  } catch (error) {
    console.error('Error creating metric:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
