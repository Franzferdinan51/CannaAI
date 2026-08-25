/** @jest-environment node */

const mockPrisma = {
  task: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  analysisHistory: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/ai', () => ({
  analyzePlantHealth: jest.fn(),
}));

import { PUT } from '@/app/api/automation/photo-capture/route';
import { executeCapture, triggerAnalysisAfterCapture } from '@/lib/photo-capture-service';
import { analyzePlantHealth } from '@/lib/ai';

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

  it('runs connected-agent images through the real local-first analysis path', async () => {
    (analyzePlantHealth as jest.Mock).mockResolvedValue({
      diagnosis: 'Possible nutrient stress',
      confidence: 0.72,
      recommendations: ['Review recent feed'],
      urgency: 'medium',
      potentialIssues: ['nutrient stress'],
      suggestedActions: ['Review recent feed'],
      nextSteps: ['Capture a follow-up image'],
    });
    mockPrisma.analysisHistory.create.mockResolvedValue({ id: 'history-1' });

    await triggerAnalysisAfterCapture('plant-1', 'data:image/jpeg;base64,abc', {
      taskId: 'task-1',
      capturedAt: '2026-08-25T16:00:00.000Z',
      deviceInfo: { agent: 'hermes', device: 'pixel' },
      strain: 'Test cultivar',
      symptoms: ['curling leaves'],
    });

    expect(analyzePlantHealth).toHaveBeenCalledWith(
      'data:image/jpeg;base64,abc',
      expect.objectContaining({ strain: 'Test cultivar', symptoms: ['curling leaves'] }),
    );
    expect(mockPrisma.analysisHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plantId: 'plant-1',
        analysisType: 'automated_photo',
        data: expect.objectContaining({ diagnosis: 'Possible nutrient stress' }),
        metadata: expect.objectContaining({ captureTask: 'task-1' }),
      }),
    });
  });

  it('forwards model settings nested in a capture task config', async () => {
    (analyzePlantHealth as jest.Mock).mockResolvedValue({
      diagnosis: 'No obvious issue',
      confidence: 0.8,
      recommendations: [],
      urgency: 'low',
      potentialIssues: [],
      suggestedActions: [],
      nextSteps: [],
    });
    mockPrisma.analysisHistory.create.mockResolvedValue({ id: 'history-2' });

    await triggerAnalysisAfterCapture('plant-1', 'data:image/jpeg;base64,abc', {
      config: { model: 'ornith-1.5-35b-a3b', primaryProvider: 'lmstudio' },
    });

    expect(analyzePlantHealth).toHaveBeenCalledWith(
      'data:image/jpeg;base64,abc',
      expect.objectContaining({
        model: 'ornith-1.5-35b-a3b',
        primaryProvider: 'lmstudio',
      }),
    );
  });
});
