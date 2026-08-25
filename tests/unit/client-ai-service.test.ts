import { ClientAIService } from '@/lib/ai/client-ai-service';

describe('ClientAIService', () => {
  it('does not convert an unavailable provider into fabricated success', async () => {
    const service = new ClientAIService({ provider: 'fallback' } as any);

    await expect(service.generateResponse('What should I do?', 'chat')).resolves.toMatchObject({
      success: false,
      response: '',
      fallbackUsed: false,
      provider: 'fallback',
    });
  });

  it('does not report the removed fallback provider as connected', async () => {
    const service = new ClientAIService({ provider: 'fallback' } as any);

    await expect(service.testConnection()).resolves.toBe(false);
  });
});
