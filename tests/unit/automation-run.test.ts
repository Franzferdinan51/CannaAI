/** @jest-environment node */

const mockPrisma = {
  automationRule: { findUnique: jest.fn() },
  task: { create: jest.fn() },
  analysisHistory: { create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/ai', () => ({ analyzePlantHealth: jest.fn() }));
jest.mock('@/lib/notifications', () => ({
  sendNotification: jest.fn(),
}));

import { POST } from '@/app/api/automation/run/route';
import { analyzePlantHealth } from '@/lib/ai';
import { sendNotification } from '@/lib/notifications';

describe('/api/automation/run', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not claim analysis ran when no image is available', async () => {
    mockPrisma.automationRule.findUnique.mockResolvedValue({
      id: 'rule-1',
      enabled: true,
      plantId: 'plant-1',
      actions: [{ type: 'analyze', config: {} }],
      plant: null,
      schedule: null,
      trigger: null,
    });

    const response = await POST(new Request('http://localhost/api/automation/run', {
      method: 'POST',
      body: JSON.stringify({ type: 'rule', id: 'rule-1' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        success: false,
        results: [expect.objectContaining({
          result: expect.objectContaining({
            success: false,
            available: false,
            status: 'awaiting_capture',
          }),
        })],
      }),
    }));
    expect(analyzePlantHealth).not.toHaveBeenCalled();
    expect(mockPrisma.analysisHistory.create).not.toHaveBeenCalled();
  });

  it('creates a real capture task for automation capture actions', async () => {
    mockPrisma.automationRule.findUnique.mockResolvedValue({
      id: 'rule-2',
      enabled: true,
      plantId: 'plant-2',
      actions: [{ type: 'capture', config: { deviceInfo: { agent: 'hermes' } } }],
      plant: null,
      schedule: null,
      trigger: null,
    });
    mockPrisma.task.create.mockResolvedValue({ id: 'task-2' });

    const response = await POST(new Request('http://localhost/api/automation/run', {
      method: 'POST',
      body: JSON.stringify({ type: 'rule', id: 'rule-2' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plantId: 'plant-2',
        type: 'photo_capture',
        status: 'pending',
        data: expect.objectContaining({ requestedBy: 'automation' }),
      }),
    });
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      data: expect.objectContaining({
        results: [expect.objectContaining({
          result: expect.objectContaining({ status: 'awaiting_capture', taskId: 'task-2' }),
        })],
      }),
    }));
  });

  it('uses the notification service instead of claiming delivery', async () => {
    mockPrisma.automationRule.findUnique.mockResolvedValue({
      id: 'rule-3',
      enabled: true,
      plantId: 'plant-3',
      actions: [{ type: 'notify', config: {
        title: 'Plant alert',
        message: 'Review the latest capture',
        severity: 'warning',
        channels: ['in_app'],
      } }],
      plant: null,
      schedule: null,
      trigger: null,
    });
    (sendNotification as jest.Mock).mockResolvedValue({
      notification: { id: 'notification-3' },
      deliveries: [{ success: true, channel: 'in_app', messageId: 'inapp-3' }],
    });

    const response = await POST(new Request('http://localhost/api/automation/run', {
      method: 'POST',
      body: JSON.stringify({ type: 'rule', id: 'rule-3' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Plant alert',
      channels: ['in_app'],
      plantId: 'plant-3',
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      data: expect.objectContaining({ success: true }),
    }));
  });
});
