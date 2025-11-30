import { prisma } from './prisma';
import crypto from 'crypto';

// Webhook event types
export type WebhookEventType =
  | 'system_alert'
  | 'sensor_threshold'
  | 'plant_health'
  | 'automation_event'
  | 'harvest_ready'
  | 'system_failure'
  | 'analysis_complete'
  | 'user_action_required';

// Webhook data interface
export interface WebhookData {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: {
    id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    metadata: Record<string, any>;
  };
}

// Webhook subscription interface
export interface CreateWebhookSubscription {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  retryCount?: number;
  timeout?: number;
}

// Generate webhook signature for authentication
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Verify webhook signature
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Create webhook subscription
export async function createWebhookSubscription(
  data: CreateWebhookSubscription
): Promise<any> {
  // Validate URL
  let url: URL;
  try {
    url = new URL(data.url);
  } catch (error) {
    throw new Error('Invalid webhook URL');
  }

  // Generate secret if not provided
  const secret = data.secret || crypto.randomBytes(32).toString('hex');

  // Create webhook subscription
  const webhook = await prisma.webhookSubscription.create({
    data: {
      name: data.name,
      url: data.url,
      secret,
      events: JSON.stringify(data.events),
      retryCount: data.retryCount || 3,
      timeout: data.timeout || 5000,
      isVerified: false
    }
  });

  // Send verification ping to webhook
  try {
    await sendWebhookTest(webhook.id);
  } catch (error) {
    console.error(`[WEBHOOK] Failed to verify webhook ${webhook.id}:`, error);
  }

  return webhook;
}

// Get webhook subscription
export async function getWebhookSubscription(id: string): Promise<any> {
  const webhook = await prisma.webhookSubscription.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!webhook) {
    throw new Error('Webhook subscription not found');
  }

  return webhook;
}

// List webhook subscriptions
export async function listWebhookSubscriptions(): Promise<any[]> {
  const webhooks = await prisma.webhookSubscription.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return webhooks;
}

// Update webhook subscription
export async function updateWebhookSubscription(
  id: string,
  data: Partial<CreateWebhookSubscription>
): Promise<any> {
  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.url) {
    try {
      new URL(data.url);
      updateData.url = data.url;
    } catch (error) {
      throw new Error('Invalid webhook URL');
    }
  }
  if (data.secret) updateData.secret = data.secret;
  if (data.events) updateData.events = JSON.stringify(data.events);
  if (data.retryCount !== undefined) updateData.retryCount = data.retryCount;
  if (data.timeout !== undefined) updateData.timeout = data.timeout;

  const webhook = await prisma.webhookSubscription.update({
    where: { id },
    data: updateData
  });

  return webhook;
}

// Delete webhook subscription
export async function deleteWebhookSubscription(id: string): Promise<void> {
  await prisma.webhookSubscription.delete({
    where: { id }
  });
}

// Test webhook delivery
export async function sendWebhookTest(webhookId: string): Promise<{
  success: boolean;
  status: number;
  response: any;
}> {
  const webhook = await prisma.webhookSubscription.findUnique({
    where: { id: webhookId }
  });

  if (!webhook) {
    throw new Error('Webhook subscription not found');
  }

  const testData: WebhookData = {
    id: `test_${Date.now()}`,
    event: 'system_alert',
    timestamp: new Date().toISOString(),
    data: {
      id: `test_${Date.now()}`,
      type: 'test',
      title: 'Webhook Test',
      message: 'This is a test webhook delivery from CultivAI Pro',
      severity: 'info',
      metadata: {
        test: true,
        message: 'Webhook is properly configured'
      }
    }
  };

  const payload = JSON.stringify(testData);

  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      eventType: 'test',
      status: 'pending',
      attempts: 0
    }
  });

  try {
    const startTime = Date.now();
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        'X-Webhook-ID': webhook.id,
        'User-Agent': 'CultivAI-Pro-Webhook/1.0'
      },
      body: payload
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'success' : 'failed',
        responseCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Truncate for storage
        attempts: 1,
        sentAt: new Date(),
        deliveredAt: response.ok ? new Date() : null,
        errorMessage: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      }
    });

    // Mark webhook as verified
    if (response.ok && !webhook.isVerified) {
      await prisma.webhookSubscription.update({
        where: { id: webhook.id },
        data: {
          isVerified: true,
          lastUsed: new Date()
        }
      });
    }

    return {
      success: response.ok,
      status: response.status,
      response: {
        status: response.status,
        statusText: response.statusText,
        body: responseBody.substring(0, 200),
        responseTime
      }
    };
  } catch (error) {
    // Update delivery record with error
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        attempts: 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        sentAt: new Date()
      }
    });

    return {
      success: false,
      status: 0,
      response: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Schedule webhook delivery
export async function scheduleWebhookDelivery(
  webhookId: string,
  notificationId: string,
  eventType: WebhookEventType,
  notificationData: any
): Promise<any> {
  const webhook = await prisma.webhookSubscription.findUnique({
    where: { id: webhookId }
  });

  if (!webhook || !webhook.enabled) {
    throw new Error('Webhook not found or disabled');
  }

  const webhookData: WebhookData = {
    id: notificationId,
    event: eventType,
    timestamp: new Date().toISOString(),
    data: {
      id: notificationData.id || notificationId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      severity: notificationData.severity || 'info',
      metadata: notificationData.metadata || {}
    }
  };

  const payload = JSON.stringify(webhookData);

  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      notificationId,
      eventType,
      status: 'pending',
      attempts: 0
    }
  });

  // Send webhook immediately
  await deliverWebhook(webhook, delivery.id, payload);

  return delivery;
}

// Deliver webhook
async function deliverWebhook(
  webhook: any,
  deliveryId: string,
  payload: string
): Promise<void> {
  try {
    const startTime = Date.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'system_alert',
      'X-Webhook-ID': webhook.id,
      'User-Agent': 'CultivAI-Pro-Webhook/1.0'
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = generateSignature(payload, webhook.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(webhook.timeout)
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? 'success' : 'failed',
        responseCode: response.status,
        responseBody: responseBody.substring(0, 1000),
        attempts: 1,
        sentAt: new Date(),
        deliveredAt: response.ok ? new Date() : null,
        errorMessage: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      }
    });

    // Update webhook last used
    await prisma.webhookSubscription.update({
      where: { id: webhook.id },
      data: { lastUsed: new Date() }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a timeout or network error
    const shouldRetry = errorMessage.includes('timeout') || errorMessage.includes('network');

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: shouldRetry ? 'retry' : 'failed',
        attempts: 1,
        errorMessage,
        sentAt: new Date(),
        nextRetryAt: shouldRetry ? new Date(Date.now() + 5000) : null // Retry after 5 seconds
      }
    });
  }
}

// Process pending webhook deliveries
export async function processPendingWebhookDeliveries(): Promise<void> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: {
        in: ['pending', 'retry']
      },
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } }
      ]
    },
    take: 50
  });

  for (const delivery of pendingDeliveries) {
    const webhook = await prisma.webhookSubscription.findUnique({
      where: { id: delivery.webhookId }
    });

    if (!webhook || !webhook.enabled) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          errorMessage: 'Webhook not found or disabled'
        }
      });
      continue;
    }

    // Rebuild payload
    let payload = '';
    if (delivery.notificationId) {
      const notification = await prisma.notification.findUnique({
        where: { id: delivery.notificationId }
      });

      if (notification) {
        const webhookData: WebhookData = {
          id: delivery.notificationId,
          event: delivery.eventType as WebhookEventType,
          timestamp: notification.createdAt.toISOString(),
          data: {
            id: notification.id,
            type: notification.type,
            title: notification.title || '',
            message: notification.message,
            severity: 'info',
            metadata: notification.metadata as Record<string, any> || {}
          }
        };
        payload = JSON.stringify(webhookData);
      }
    }

    if (payload) {
      await deliverWebhook(webhook, delivery.id, payload);
    }
  }
}

// Get webhook delivery history
export async function getWebhookDeliveryHistory(webhookId: string, limit: number = 100) {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return deliveries;
}

// Get webhook statistics
export async function getWebhookStatistics(webhookId: string) {
  const [total, successful, failed, pending] = await Promise.all([
    prisma.webhookDelivery.count({ where: { webhookId } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: 'success' } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: 'failed' } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: { in: ['pending', 'retry'] } } })
  ]);

  return {
    total,
    successful,
    failed,
    pending,
    successRate: total > 0 ? (successful / total) * 100 : 0
  };
}

// Background worker to process webhook retries
let webhookWorkerRunning = false;

export function startWebhookWorker(): void {
  if (webhookWorkerRunning) {
    console.log('[WEBHOOK-WORKER] Already running');
    return;
  }

  webhookWorkerRunning = true;
  console.log('[WEBHOOK-WORKER] Starting background worker');

  // Process pending deliveries every 30 seconds
  setInterval(async () => {
    try {
      await processPendingWebhookDeliveries();
    } catch (error) {
      console.error('[WEBHOOK-WORKER] Error processing deliveries:', error);
    }
  }, 30000);
}

export function stopWebhookWorker(): void {
  webhookWorkerRunning = false;
  console.log('[WEBHOOK-WORKER] Stopped');
}
