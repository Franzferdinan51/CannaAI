/** @jest-environment jsdom */

import { analyzeWithLMStudio, testLMStudioConnection } from '@/lib/ai/lmstudioService';

describe('legacy LM Studio vision client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('preserves an image data URL supplied by a phone capture', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'Healthy plant' }) } }],
      }),
    } as Response);

    await analyzeWithLMStudio(
      'Inspect this plant',
      ['data:image/heic;base64,phone-capture'],
      'http://127.0.0.1:1234',
      undefined,
      'ornith-1.5-35b-a3b',
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toEqual(expect.arrayContaining([
      { type: 'image_url', image_url: { url: 'data:image/heic;base64,phone-capture' } },
    ]));
  });

  test('normalizes raw base64 images for vision models', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    } as Response);

    await analyzeWithLMStudio('Inspect this plant', ['raw-base64'], 'http://localhost:1234', undefined, 'vision-model');

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toEqual(expect.arrayContaining([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,raw-base64' } },
    ]));
  });

  test('normalizes structured and reasoning-only LM Studio analysis responses', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: [
          { type: 'text', text: '{"summary":"' },
          { type: 'text', text: 'healthy"}' },
        ] } }] }),
      } as Response);

    const result = await analyzeWithLMStudio(
      'Inspect the plant',
      ['data:image/jpeg;base64,ZmFrZQ=='],
      'http://localhost:1234',
      undefined,
      'vision-model',
    );

    expect(result?.summary).toBe('healthy');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '', reasoning_content: '{"summary":"reasoned"}' } }] }),
      } as Response);

    const reasoningResult = await analyzeWithLMStudio(
      'Inspect the plant',
      [],
      'http://localhost:1234',
      undefined,
      'vision-model',
    );

    expect(reasoningResult?.summary).toBe('reasoned');
  });

  test('normalizes an LM Studio endpoint that already includes /v1', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    } as Response);

    await analyzeWithLMStudio('Inspect this plant', [], 'http://localhost:1234/v1/', undefined, 'vision-model');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/chat/completions');
  });

  test('normalizes an endpoint copied from the native /api/v1 route', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    } as Response);

    await analyzeWithLMStudio('Inspect this plant', [], 'http://localhost:1234/api/v1/', undefined, 'vision-model');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/chat/completions');
  });

  test('uses the native model catalog for a /v1 endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'ornith-1.5-35b-a3b' }] }),
    } as Response);

    await expect(testLMStudioConnection('http://localhost:1234/v1')).resolves.toEqual({
      success: true,
      models: ['ornith-1.5-35b-a3b'],
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/api/v1/models');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  test('falls back to the OpenAI-compatible catalog on older LM Studio releases', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'legacy-vision-model' }] }),
      } as Response);

    await expect(testLMStudioConnection('http://localhost:1234')).resolves.toEqual({
      success: true,
      models: ['legacy-vision-model'],
    });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'http://localhost:1234/api/v1/models',
      'http://localhost:1234/v1/models',
    ]);
  });

  test('sends an optional bearer token and reads native model keys', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ key: 'ornith-1.5-35b-a3b' }] }),
    } as Response);

    await expect(testLMStudioConnection('http://localhost:1234', 'local-token')).resolves.toEqual({
      success: true,
      models: ['ornith-1.5-35b-a3b'],
    });
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer local-token' }),
    }));
  });

  test('uses the configured LM Studio token for legacy inference', async () => {
    const previousToken = process.env.LM_STUDIO_API_KEY;
    process.env.LM_STUDIO_API_KEY = 'inference-token';
    try {
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
      } as Response);

      await analyzeWithLMStudio('Inspect the plant', [], 'http://localhost:1234', undefined, 'vision-model');

      expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer inference-token' }),
      }));
    } finally {
      if (previousToken === undefined) delete process.env.LM_STUDIO_API_KEY;
      else process.env.LM_STUDIO_API_KEY = previousToken;
    }
  });

  test('skips non-chat models during automatic selection', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [
          { id: 'qwen3-reranker-0.6b', type: 'reranker' },
          { id: 'ornith-1.5-35b-a3b' },
        ] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
      } as Response);

    await analyzeWithLMStudio('Inspect the plant', [], 'http://localhost:1234');

    const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(body.model).toBe('ornith-1.5-35b-a3b');
  });
});
