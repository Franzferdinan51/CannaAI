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

  it('fails over loopback and does not select a reranker in the browser adapter', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'qwen3-reranker-0.6b' }, { id: 'browser-chat-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: 'browser-chat-model', choices: [{ message: { content: 'local answer' } }] }),
      } as Response);

    const service = new ClientAIService({
      provider: 'lm-studio',
      lmStudio: { url: 'http://localhost:1234', model: '', apiKey: '' },
    } as any);

    await expect(service.generateResponse('hello')).resolves.toMatchObject({
      success: true,
      model: 'browser-chat-model',
    });
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:1234/v1/models');
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
  });

  it('normalizes a native LM Studio /api/v1 URL before discovery', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'browser-chat-model' }] }),
    } as Response);

    const service = new ClientAIService({
      provider: 'lm-studio',
      lmStudio: { url: 'http://localhost:1234/api/v1/', model: '', apiKey: '' },
    } as any);

    await expect(service.testConnection()).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/models');
  });

  it('uses the normalized native URL for the connection check', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const service = new ClientAIService({
      provider: 'lm-studio',
      lmStudio: { url: 'http://localhost:1234/api/v1/', model: '', apiKey: '' },
    } as any);

    await expect(service.testConnection()).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/models');
  });
});
