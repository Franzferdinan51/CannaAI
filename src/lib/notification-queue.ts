import { prisma } from './prisma';
import { sendNotification, NotificationData } from './notifications';
import { getLogger } from './logger';

const log = getLogger().child({ tag: '[QUEUE]' });

// Queue item interface
interface QueueItem {
  id: string;
  type: 'immediate' | 'scheduled' | 'bulk';
  data: NotificationData;
  scheduledAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

// Queue processor status
let isProcessing = false;
let queueWorkerInterval: NodeJS.Timeout | null = null;

// Add notification to queue
export async function queueNotification(
  data: NotificationData,
  options: {
    scheduledAt?: Date;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    maxAttempts?: number;
  } = {}
): Promise<{ queueId: string }> {
  // In a production system, this would use Redis or another queue
  // For now, we'll use the database as a simple queue

  const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (!options.scheduledAt || options.scheduledAt <= new Date()) {
    // Send immediately
    await sendNotification(data);
    return { queueId };
  }

  const queuedItem = await prisma.notificationQueueItem.create({
    data: {
      payload: JSON.parse(JSON.stringify(data)),
      scheduledAt: options.scheduledAt,
      priority: options.priority || 'normal',
      maxAttempts: options.maxAttempts || 3,
      status: 'pending',
    },
    select: { id: true },
  });

  log.info('notification_queue.notification_scheduled', { queueId: queuedItem.id, scheduledAt: options.scheduledAt.toISOString() });
  return { queueId: queuedItem.id };
}

// Bulk send notifications
export async function queueBulkNotifications(
  notifications: NotificationData[],
  options: {
    batchSize?: number;
    delayBetweenBatches?: number;
  } = {}
): Promise<{ queuedCount: number }> {
  const batchSize = options.batchSize || 10;
  const delayBetweenBatches = options.delayBetweenBatches || 1000;

  let queuedCount = 0;

  // Process in batches
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);

    // Process batch in parallel
    await Promise.all(
      batch.map(async (notification) => {
        try {
          await sendNotification(notification);
          queuedCount++;
        } catch (error) {
          log.error('notification_queue.queue_notification_failed', { error: error instanceof Error ? error.message : String(error) });
        }
      })
    );

    // Delay between batches to avoid overwhelming the system
    if (i + batchSize < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return { queuedCount };
}

// Start queue processor
export function startQueueProcessor(intervalMs: number = 5000): void {
  if (isProcessing) {
    log.info('notification_queue.processor_already_running');
    return;
  }

  isProcessing = true;
  log.info('notification_queue.processor_started');

  queueWorkerInterval = setInterval(async () => {
    try {
      await processQueue();
    } catch (error) {
      log.error('notification_queue.processing_failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }, intervalMs);
  // The queue is background work and must not keep short-lived test, CLI, or
  // serverless processes alive after their foreground work completes.
  queueWorkerInterval.unref?.();
}

// Stop queue processor
export function stopQueueProcessor(): void {
  if (queueWorkerInterval) {
    clearInterval(queueWorkerInterval);
    queueWorkerInterval = null;
  }
  isProcessing = false;
  log.info('notification_queue.processor_stopped');
}

// Result of one queue drain pass. Callers that report health (the
// scheduler) need to know when a pass was SKIPPED — e.g. the queue table
// does not exist yet — instead of treating silence as a successful drain.
export interface ProcessQueueResult {
  processed: number;
  skipped: boolean;
  skipReason?: string;
}

// Process the notification queue
export async function processQueue(now: Date = new Date()): Promise<ProcessQueueResult> {
  try {
    const scheduledNotifications = await prisma.notificationQueueItem.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20
    });

    for (const item of scheduledNotifications) {
      const attempt = item.attempts + 1;
      await prisma.notificationQueueItem.update({
        where: { id: item.id },
        data: { status: 'processing', attempts: attempt },
      });

      try {
        await sendNotification(item.payload as unknown as NotificationData);
        await prisma.notificationQueueItem.update({
          where: { id: item.id },
          data: { status: 'completed', lastError: null },
        });
      } catch (error) {
        const lastError = error instanceof Error ? error.message : 'Unknown notification delivery error';
        await prisma.notificationQueueItem.update({
          where: { id: item.id },
          data: {
            status: attempt >= item.maxAttempts ? 'failed' : 'pending',
            lastError,
          },
        });
        log.error('notification_queue.notification_failed', { queueItemId: item.id, attempt, error: lastError });
      }
    }

    if (scheduledNotifications.length > 0) {
      log.info('notification_queue.notifications_processed', { processed: scheduledNotifications.length });
    }
    return { processed: scheduledNotifications.length, skipped: false };
  } catch (error: any) {
    if (error.code === 'P2021') {
      // Table doesn't exist yet — the queue was NOT drained. Warn (not
      // silent) and report the skip so the scheduler/health surface it
      // instead of claiming queueDrained.
      const skipReason = 'Notification queue table missing (Prisma P2021)';
      log.warn('notification_queue.processing_skipped', { reason: skipReason });
      return { processed: 0, skipped: true, skipReason };
    }
    const message = error instanceof Error ? error.message : String(error?.message ?? error);
    log.error('notification_queue.process_queue_failed', { error: message });
    return { processed: 0, skipped: true, skipReason: message };
  }
}

// Get queue statistics
export async function getQueueStatistics(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.notificationQueueItem.count({ where: { status: 'pending' } }),
    prisma.notificationQueueItem.count({ where: { status: 'processing' } }),
    prisma.notificationQueueItem.count({ where: { status: 'completed' } }),
    prisma.notificationQueueItem.count({ where: { status: 'failed' } }),
  ]);

  return { pending, processing, completed, failed };
}

// Retry failed notifications
export async function retryFailedNotifications(notificationId?: string): Promise<{
  retried: number;
}> {
  const failedDeliveries = await prisma.notificationDelivery.findMany({
    where: {
      status: 'failed',
      attempts: {
        lt: 3 // Max attempts
      },
      ...(notificationId ? { notificationId } : {})
    },
    include: {
      notification: true
    }
  });

  let retried = 0;

  for (const delivery of failedDeliveries) {
    if (delivery.notification) {
      try {
        await sendNotification({
          type: delivery.notification.type as any,
          title: delivery.notification.title || '',
          message: delivery.notification.message,
          severity: 'info',
          channels: [delivery.channel as any],
          metadata: delivery.notification.metadata as any
        });

        retried++;
      } catch (error) {
        log.error('notification_queue.retry_delivery_failed', { deliveryId: delivery.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return { retried };
}

// Notification grouping - group similar notifications within a time window
export async function groupAndSendNotifications(
  notifications: NotificationData[],
  timeWindowMs: number = 60000 // 1 minute
): Promise<{ groupedCount: number; sentCount: number }> {
  // Group notifications by type and severity
  const grouped = new Map<string, NotificationData[]>();

  for (const notification of notifications) {
    const key = `${notification.type}:${notification.severity}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(notification);
  }

  let sentCount = 0;
  let groupedCount = 0;

  // Process each group
  for (const [key, group] of grouped.entries()) {
    if (group.length > 1) {
      // Multiple notifications - group them
      const combinedMessage = `${group.length} ${key.split(':')[0]} notifications`;

      const summary = group
        .map((n) => `• ${n.title}`)
        .join('\n');

      const groupedNotification: NotificationData = {
        type: group[0].type,
        title: `[Grouped] ${group[0].title}`,
        message: `${summary}\n\nSent at ${new Date().toISOString()}`,
        severity: group[0].severity,
        channels: group[0].channels,
        metadata: {
          ...group[0].metadata,
          grouped: true,
          originalCount: group.length,
          timeWindow: timeWindowMs
        }
      };

      await sendNotification(groupedNotification);
      sentCount++;
      groupedCount += group.length;
    } else {
      // Single notification - send as is
      await sendNotification(group[0]);
      sentCount++;
    }
  }

  return { groupedCount, sentCount };
}

// Deduplicate notifications based on content and recent sends
export async function deduplicateNotification(
  data: NotificationData,
  deduplicationWindowMs: number = 300000 // 5 minutes
): Promise<{ shouldSend: boolean; duplicateCount: number }> {
  const cutoffDate = new Date(Date.now() - deduplicationWindowMs);

  const recentNotifications = await prisma.notification.findMany({
    where: {
      type: data.type,
      title: data.title,
      message: data.message,
      createdAt: {
        gte: cutoffDate
      }
    },
    take: 1
  });

  if (recentNotifications.length > 0) {
    return { shouldSend: false, duplicateCount: 1 };
  }

  return { shouldSend: true, duplicateCount: 0 };
}

// Health check for queue system
export async function queueHealthCheck(): Promise<{
  healthy: boolean;
  status: string;
  statistics: any;
  issues: string[];
}> {
  const issues: string[] = [];
  const statistics = await getQueueStatistics();

  // Check if queue processor is running
  if (!isProcessing) {
    issues.push('Queue processor is not running');
  }

  // Check failure rate
  const total = statistics.pending + statistics.completed + statistics.failed;
  if (total > 0) {
    const failureRate = (statistics.failed / total) * 100;
    if (failureRate > 20) {
      issues.push(`High failure rate: ${failureRate.toFixed(2)}%`);
    }
  }

  // Check for old pending notifications
  const oldNotifications = await prisma.notification.count({
    where: {
      acknowledged: false,
      createdAt: {
        lte: new Date(Date.now() - 3600000) // 1 hour
      }
    }
  });

  if (oldNotifications > 0) {
    issues.push(`${oldNotifications} notifications pending for more than 1 hour`);
  }

  const healthy = issues.length === 0;

  return {
    healthy,
    status: healthy ? 'healthy' : 'unhealthy',
    statistics,
    issues
  };
}
