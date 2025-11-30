import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

function convertToCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma or quote
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  return [csvHeaders, ...csvRows].join('\n');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics'; // 'metrics', 'sensors', 'plant-health', 'performance'
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'json'
    const timeframe = searchParams.get('timeframe') || '7d';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      switch (timeframe) {
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
          startDate = startOfDay(subDays(endDate, 7));
      }
    }

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'metrics':
        data = await prisma.metric.findMany({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10000,
        });
        filename = `analytics-metrics-${endDate.toISOString().split('T')[0]}.${format}`;
        break;

      case 'sensors':
        data = await prisma.sensorAnalytics.findMany({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            sensor: {
              include: {
                room: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10000,
        });
        filename = `sensor-analytics-${endDate.toISOString().split('T')[0]}.${format}`;
        break;

      case 'plant-health':
        data = await prisma.plantHealthAnalytics.findMany({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            plant: {
              include: {
                strain: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10000,
        });
        filename = `plant-health-analytics-${endDate.toISOString().split('T')[0]}.${format}`;
        break;

      case 'performance':
        data = await prisma.aPIPerformanceMetrics.findMany({
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10000,
        });
        filename = `api-performance-${endDate.toISOString().split('T')[0]}.${format}`;
        break;

      case 'summary':
        // Create comprehensive summary report
        const [metrics, sensorAnalytics, healthAnalytics, performance] = await Promise.all([
          prisma.metric.count({ where: { timestamp: { gte: startDate, lte: endDate } } }),
          prisma.sensorAnalytics.count({ where: { timestamp: { gte: startDate, lte: endDate } } }),
          prisma.plantHealthAnalytics.count({ where: { timestamp: { gte: startDate, lte: endDate } } }),
          prisma.aPIPerformanceMetrics.count({ where: { timestamp: { gte: startDate, lte: endDate } } }),
        ]);

        data = [{
          reportType: 'Analytics Summary',
          dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
          totalMetrics: metrics,
          totalSensorReadings: sensorAnalytics,
          totalPlantHealthAnalyses: healthAnalytics,
          totalAPICalls: performance,
          generatedAt: new Date().toISOString(),
        }];
        filename = `analytics-summary-${endDate.toISOString().split('T')[0]}.${format}`;
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid export type. Use: metrics, sensors, plant-health, performance, or summary',
          },
          { status: 400 }
        );
    }

    // Format output based on requested format
    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      // Convert to CSV
      let csv = '';
      let headers: string[] = [];

      if (data.length > 0) {
        // Get first object to determine headers
        const firstRow = data[0];
        headers = Object.keys(firstRow);

        // Flatten nested objects for CSV export
        const flattenedData = data.map(row => {
          const flattened: any = {};
          Object.keys(row).forEach(key => {
            if (row[key] === null || row[key] === undefined) {
              flattened[key] = '';
            } else if (typeof row[key] === 'object' && !Array.isArray(row[key])) {
              // Flatten nested objects
              flattened[key] = JSON.stringify(row[key]);
            } else if (Array.isArray(row[key])) {
              // Stringify arrays
              flattened[key] = JSON.stringify(row[key]);
            } else {
              flattened[key] = row[key];
            }
          });
          return flattened;
        });

        csv = convertToCSV(flattenedData, headers);
      }

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export analytics data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
