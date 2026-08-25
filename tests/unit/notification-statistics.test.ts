/** @jest-environment node */

const mockPrisma = {
  notification: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  webhookSubscription: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  webhookDelivery: {
    count: jest.fn(),
  },
  notificationDelivery: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { notificationSystem } from '@/lib/notification-init';

describe('notification statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.notification.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    mockPrisma.notification.groupBy.mockResolvedValue([{ type: 'system_alert', _count: 4 }]);
    mockPrisma.webhookSubscription.count.mockResolvedValue(2);
    mockPrisma.webhookSubscription.findMany.mockResolvedValue([
      { enabled: true, isVerified: true },
      { enabled: false, isVerified: false },
    ]);
    mockPrisma.webhookDelivery.count.mockResolvedValue(3);
    mockPrisma.notificationDelivery.count.mockResolvedValue(5);
    mockPrisma.notificationDelivery.groupBy.mockResolvedValue([
      { status: 'delivered', _count: 4 },
      { status: 'failed', _count: 1 },
    ]);
  });

  it('reports webhook deliveries created during the last 24 hours', async () => {
    const stats = await notificationSystem.getStatistics();

    expect(stats.webhooks.recentDeliveries).toBe(3);
    expect(mockPrisma.webhookDelivery.count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date),
        },
      },
    });
  });
});
