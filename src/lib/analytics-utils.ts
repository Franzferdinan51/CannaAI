import { prisma } from '@/lib/prisma';
import { broadcastAlert, broadcastSensorUpdate } from '@/lib/socket';
import { Server } from 'socket.io';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns';
import { getLogger } from './logger';

const log = getLogger().child({ tag: '[ANALYTICS-UTILS]' });

export interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  tags?: Record<string, any>;
}

export interface SensorThreshold {
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  value: number;
  severity: 'info' | 'warning' | 'critical';
}

// Record API performance metrics
export async function recordAPIPerformance(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  success: boolean,
  errorMessage?: string,
  requestSize?: number,
  responseSize?: number,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.aPIPerformanceMetrics.create({
      data: {
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
      },
    });
  } catch (error) {
    log.error('analytics_utils.api_performance_record_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Record metric data
export async function recordMetric(data: MetricData): Promise<void> {
  try {
    await prisma.metric.create({
      data: {
        name: data.name,
        type: data.type,
        value: data.value,
        tags: data.tags || {},
      },
    });
  } catch (error) {
    log.error('analytics_utils.metric_record_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Record sensor analytics
export async function recordSensorAnalytics(
  sensorId: string,
  reading: number,
  value?: Record<string, any>,
  status: 'normal' | 'warning' | 'critical' = 'normal',
  threshold?: number,
  anomalyScore?: number,
  temperature?: number,
  humidity?: number
): Promise<void> {
  try {
    await prisma.sensorAnalytics.create({
      data: {
        sensorId,
        reading,
        value: value || {},
        status,
        threshold,
        anomalyScore,
        temperature,
        humidity,
      },
    });
  } catch (error) {
    log.error('analytics_utils.sensor_analytics_record_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Check alert thresholds
export async function checkThresholds(
  io: Server,
  metric: string,
  value: number,
  sensorId?: string,
  roomId?: string
): Promise<void> {
  try {
    const thresholds = await prisma.alertThreshold.findMany({
      where: {
        metric,
        enabled: true,
        ...(sensorId && { sensorId }),
        ...(roomId && { roomId }),
      },
    });

    for (const threshold of thresholds) {
      const isTriggered = checkCondition(threshold.condition, value, threshold.value);

      if (isTriggered) {
        // Create alert
        const alert = await prisma.alert.create({
          data: {
            sensorId,
            type: 'threshold',
            severity: threshold.severity,
            message: `${metric} ${threshold.condition} ${threshold.value} (current: ${value})`,
          },
        });

        // Broadcast alert via WebSocket
        broadcastAlert(io, alert);
      }
    }
  } catch (error) {
    log.error('analytics_utils.threshold_check_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

export function checkCondition(condition: string, actual: number, expected: number): boolean {
  switch (condition) {
    case 'gt':
      return actual > expected;
    case 'lt':
      return actual < expected;
    case 'eq':
      return actual === expected;
    case 'ne':
      return actual !== expected;
    default:
      return false;
  }
}

// Generate daily report
export async function generateDailyReport(date: Date = new Date()): Promise<void> {
  try {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Check if report already exists
    const existing = await prisma.dailyReport.findUnique({
      where: { date: startDate },
    });

    if (existing) {
      log.info('analytics_utils.daily_report_already_exists', { date: format(startDate, 'yyyy-MM-dd') });
      return;
    }

    // Gather metrics
    const [alertsCount, actionsCount, analysisCount, sensorReadings] = await Promise.all([
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
    ]);

    // Create summary
    const summary = {
      date: format(startDate, 'yyyy-MM-dd'),
      totalAlerts: alertsCount,
      totalActions: actionsCount,
      totalAnalyses: analysisCount,
      totalSensorReadings: sensorReadings,
    };

    // Save report
    await prisma.dailyReport.create({
      data: {
        date: startDate,
        summary,
        metrics: summary,
        alertsCount,
        actionsCount,
        analysisCount,
        sensorReadings,
      },
    });

    log.info('analytics_utils.daily_report_generated', { date: format(startDate, 'yyyy-MM-dd') });
  } catch (error) {
    log.error('analytics_utils.daily_report_generate_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Aggregate data for performance
export async function aggregateData(
  period: 'hourly' | 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    // Use groupBy to aggregate metrics at database level
    const metricsGrouped = await prisma.metric.groupBy({
      by: ['name'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { name: true },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    });

    // Calculate aggregations using database results
    for (const group of metricsGrouped) {
      // For standard deviation, we need to fetch the actual values
      // In production, you might want to store variance incrementally
      const values = await prisma.metric.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          name: group.name,
        },
        select: { value: true },
      });

      const avg = group._avg.value || 0;
      const variance = values.length > 0
        ? values.reduce((acc, v) => acc + Math.pow((v.value || 0) - avg, 2), 0) / values.length
        : 0;
      const stddev = Math.sqrt(variance);

      await prisma.dataAggregation.create({
        data: {
          period,
          category: 'metrics',
          metric: group.name,
          value: avg,
          count: group._count.name,
          min: group._min.value,
          max: group._max.value,
          avg,
          stddev,
          timestamp: startDate,
        },
      });
    }

    log.info('analytics_utils.data_aggregated', { period });
  } catch (error) {
    log.error('analytics_utils.data_aggregation_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Auto-cleanup old data based on retention policy
export async function cleanupOldData(retentionDays: number = 90): Promise<void> {
  try {
    const cutoffDate = subDays(new Date(), retentionDays);

    // Delete old raw metrics (keep aggregated data)
    await prisma.metric.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old analytics records
    await prisma.analyticsRecord.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old sensor analytics
    await prisma.sensorAnalytics.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old plant health analytics
    await prisma.plantHealthAnalytics.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old API performance metrics (keep last 30 days)
    const apiCutoffDate = subDays(new Date(), 30);
    await prisma.aPIPerformanceMetrics.deleteMany({
      where: {
        timestamp: {
          lt: apiCutoffDate,
        },
      },
    });

    log.info('analytics_utils.old_data_cleaned_up');
  } catch (error) {
    log.error('analytics_utils.old_data_cleanup_failed', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Schedule tasks (called periodically)
export async function runScheduledTasks(io: Server): Promise<void> {
  // Generate daily report for yesterday
  await generateDailyReport(subDays(new Date(), 1));

  // Aggregate hourly data
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await aggregateData('hourly', oneHourAgo, new Date());

  // Cleanup old data monthly
  const today = new Date();
  if (today.getDate() === 1) {
    await cleanupOldData();
  }
}
