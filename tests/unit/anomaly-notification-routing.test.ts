/** @jest-environment node */

const mockSendNotification = jest.fn();
const mockPrisma = {
  anomalyDetection: {
    create: jest.fn(),
  },
  notificationRule: {
    findMany: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/notifications', () => ({
  sendNotification: mockSendNotification,
}));

import { POST } from '@/app/api/automation/anomalies/route';

describe('anomaly notification routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.anomalyDetection.create.mockResolvedValue({
      id: 'anomaly-1',
      plantId: 'plant-1',
      type: 'temperature',
      metric: 'temperature',
      severity: 'warning',
      threshold: 30,
      currentValue: 35,
      data: {},
      plant: { name: 'Test Plant' },
    });
    mockPrisma.notificationRule.findMany.mockResolvedValue([
      {
        conditions: {},
        channels: JSON.stringify(['in_app', 'email']),
      },
    ]);
    mockSendNotification.mockResolvedValue({ notification: {}, deliveries: [] });
  });

  test('dispatches configured channel names through the central notification service', async () => {
    const response = await POST(new Request('http://localhost/api/automation/anomalies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        plantId: 'plant-1',
        type: 'temperature',
        metric: 'temperature',
        severity: 'warning',
        threshold: 30,
        currentValue: 35,
      }),
    }) as any);

    expect(response.status).toBe(200);
    expect(mockSendNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'system_alert',
      severity: 'warning',
      channels: ['in_app', 'email'],
    }));
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });
});
