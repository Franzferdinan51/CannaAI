/** @jest-environment node */

import { GET, POST } from '@/app/api/lmstudio/route';
import { normalizeRemoteModels } from '@/app/api/lmstudio/models/route';

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

  test('does not send an embedding model to chat completions', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({
        data: [
          { id: 'text-embedding-model' },
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
      .mockResolvedValueOnce(response({ data: [{ id: 'text-embedding-model' }] }));

    const result = await GET();

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      status: 'degraded',
      modelCount: 1,
    }));
  });
});
