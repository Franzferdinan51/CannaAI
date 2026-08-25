/** @jest-environment node */

jest.mock('@/lib/ai/geminiService', () => ({
  analyzePlantHealth: jest.fn(),
}));
jest.mock('@/lib/ai/lmstudioService', () => ({
  analyzeWithLMStudio: jest.fn(),
}));
jest.mock('@/lib/ai/openrouterService', () => ({
  analyzeWithOpenRouter: jest.fn(),
}));

import { runDualCheckPipeline } from '@/lib/ai/verificationPipeline';
import { analyzeWithLMStudio } from '@/lib/ai/lmstudioService';

const analysis = (summary: string, sentiment: 'critical' | 'healthy' = 'critical') => ({
  summary,
  entities: [],
  keyInsights: [],
  sentiment,
  flaggedIssues: sentiment === 'critical' ? ['possible pest'] : [],
  recommendations: [],
});

describe('dual-check local verification failover', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tries the next configured LM Studio slot after a verifier failure', async () => {
    (analyzeWithLMStudio as jest.Mock)
      .mockResolvedValueOnce(analysis('primary'))
      .mockRejectedValueOnce(new Error('first local model unavailable'))
      .mockResolvedValueOnce(analysis('verified', 'healthy'));

    const result = await runDualCheckPipeline('plant context', ['data:image/jpeg;base64,abc'], {
      enabled: { lmstudio: true, lmstudio2: true, lmstudio3: false, lmstudio4: false, gemini: false, openrouter: false },
      lmStudioEndpoint: 'http://127.0.0.1:1234',
      lmStudioEndpoint2: 'http://127.0.0.1:1235',
      lmStudioModel: 'first-model',
      lmStudioModel2: 'second-model',
      dualCheckMode: true,
      preferredVerifier: 'auto',
    } as any);

    expect(result.verificationStatus).toBe('completed');
    expect(result.verificationProvider).toBe('lmstudio2');
    expect(analyzeWithLMStudio).toHaveBeenNthCalledWith(
      3,
      'plant context',
      ['data:image/jpeg;base64,abc'],
      'http://127.0.0.1:1235',
      'possible pest',
      'second-model',
    );
  });

  it('reports a missing provider configuration instead of dereferencing partial config', async () => {
    await expect(runDualCheckPipeline('context', ['image'], {} as any))
      .rejects.toThrow('No AI providers configured');
  });
});
