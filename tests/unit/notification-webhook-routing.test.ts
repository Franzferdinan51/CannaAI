/** @jest-environment node */

const mockPrisma = {
  notification: { create: jest.fn() },
  notificationPreference: { findFirst: jest.fn() },
  webhookSubscription: { findMany: jest.fn() },
  notificationDelivery: { create: jest.fn() },
};
const mockScheduleWebhookDelivery = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/webhooks', () => ({
  scheduleWebhookDelivery: mockScheduleWebhookDelivery,
}));

import { sendNotification } from '@/lib/notifications';

describe('notification webhook routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    mockPrisma.notificationPreference.findFirst.mockResolvedValue({
      type: 'system_alert',
      webhookEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      pushEnabled: false,
      discordEnabled: false,
      slackEnabled: false,
      minSeverity: 'info',
    });
    mockPrisma.webhookSubscription.findMany.mockResolvedValue([
      { id: 'webhook-1', url: 'https://hooks.example.test/notify' },
    ]);
    mockScheduleWebhookDelivery.mockResolvedValue(undefined);
  });

  test('schedules webhook deliveries through the webhook service', async () => {
    await sendNotification({
      type: 'system_alert',
      title: 'Alert',
      message: 'Something happened',
      severity: 'warning',
      channels: ['webhook'],
      userId: 'user-1',
    });

    expect(mockScheduleWebhookDelivery).toHaveBeenCalledWith(
      'webhook-1',
      'notification-1',
      'system_alert',
      expect.objectContaining({ title: 'Alert' }),
    );
  });
});
