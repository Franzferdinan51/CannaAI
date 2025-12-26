import { prisma } from './prisma';
import { sendNotification, broadcastNotification, NotificationData } from './notifications';

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

  // If scheduled, we can store it in a scheduled_notifications table
  // For now, we'll just send it immediately if scheduledAt is in the past or not set
  if (!options.scheduledAt || options.scheduledAt <= new Date()) {
    // Send immediately
    await sendNotification(data);
    return { queueId };
  } else {
    // TODO: Store scheduled notification in database
    console.log(`[QUEUE] Scheduling notification for ${options.scheduledAt.toISOString()}`);
    return { queueId };
  }
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
          console.error(`[QUEUE] Failed to queue notification:`, error);
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
    console.log('[QUEUE] Processor already running');
    return;
  }

  isProcessing = true;
  console.log('[QUEUE] Starting queue processor');

  queueWorkerInterval = setInterval(async () => {
    try {
      await processQueue();
    } catch (error) {
      console.error('[QUEUE] Error processing queue:', error);
    }
  }, intervalMs);
}

// Stop queue processor
export function stopQueueProcessor(): void {
  if (queueWorkerInterval) {
    clearInterval(queueWorkerInterval);
    queueWorkerInterval = null;
  }
  isProcessing = false;
  console.log('[QUEUE] Stopped queue processor');
}

// Process the notification queue
async function processQueue(): Promise<void> {
  try {
    // Check for scheduled notifications that need to be sent
    const scheduledNotifications = await prisma.notification.findMany({
      where: {
        // Add a field to track if notification is scheduled
        // For now, we'll just process pending notifications
      },
      take: 20
    });

    if (scheduledNotifications.length > 0) {
      console.log(`[QUEUE] Processing ${scheduledNotifications.length} notifications`);
    }
  } catch (error: any) {
    if (error.code === 'P2021') {
      // Table doesn't exist yet - silently skip
      return;
    }
    console.error('[QUEUE] Error processing queue:', error.message);
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
    prisma.notification.count({
      where: {
        acknowledged: false
      }
    }),
    0, // Currently processing count
    prisma.notification.count({
      where: {
        acknowledged: true
      }
    }),
    prisma.notificationDelivery.count({
      where: {
        status: 'failed'
      }
    })
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
        console.error(`[QUEUE] Failed to retry delivery ${delivery.id}:`, error);
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
