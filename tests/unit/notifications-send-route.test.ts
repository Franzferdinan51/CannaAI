/** @jest-environment node */

jest.mock('@/lib/notifications', () => ({
  sendNotification: jest.fn(),
  broadcastNotification: jest.fn(),
}));

import { POST } from '@/app/api/notifications/send/route';
import { sendNotification } from '@/lib/notifications';

describe('/api/notifications/send delivery status', () => {
  beforeEach(() => {
    (sendNotification as jest.Mock).mockResolvedValue({
      notification: { id: 'notification-1' },
      deliveries: [
        { success: true, channel: 'in_app', messageId: 'inapp-1' },
        { success: false, channel: 'sms', error: 'SMS delivery is not configured' },
      ],
    });
  });

  test('does not report success when a requested channel fails', async () => {
    const result = await POST({
      headers: new Headers({ 'user-agent': 'test' }),
      json: async () => ({
        type: 'system_alert',
        title: 'Alert',
        message: 'Test alert',
        severity: 'warning',
        channels: ['in_app', 'sms'],
      }),
    } as any);

    expect(result.status).toBe(207);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      partial: true,
      meta: expect.objectContaining({
        failedChannels: [{ channel: 'sms', error: 'SMS delivery is not configured' }],
      }),
    }));
  });
});
