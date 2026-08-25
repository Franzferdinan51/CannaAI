/** @jest-environment node */

const mockPrisma = {
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { PUT, executeCapture } from '@/app/api/automation/photo-capture/route';

describe('/api/automation/photo-capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps an agent-less capture awaiting a connected camera instead of fabricating success', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      type: 'photo_capture',
      plantId: null,
      data: { deviceInfo: { agent: 'hermes' } },
    });
    mockPrisma.task.update
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await executeCapture('task-1');

    expect(mockPrisma.task.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'task-1' },
      data: expect.objectContaining({ status: 'awaiting_capture' }),
    }));
    expect(mockPrisma.task.update.mock.calls[1][0].data.data).toEqual(expect.objectContaining({
      success: false,
      message: 'Waiting for a connected capture agent to provide imageData',
    }));
  });

  it('rejects completion updates that do not include image data', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      type: 'photo_capture',
      data: { captureType: 'plant' },
    });

    const response = await PUT(new Request('http://localhost/api/automation/photo-capture', {
      method: 'PUT',
      body: JSON.stringify({ id: 'task-1', status: 'completed' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(400);
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('preserves task data when a connected agent submits an image', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      type: 'photo_capture',
      plantId: null,
      data: { captureType: 'plant', requestedBy: 'hermes' },
    });
    mockPrisma.task.update.mockResolvedValue({ id: 'task-1', status: 'completed' });

    const response = await PUT(new Request('http://localhost/api/automation/photo-capture', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'task-1',
        imageData: 'data:image/jpeg;base64,abc',
        result: { source: 'pixel' },
      }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(mockPrisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'completed',
        data: expect.objectContaining({
          captureType: 'plant',
          requestedBy: 'hermes',
          imageData: 'data:image/jpeg;base64,abc',
        }),
      }),
    }));
  });
});
