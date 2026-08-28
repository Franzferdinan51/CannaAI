/** @jest-environment node */

import { GET, POST } from '@/app/api/lmstudio/route';
import { normalizeRemoteModels } from '@/lib/lmstudio-models';

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('/api/lmstudio legacy local endpoint', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deduplicates native model records and excludes non-chat models', () => {
    const models = normalizeRemoteModels([
      { key: 'ornith-1.5-35b-a3b', capabilities: { vision: false }, loaded_instances: [] },
      { key: 'ornith-1.5-35b-a3b', capabilities: { vision: true }, loaded_instances: [{ id: 'ornith-1.5-35b-a3b' }] },
      { key: 'text-embedding-nomic-embed-text-v1.5', capabilities: { vision: false } },
      { key: 'qwen3-reranker-0.6b', capabilities: { vision: false } },
    ]);

    expect(models).toHaveLength(1);
    expect(models[0]).toEqual(expect.objectContaining({ id: 'ornith-1.5-35b-a3b', loaded: true }));
    expect(models[0].capabilities).toEqual(expect.arrayContaining(['vision', 'image-analysis', 'loaded']));
  });

  test('uses an advertised model instead of sending the unsupported auto sentinel', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'local answer' } }],
      }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant' }),
    } as any);

    expect(result.status).toBe(200);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(requestBody.model).toBe('ornith-1.5-35b-a3b');
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      model: 'ornith-1.5-35b-a3b',
    }));
  });

  test('fails over from localhost to the alternate loopback endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'ipv4 local answer' } }],
      }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant', modelId: 'ornith-1.5-35b-a3b' }),
    } as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/models');
    expect(fetchMock.mock.calls[3][0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
  });

  test('uses an explicitly configured base URL for chat requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'custom endpoint answer' } }],
      }));

    const result = await POST({
      json: async () => ({
        prompt: 'Inspect this plant',
        modelId: 'ornith-1.5-35b-a3b',
        baseUrl: 'http://192.168.1.50:1234/v1',
      }),
    } as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.50:1234/v1/models');
    expect(fetchMock.mock.calls[1][0]).toBe('http://192.168.1.50:1234/v1/chat/completions');
  });

  test('normalizes a native API base URL before discovery and inference', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'native URL answer' } }],
      }));

    const result = await POST({
      json: async () => ({
        prompt: 'Inspect this plant',
        modelId: 'ornith-1.5-35b-a3b',
        baseUrl: 'http://192.168.1.50:1234/api/v1/',
      }),
    } as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.50:1234/v1/models');
    expect(fetchMock.mock.calls[1][0]).toBe('http://192.168.1.50:1234/v1/chat/completions');
  });

  test('does not send an embedding model to chat completions', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({
        data: [
          { id: 'text-embedding-model' },
          { id: 'qwen3-reranker-0.6b' },
          { id: 'cultivation-chat-model' },
        ],
      }))
      .mockResolvedValueOnce(response({
        model: 'cultivation-chat-model',
        choices: [{ message: { content: 'chat answer' } }],
      }));

    await POST({
      json: async () => ({ prompt: 'Hello' }),
    } as any);

    const requestBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(requestBody.model).toBe('cultivation-chat-model');
  });

  test('forwards an explicitly selected JIT model even when the catalog omits it', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'missing-vision-model',
        choices: [{ message: { content: 'JIT answer' } }],
      }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant', modelId: 'missing-vision-model' }),
    } as any);

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(requestBody.model).toBe('missing-vision-model');
  });

  test('preserves an image for a native vision-capable Ornith model', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({ models: [{ key: 'ornith-1.5-35b-a3b', capabilities: { vision: true } }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'vision answer' } }],
      }));

    const result = await POST({
      json: async () => ({
        prompt: 'Inspect this plant',
        image: 'ZmFrZS1pbWFnZQ==',
        modelId: 'ornith-1.5-35b-a3b',
      }),
    } as any);

    expect(result.status).toBe(200);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(requestBody.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this plant' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==' } },
    ]);
  });

  test('does not report success when LM Studio returns empty content', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'local-model' }] }))
      .mockResolvedValueOnce(response({
        model: 'local-model',
        choices: [{ message: { content: '' } }],
      }));

    const result = await POST({
      json: async () => ({ prompt: 'Hello', modelId: 'local-model' }),
    } as any);

    expect(result.status).toBe(500);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      error: 'LM Studio communication failed',
      message: 'LM Studio returned an empty response',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('rejects a native text-only model for image analysis', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'text-only-model' }] }))
      .mockResolvedValueOnce(response({ models: [{ key: 'text-only-model', capabilities: { vision: false } }] }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant', image: 'ZmFrZQ==', modelId: 'text-only-model' }),
    } as any);

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      code: 'LM_STUDIO_MODEL_NOT_VISION_CAPABLE',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('reports degraded when LM Studio has no runnable chat model', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [
        { id: 'text-embedding-model' },
        { id: 'qwen3-reranker-0.6b' },
        { id: 'auxiliary-model', type: 'reranker' },
      ] }));

    const result = await GET();

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      status: 'degraded',
      modelCount: 3,
    }));
  });

  test('health check fails over to the alternate loopback endpoint', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }));

    const result = await GET();

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/models');
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      environment: expect.objectContaining({ lmStudioUrl: 'http://127.0.0.1:1234' }),
    }));
  });
});
