/** @jest-environment node */

const mockPrisma = {
  plant: { findUnique: jest.fn() },
  plantAnalysis: { create: jest.fn(), findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/ai', () => ({ analyzePlantHealth: jest.fn() }));

import { POST as analyzePlant } from '@/app/api/plants/[id]/analyze/route';
import { GET as getAnalyses } from '@/app/api/plants/[id]/analyses/route';
import { analyzePlantHealth } from '@/lib/ai';

describe('plant analysis routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('runs submitted plant images through the real vision analysis path and persists the result', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue({
      id: 'plant-1',
      name: 'Test plant',
      stage: 'flower',
      strain: { name: 'Test cultivar' },
    });
    (analyzePlantHealth as jest.Mock).mockResolvedValue({
      diagnosis: 'Possible nutrient stress',
      confidence: 0.82,
      healthScore: 0.68,
      recommendations: ['Review root-zone pH'],
      urgency: 'medium',
      potentialIssues: ['nutrient stress'],
      suggestedActions: ['Review root-zone pH'],
      nextSteps: ['Capture a follow-up image'],
      provider: 'lmstudio',
    });
    mockPrisma.plantAnalysis.create.mockResolvedValue({ id: 'analysis-1' });

    const form = new FormData();
    form.append('image', new Blob(['fake-image'], { type: 'image/jpeg' }), 'plant.jpg');
    form.append('data', JSON.stringify({
      model: 'ornith-1.5-35b-a3b',
      symptoms: ['curling leaves'],
      temperature: '24.5',
      humidity: '55',
      phLevel: '6.2',
      expectedPlantCount: '1',
    }));

    const response = await analyzePlant(
      new Request('http://localhost/api/plants/plant-1/analyze', { method: 'POST', body: form }) as any,
      { params: Promise.resolve({ id: 'plant-1' }) },
    );

    expect(response.status).toBe(200);
    expect(analyzePlantHealth).toHaveBeenCalledWith(
      expect.stringContaining('data:image/jpeg;base64,'),
      expect.objectContaining({
        strain: 'Test cultivar',
        growthStage: 'flower',
        model: 'ornith-1.5-35b-a3b',
        symptoms: ['curling leaves'],
        temperature: 24.5,
        humidity: 55,
        phLevel: 6.2,
        expectedPlantCount: 1,
      }),
    );
    expect(mockPrisma.plantAnalysis.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ plantId: 'plant-1', provider: 'lmstudio' }),
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ result: expect.objectContaining({ diagnosis: 'Possible nutrient stress' }) }),
    }));
  });

  test('returns an honest empty history when no analyses exist', async () => {
    mockPrisma.plantAnalysis.findMany.mockResolvedValue([]);

    const response = await getAnalyses(new Request('http://localhost/api/plants/plant-1/analyses'), {
      params: Promise.resolve({ id: 'plant-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: [] });
  });
});
