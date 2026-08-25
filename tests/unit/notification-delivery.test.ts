/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { sendEmail, sendPushNotification, sendSMS } from '@/lib/notifications';

describe('notification delivery configuration', () => {
  beforeEach(() => {
    delete process.env.AGENTMAIL_API_KEY;
    delete process.env.AGENTMAIL_INBOX;
  });

  test('does not claim SMS delivery when no provider is configured', async () => {
    await expect(sendSMS('+15555550123', 'test')).resolves.toMatchObject({
      success: false,
      channel: 'sms',
    });
  });

  test('does not claim push delivery when no provider is configured', async () => {
    await expect(sendPushNotification('token', 'title', 'body')).resolves.toMatchObject({
      success: false,
      channel: 'push',
    });
  });

  test('reports missing AgentMail configuration instead of contacting a fallback inbox', async () => {
    await expect(sendEmail('recipient@example.com', 'title', 'body')).resolves.toMatchObject({
      success: false,
      channel: 'email',
      error: expect.stringContaining('AgentMail is not configured'),
    });
  });
});
