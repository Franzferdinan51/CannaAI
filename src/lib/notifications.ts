import { prisma } from './prisma';
import crypto from 'crypto';

// Notification types
export type NotificationType =
  | 'system_alert'
  | 'sensor_threshold'
  | 'plant_health'
  | 'automation_event'
  | 'harvest_ready'
  | 'system_failure'
  | 'analysis_complete'
  | 'user_action_required';

// Severity levels
export type SeverityLevel = 'info' | 'warning' | 'critical' | 'emergency';

// Delivery channels
export type DeliveryChannel =
  | 'in_app'
  | 'push'
  | 'email'
  | 'sms'
  | 'webhook'
  | 'discord'
  | 'slack';

// Notification data interface
export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  severity: SeverityLevel;
  channels: DeliveryChannel[];
  metadata?: Record<string, any>;
  plantId?: string;
  sensorId?: string;
  roomId?: string;
  userId?: string;
}

// Delivery result interface
export interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  messageId?: string;
  error?: string;
  response?: any;
}

// Email service (mock implementation - integrate with real service)
export async function sendEmail(to: string, subject: string, body: string): Promise<DeliveryResult> {
  try {
    // TODO: Integrate with real email service (SendGrid, SES, etc.)
    console.log(`[EMAIL] Sending to ${to}: ${subject}`);

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      channel: 'email',
      messageId: `email_${Date.now()}`,
      response: { status: 'sent' }
    };
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// SMS service (mock implementation - integrate with real service)
export async function sendSMS(phone: string, message: string): Promise<DeliveryResult> {
  try {
    // TODO: Integrate with real SMS service (Twilio, etc.)
    console.log(`[SMS] Sending to ${phone}: ${message}`);

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      channel: 'sms',
      messageId: `sms_${Date.now()}`,
      response: { status: 'sent' }
    };
  } catch (error) {
    return {
      success: false,
      channel: 'sms',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Web push notification (mock implementation)
export async function sendPushNotification(token: string, title: string, body: string): Promise<DeliveryResult> {
  try {
    // TODO: Integrate with real push service (FCM, APNS, etc.)
    console.log(`[PUSH] Sending to ${token}: ${title}`);

    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      channel: 'push',
      messageId: `push_${Date.now()}`,
      response: { status: 'sent' }
    };
  } catch (error) {
    return {
      success: false,
      channel: 'push',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Discord webhook integration
export async function sendDiscordWebhook(webhookUrl: string, notification: NotificationData): Promise<DeliveryResult> {
  try {
    const embed = {
      title: notification.title,
      description: notification.message,
      color: getSeverityColor(notification.severity),
      fields: [
        {
          name: 'Type',
          value: notification.type,
          inline: true
        },
        {
          name: 'Severity',
          value: notification.severity,
          inline: true
        },
        {
          name: 'Time',
          value: new Date().toISOString(),
          inline: true
        }
      ],
      metadata: notification.metadata
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'CultivAI Pro',
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    return {
      success: true,
      channel: 'discord',
      messageId: `discord_${Date.now()}`,
      response: { status: 'sent' }
    };
  } catch (error) {
    return {
      success: false,
      channel: 'discord',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Slack webhook integration
export async function sendSlackWebhook(webhookUrl: string, notification: NotificationData): Promise<DeliveryResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: `*${notification.title}*\n${notification.message}`,
        attachments: [
          {
            color: getSeverityColor(notification.severity),
            fields: [
              {
                title: 'Type',
                value: notification.type,
                short: true
              },
              {
                title: 'Severity',
                value: notification.severity,
                short: true
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    return {
      success: true,
      channel: 'slack',
      messageId: `slack_${Date.now()}`,
      response: { status: 'sent' }
    };
  } catch (error) {
    return {
      success: false,
      channel: 'slack',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to get color for severity
function getSeverityColor(severity: SeverityLevel): number {
  switch (severity) {
    case 'info':
      return 0x3498db; // Blue
    case 'warning':
      return 0xf39c12; // Orange
    case 'critical':
      return 0xe74c3c; // Red
    case 'emergency':
      return 0x991111; // Dark red
    default:
      return 0x95a5a6; // Gray
  }
}

// Send notification across multiple channels
export async function sendNotification(data: NotificationData): Promise<{
  notification: any;
  deliveries: DeliveryResult[];
}> {
  // Create notification record in database
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {}
    }
  });

  // Get user preferences if userId is specified
  let preferences = null;
  if (data.userId) {
    preferences = await prisma.notificationPreference.findFirst({
      where: {
        userId: data.userId,
        type: data.type
      }
    });
  }

  // Check if notification should be throttled based on quiet hours
  if (preferences && preferences.quietHoursStart && preferences.quietHoursEnd) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (currentTime >= quietStart && currentTime <= quietEnd) {
      console.log(`[NOTIFICATION] Skipping notification during quiet hours: ${data.title}`);
      return { notification, deliveries: [] };
    }
  }

  // Check severity threshold
  if (preferences && !isSeverityMet(data.severity, preferences.minSeverity)) {
    console.log(`[NOTIFICATION] Notification severity ${data.severity} below threshold ${preferences.minSeverity}`);
    return { notification, deliveries: [] };
  }

  // Process deliveries
  const deliveries: DeliveryResult[] = [];

  // In-app notification (always send)
  deliveries.push({
    success: true,
    channel: 'in_app',
    messageId: `inapp_${notification.id}`,
    response: { status: 'delivered' }
  });

  // Send to other channels based on preferences
  if (data.channels.includes('email') && (preferences?.emailEnabled ?? true)) {
    // TODO: Get actual email from user preferences
    const result = await sendEmail('user@example.com', data.title, data.message);
    deliveries.push(result);
  }

  if (data.channels.includes('sms') && (preferences?.smsEnabled ?? false)) {
    // TODO: Get actual phone number from user preferences
    const result = await sendSMS('+1234567890', `${data.title}: ${data.message}`);
    deliveries.push(result);
  }

  if (data.channels.includes('push') && (preferences?.pushEnabled ?? true)) {
    // TODO: Get actual push token from user preferences
    const result = await sendPushNotification('push_token', data.title, data.message);
    deliveries.push(result);
  }

  if (data.channels.includes('webhook') && (preferences?.webhookEnabled ?? false)) {
    // Send to registered webhooks
    const webhooks = await prisma.webhookSubscription.findMany({
      where: {
        enabled: true,
        events: {
          contains: data.type
        }
      }
    });

    for (const webhook of webhooks) {
      try {
        await scheduleWebhookDelivery(webhook.id, notification.id, data.type, data);
      } catch (error) {
        console.error(`[WEBHOOK] Failed to schedule delivery: ${error}`);
      }
    }
  }

  if (data.channels.includes('discord') && (preferences?.discordEnabled ?? false)) {
    // TODO: Get Discord webhook URL from preferences
    const discordWebhooks = await prisma.webhookSubscription.findMany({
      where: {
        enabled: true,
        url: {
          contains: 'discord'
        }
      }
    });

    for (const webhook of discordWebhooks) {
      const result = await sendDiscordWebhook(webhook.url, data);
      deliveries.push(result);
    }
  }

  if (data.channels.includes('slack') && (preferences?.slackEnabled ?? false)) {
    // TODO: Get Slack webhook URL from preferences
    const slackWebhooks = await prisma.webhookSubscription.findMany({
      where: {
        enabled: true,
        url: {
          contains: 'slack'
        }
      }
    });

    for (const webhook of slackWebhooks) {
      const result = await sendSlackWebhook(webhook.url, data);
      deliveries.push(result);
    }
  }

  // Save delivery records
  for (const delivery of deliveries) {
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: delivery.channel,
        status: delivery.success ? 'delivered' : 'failed',
        provider: delivery.channel,
        messageId: delivery.messageId,
        errorMessage: delivery.error,
        sentAt: new Date(),
        deliveredAt: delivery.success ? new Date() : null
      }
    });
  }

  return { notification, deliveries };
}

// Check if notification severity meets threshold
function isSeverityMet(notificationSeverity: SeverityLevel, thresholdSeverity: string): boolean {
  const severityLevels: Record<SeverityLevel, number> = {
    info: 1,
    warning: 2,
    critical: 3,
    emergency: 4
  };

  const thresholdLevels: Record<string, number> = {
    info: 1,
    warning: 2,
    critical: 3,
    emergency: 4
  };

  return severityLevels[notificationSeverity] >= thresholdLevels[thresholdSeverity];
}

// Schedule webhook delivery (will be implemented in webhook module)
async function scheduleWebhookDelivery(
  webhookId: string,
  notificationId: string,
  eventType: string,
  data: NotificationData
): Promise<void> {
  // This will be implemented in the webhook service
  console.log(`[WEBHOOK] Scheduling delivery for webhook ${webhookId}`);
}

// Send notification to all users based on type
export async function broadcastNotification(data: NotificationData): Promise<any[]> {
  // Send notification to all users who have this type enabled
  const users = await prisma.notificationPreference.findMany({
    where: {
      type: data.type,
      inAppEnabled: true
    }
  });

  const results = [];

  for (const user of users) {
    const result = await sendNotification({
      ...data,
      userId: user.userId || undefined
    });
    results.push(result);
  }

  return results;
}

// Get notification history
export async function getNotificationHistory(filters?: {
  type?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const where: any = {};

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const notifications = await prisma.notification.findMany({
    where,
    include: {
      deliveries: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: filters?.limit || 100
  });

  return notifications;
}

// Acknowledge notification
export async function acknowledgeNotification(notificationId: string): Promise<any> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      acknowledged: true,
      acknowledgedAt: new Date()
    }
  });

  return notification;
}
