/** @jest-environment node */

const mockCheckLMStudio = jest.fn();
const mockDetectAvailableProviders = jest.fn();

jest.mock('@/lib/ai-providers/unified-ai', () => ({
  getUnifiedAI: () => ({ getProviderStatus: () => [] }),
}));

jest.mock('@/lib/ai-provider-detection', () => ({
  checkLMStudio: (...args: unknown[]) => mockCheckLMStudio(...args),
  detectAvailableProviders: (...args: unknown[]) => mockDetectAvailableProviders(...args),
  getProviderConfig: jest.fn((provider: string) => provider === 'lmstudio'
    ? { url: 'http://localhost:1234', model: '', apiKey: '', timeout: 120000 }
    : { baseUrl: 'https://openrouter.ai/api/v1', model: '', apiKey: '', timeout: 30000 }),
}));

import { GET } from '@/app/api/providers/route';
import { POST } from '@/app/api/ai/providers/route';

describe('/api/providers redirect', () => {
  test('preserves the incoming origin for proxied and remote clients', async () => {
    const response = await GET(new Request('https://phone.example:5174/api/providers') as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://phone.example:5174/api/ai/providers');
  });
});

describe('/api/ai/providers test endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tests LM Studio without requiring a model when auto-discovery is enabled', async () => {
    mockCheckLMStudio.mockResolvedValue({
      isAvailable: true,
      available: true,
      provider: 'lm-studio',
      models: ['catalog-model'],
      reason: 'LM Studio is running',
    });

    const response = await POST(new Request('http://localhost:3000/api/ai/providers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        providerId: 'lm-studio',
        modelId: '',
        baseUrl: 'http://127.0.0.1:1234/api/v1',
      }),
    }) as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      provider: 'lmstudio',
      model: 'catalog-model',
    }));
    expect(mockCheckLMStudio).toHaveBeenCalledWith(true, 'http://127.0.0.1:1234/api/v1');
  });
});
