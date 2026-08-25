/** @jest-environment node */

import { GET, POST, DELETE } from '@/app/api/history/route';
import { prisma } from '@/lib/prisma';

describe('/api/history persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BUILD_MODE;
  });

  test('reads durable PlantAnalysis records without inventing scores', async () => {
    const createdAt = new Date('2026-08-25T12:00:00.000Z');
    (prisma.plantAnalysis.findMany as jest.Mock).mockResolvedValueOnce([{
      id: 'analysis-1',
      createdAt,
      request: { strain: 'Blue Dream' },
      result: { diagnosis: 'Healthy', confidence: null, healthScore: null },
    }]);

    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      success: true,
      count: 1,
      history: [expect.objectContaining({
        id: 'analysis-1',
        strain: 'Blue Dream',
        diagnosis: 'Healthy',
        confidence: null,
        healthScore: null,
      })],
    });
    expect(prisma.plantAnalysis.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  });

  test('persists supplied history data without defaulting omitted metrics', async () => {
    const createdAt = new Date('2026-08-25T12:00:00.000Z');
    (prisma.plantAnalysis.create as jest.Mock).mockResolvedValueOnce({
      id: 'analysis-2',
      createdAt,
      request: { strain: 'Northern Lights' },
      result: { diagnosis: 'Needs review', confidence: null, healthScore: null, notes: '', isPurpleStrain: false, analysisData: null },
    });

    const response = await POST(new Request('http://localhost/api/history', {
      method: 'POST',
      body: JSON.stringify({ strain: 'Northern Lights', diagnosis: 'Needs review' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(prisma.plantAnalysis.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'history-route',
        request: { strain: 'Northern Lights' },
        result: expect.objectContaining({ confidence: null, healthScore: null }),
      }),
    });
  });

  test('deletes a durable record and reports missing records honestly', async () => {
    (prisma.plantAnalysis.delete as jest.Mock).mockRejectedValueOnce({ code: 'P2025' });

    const response = await DELETE(new Request('http://localhost/api/history?id=missing') as any);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ success: false, error: 'History entry not found' });
  });
});
