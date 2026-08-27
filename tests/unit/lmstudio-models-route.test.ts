/** @jest-environment node */

import { GET } from '@/app/api/lmstudio/models/route';

describe('/api/lmstudio/models explicit URL probes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not require Prisma or scan the local filesystem when the endpoint is unavailable', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));

    const result = await GET(new Request(
      'http://localhost/api/lmstudio/models?url=http%3A%2F%2F127.0.0.1%3A1234',
    ) as any);

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      status: 'unavailable',
      lmStudioRunning: false,
      models: [],
      message: 'LM Studio is not reachable at the configured URL.',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('preserves native vision capability metadata for Settings', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{
          key: 'ornith-1.5-35b-a3b',
          type: 'llm',
          capabilities: { vision: true },
        }],
      }),
    } as Response);

    const result = await GET(new Request(
      'http://localhost/api/lmstudio/models?url=http%3A%2F%2F127.0.0.1%3A1234',
    ) as any);
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:1234/api/v1/models');
    expect(body.models[0]).toEqual(expect.objectContaining({
      id: 'ornith-1.5-35b-a3b',
      capabilities: expect.arrayContaining(['vision', 'image-analysis']),
    }));
  });

  test('uses a fallback timeout signal when AbortSignal.timeout is unavailable', async () => {
    const originalTimeout = (AbortSignal as typeof AbortSignal & {
      timeout?: (milliseconds: number) => AbortSignal;
    }).timeout;
    Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
    try {
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ key: 'local-model', capabilities: { vision: false } }] }),
      } as Response);

      const result = await GET(new Request(
        'http://localhost/api/lmstudio/models?url=http%3A%2F%2F127.0.0.1%3A1234',
      ) as any);

      expect(result.status).toBe(200);
      expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: originalTimeout });
    }
  });
});
