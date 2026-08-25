import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendNotification as dispatchNotification,
  type DeliveryChannel,
  type SeverityLevel,
} from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const plantId = searchParams.get('plantId');
    const type = searchParams.get('type');
    const resolved = searchParams.get('resolved');
    const severity = searchParams.get('severity');

    const where: any = {};
    if (plantId) where.plantId = plantId;
    if (type) where.type = type;
    if (resolved !== null) where.resolved = resolved === 'true';
    if (severity) where.severity = severity;

    const anomalies = await prisma.anomalyDetection.findMany({
      where,
      include: {
        plant: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to most recent 100
    });

    // Get statistics
    const stats = await prisma.anomalyDetection.groupBy({
      by: ['type', 'severity'],
      where: {
        resolved: false
      },
      _count: {
        _all: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Anomalies fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plantId, type, metric, severity, threshold, currentValue, data } = body;

    const anomaly = await prisma.anomalyDetection.create({
      data: {
        plantId,
        type,
        metric,
        severity,
        threshold,
        currentValue,
        data: data || {}
      },
      include: {
        plant: true
      }
    });

    // Trigger notifications if enabled
    await checkAndTriggerNotifications(anomaly);

    return NextResponse.json({
      success: true,
      data: anomaly
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect anomaly',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, resolved } = body;

    const anomaly = await prisma.anomalyDetection.update({
      where: { id },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null
      },
      include: {
        plant: true
      }
    });

    return NextResponse.json({
      success: true,
      data: anomaly
    });
  } catch (error) {
    console.error('Anomaly update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update anomaly',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to check and trigger notifications
async function checkAndTriggerNotifications(anomaly: any) {
  try {
    // Find notification rules that match this anomaly
    const rules = await prisma.notificationRule.findMany({
      where: {
        enabled: true,
        type: 'anomaly'
      }
    });

    for (const rule of rules) {
      const conditions = rule.conditions as any;

      // Check if anomaly matches conditions
      if (matchesConditions(anomaly, conditions)) {
        const channels = parseNotificationChannels(rule.channels);
        if (channels.length === 0) continue;

        await dispatchNotification({
          type: 'system_alert',
          title: `Anomaly Detected: ${anomaly.metric}`,
          message: `Plant ${anomaly.plant?.name || 'Unknown'}: ${anomaly.metric} is ${anomaly.currentValue} (threshold: ${anomaly.threshold})`,
          severity: normalizeSeverity(anomaly.severity),
          channels,
          plantId: anomaly.plantId,
          metadata: {
            anomalyId: anomaly.id,
            anomalyType: anomaly.type,
            metric: anomaly.metric,
            currentValue: anomaly.currentValue,
            threshold: anomaly.threshold,
          },
        });
      }
    }
  } catch (error) {
    console.error('Notification check error:', error);
  }
}

function matchesConditions(anomaly: any, conditions: any): boolean {
  if (!conditions) return true;

  if (conditions.type && conditions.type !== anomaly.type) return false;
  if (conditions.severity && conditions.severity !== anomaly.severity) return false;
  if (conditions.metric && conditions.metric !== anomaly.metric) return false;

  if (conditions.threshold) {
    if (conditions.threshold.operator === 'gt' && !(anomaly.currentValue > conditions.threshold.value)) {
      return false;
    }
    if (conditions.threshold.operator === 'lt' && !(anomaly.currentValue < conditions.threshold.value)) {
      return false;
    }
  }

  return true;
}

function parseNotificationChannels(serializedChannels: string): DeliveryChannel[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedChannels);
  } catch {
    return [];
  }

  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? Object.entries(parsed)
          .filter(([, enabled]) => enabled === true)
          .map(([channel]) => channel)
      : [];

  const supportedChannels: DeliveryChannel[] = [
    'in_app',
    'push',
    'email',
    'sms',
    'webhook',
    'discord',
    'slack',
  ];

  return values.filter((channel): channel is DeliveryChannel =>
    typeof channel === 'string' && supportedChannels.includes(channel as DeliveryChannel)
  );
}

function normalizeSeverity(value: unknown): SeverityLevel {
  if (value === 'info' || value === 'warning' || value === 'critical' || value === 'emergency') {
    return value;
  }
  return 'warning';
}
