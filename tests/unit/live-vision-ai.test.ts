jest.mock('../../src/lib/ai-provider-detection', () => ({
  executeAIWithFallback: jest.fn(),
}));

import { executeAIWithFallback } from '@/lib/ai-provider-detection';
import { analyzePlantHealth } from '@/lib/ai';

describe('live vision AI helper', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the real vision provider chain and maps the normalized report', async () => {
    (executeAIWithFallback as jest.Mock).mockResolvedValue({
      result: JSON.stringify({
        diagnosis: 'Possible magnesium deficiency',
        confidence: 82,
        urgency: 'medium',
        healthScore: 68,
        recommendations: {
          immediate: ['Check root-zone pH'],
          shortTerm: ['Review nutrient balance'],
          longTerm: ['Capture a follow-up image'],
        },
        likelyCauses: [{ cause: 'Nutrient imbalance', confidence: 60, evidence: 'Leaf yellowing' }],
        evidenceObservations: ['Yellowing leaves'],
        uncertainties: ['Leaf underside was not visible'],
      }),
      provider: 'lmstudio',
      processingTime: 420,
    });

    await expect(analyzePlantHealth('data:image/jpeg;base64,abc', {
      strain: 'Test strain',
      growthStage: 'flower',
      symptoms: ['yellowing leaves'],
    })).resolves.toMatchObject({
      diagnosis: expect.stringContaining('Possible magnesium deficiency'),
      confidence: 0.82,
      healthScore: 0.68,
      recommendations: expect.arrayContaining(['Check root-zone pH']),
    });

    expect(executeAIWithFallback).toHaveBeenCalledWith(
      [{ role: 'user', content: expect.any(String) }],
      expect.objectContaining({
        image: 'data:image/jpeg;base64,abc',
        requireVision: true,
      }),
    );
  });

  it('rejects missing images instead of returning a canned analysis', async () => {
    await expect(analyzePlantHealth('', {})).rejects.toThrow('Image data is required');
    expect(executeAIWithFallback).not.toHaveBeenCalled();
  });
});
