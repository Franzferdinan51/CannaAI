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

// AgentMail inbox configuration
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY?.trim() || '';
const AGENTMAIL_INBOX = process.env.AGENTMAIL_INBOX?.trim() || '';
const AGENTMAIL_SEND_ENDPOINT = AGENTMAIL_INBOX
  ? `https://api.agentmail.to/inboxes/${encodeURIComponent(AGENTMAIL_INBOX)}/messages/send`
  : '';

// AgentMail API response
interface AgentMailSendResponse {
  success?: boolean;
  id?: string;
  error?: string;
  message?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build a clean HTML email card for notifications
function buildNotificationHtml(data: NotificationData): string {
  const severityColors: Record<SeverityLevel, string> = {
    info: '#3498db',
    warning: '#f39c12',
    critical: '#e74c3c',
    emergency: '#991111'
  };
  const color = severityColors[data.severity] || '#95a5a6';

  const metaRows = data.metadata
    ? Object.entries(data.metadata)
        .map(([k, v]) => `<tr><td style="padding:4px 12px;color:#666;font-size:13px"><strong>${escapeHtml(k)}</strong></td><td style="padding:4px 12px;font-size:13px">${escapeHtml(v)}</td></tr>`)
        .join('')
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f4">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <!-- Header -->
          <tr>
            <td style="background:${color};padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#fff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">CultivAI Pro</span>
                  </td>
                  <td align="right">
                    <span style="color:rgba(255,255,255,0.8);font-size:12px">${data.severity.toUpperCase()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px">
              <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;font-weight:600">${escapeHtml(data.title)}</h2>
              <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.5">${escapeHtml(data.message)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:8px">
                ${metaRows}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #eee">
              <p style="margin:0;color:#aaa;font-size:12px">Sent by CultivAI Pro • ${new Date().toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Send email via AgentMail API
async function sendViaAgentMail(to: string, subject: string, data: NotificationData): Promise<DeliveryResult> {
  if (!AGENTMAIL_API_KEY || !AGENTMAIL_SEND_ENDPOINT) {
    return {
      success: false,
      channel: 'email',
      error: 'AgentMail is not configured; set AGENTMAIL_API_KEY and AGENTMAIL_INBOX',
    };
  }

  const html = buildNotificationHtml(data);
  const text = `${data.title}\n${data.message}${data.metadata ? '\n\n' + JSON.stringify(data.metadata, null, 2) : ''}`;

  let response: Response;
  try {
    response = await fetch(AGENTMAIL_SEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text
      })
    });
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error instanceof Error ? error.message : 'Network error reaching AgentMail API'
    };
  }

  let body: AgentMailSendResponse;
  try {
    body = await response.json();
  } catch {
    return {
      success: false,
      channel: 'email',
      error: `Invalid response from AgentMail API (${response.status})`
    };
  }

  if (!response.ok || !body.success) {
    return {
      success: false,
      channel: 'email',
      error: body.error || `AgentMail API error ${response.status}`
    };
  }

  return {
    success: true,
    channel: 'email',
    messageId: body.id,
    response: body
  };
}

// Email service — now fully wired to AgentMail
export async function sendEmail(to: string, subject: string, body: string, data?: NotificationData): Promise<DeliveryResult> {
  try {
    // AgentMail requires a to address; if none provided, skip
    if (!to || to === 'user@example.com') {
      return { success: false, channel: 'email', error: 'No recipient address' };
    }

    if (!AGENTMAIL_API_KEY || !AGENTMAIL_SEND_ENDPOINT) {
      return {
        success: false,
        channel: 'email',
        error: 'AgentMail is not configured; set AGENTMAIL_API_KEY and AGENTMAIL_INBOX',
      };
    }

    // Forward full NotificationData so we can build a rich HTML card
    if (data) {
      return sendViaAgentMail(to, subject, data);
    }

    // Fallback plain-text email
    const plainHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;padding:20px">
  <h2>${subject}</h2>
  <p>${body}</p>
</body></html>`;

    const response = await fetch(AGENTMAIL_SEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`
      },
      body: JSON.stringify({ to, subject, html: plainHtml, text: body })
    });

    const result: AgentMailSendResponse = await response.json();
    if (!response.ok || !result.success) {
      return { success: false, channel: 'email', error: result.error || `AgentMail error ${response.status}` };
    }

    return { success: true, channel: 'email', messageId: result.id, response: result };
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
  void phone;
  void message;
  return {
    success: false,
    channel: 'sms',
    error: 'SMS delivery is not configured; no provider was contacted',
  };
}

// Web push notification (mock implementation)
export async function sendPushNotification(token: string, title: string, body: string): Promise<DeliveryResult> {
  void token;
  void title;
  void body;
  return {
    success: false,
    channel: 'push',
    error: 'Push delivery is not configured; no provider was contacted',
  };
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
    // TODO: Get actual email from user preferences (no User model yet — pass through data or use default)
    const result = await sendEmail('user@example.com', data.title, data.message, data);
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
    if (filters?.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters?.endDate) {
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
