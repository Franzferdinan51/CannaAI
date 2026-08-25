/** @jest-environment node */

const mockSendNotification = jest.fn();
const mockPrisma = {
  notificationQueueItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/notifications', () => ({
  sendNotification: mockSendNotification,
}));

import { queueNotification } from '@/lib/notification-queue';

describe('notification queue scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.notificationQueueItem.create.mockResolvedValue({ id: 'queue-1' });
  });

  test('persists future notifications instead of dropping them', async () => {
    const scheduledAt = new Date(Date.now() + 60_000);
    const data = {
      type: 'system_alert' as const,
      title: 'Scheduled alert',
      message: 'Check the room',
      severity: 'warning' as const,
      channels: ['in_app' as const],
    };

    await expect(queueNotification(data, { scheduledAt, priority: 'high', maxAttempts: 5 }))
      .resolves.toEqual({ queueId: 'queue-1' });

    expect(mockPrisma.notificationQueueItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payload: data,
        scheduledAt,
        priority: 'high',
        maxAttempts: 5,
        status: 'pending',
      }),
      select: { id: true },
    });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  test('delivers due notifications and marks them completed', async () => {
    const data = {
      type: 'system_alert' as const,
      title: 'Due alert',
      message: 'Check the room now',
      severity: 'critical' as const,
      channels: ['in_app' as const],
    };
    mockPrisma.notificationQueueItem.findMany.mockResolvedValue([
      {
        id: 'queue-2',
        payload: data,
        scheduledAt: new Date(Date.now() - 1_000),
        attempts: 0,
        maxAttempts: 3,
      },
    ]);

    const { processQueue } = await import('@/lib/notification-queue');
    await processQueue(new Date());

    expect(mockSendNotification).toHaveBeenCalledWith(data);
    expect(mockPrisma.notificationQueueItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'queue-2' },
      data: { status: 'processing', attempts: 1 },
    });
    expect(mockPrisma.notificationQueueItem.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'queue-2' },
      data: { status: 'completed', lastError: null },
    });
  });
});
