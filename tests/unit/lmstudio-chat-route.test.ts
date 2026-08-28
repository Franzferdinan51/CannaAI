/** @jest-environment node */

import { POST } from '@/app/api/lmstudio/chat/route';

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

const modelsResponse = (models: unknown[]) => response({ data: models });
const completionResponse = (content: string) => response({
  model: 'ornith-1.5-35b-a3b',
  choices: [{ message: { content }, finish_reason: 'stop' }],
});
const requestWithBody = (body: unknown) => ({ json: async () => body });

describe('/api/lmstudio/chat local endpoint failover', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('tries the alternate loopback endpoint when localhost is unavailable', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'healthy local answer' }, finish_reason: 'stop' }],
      }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant', model: 'ornith-1.5-35b-a3b' }),
    } as any);

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      content: 'healthy local answer',
      provider: 'lmstudio-local',
    }));
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/models');
    expect(fetchMock.mock.calls[3][0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
    expect(fetchMock.mock.calls[3][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  test('uses an explicitly configured LM Studio base URL for inference', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'ornith-1.5-35b-a3b' }]))
      .mockResolvedValueOnce(completionResponse('remote local answer'));

    const result = await POST(requestWithBody({
      prompt: 'Inspect this plant',
      model: 'ornith-1.5-35b-a3b',
      baseUrl: 'http://192.168.1.50:1234/v1',
    }) as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.50:1234/v1/models');
    expect(fetchMock.mock.calls[1][0]).toBe('http://192.168.1.50:1234/v1/chat/completions');
  });

  test('normalizes a native /api/v1 URL when probing a requested provider', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'ornith-1.5-35b-a3b' }]));

    const result = await POST(requestWithBody({
      message: 'test connection',
      testProvider: 'lmstudio',
      providerSettings: { lmStudio: { url: 'http://192.168.1.50:1234/api/v1', apiKey: '' } },
    }) as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.50:1234/v1/models');
  });

  test('does not report success when LM Studio is reachable without a chat model', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'text-embedding-model' }]));

    const result = await POST(requestWithBody({
      testProvider: 'lmstudio',
      providerSettings: { lmStudio: { url: 'http://127.0.0.1:1234' } },
    }) as any);

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      code: 'LM_STUDIO_NO_CHAT_MODEL',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('attaches a supplied image to the latest user message when messages are provided', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'ornith-1.5-35b-a3b' }] }))
      .mockResolvedValueOnce(response({ models: [{ key: 'ornith-1.5-35b-a3b', capabilities: { vision: true } }] }))
      .mockResolvedValueOnce(response({
        model: 'ornith-1.5-35b-a3b',
        choices: [{ message: { content: 'vision answer' }, finish_reason: 'stop' }],
      }));
    const messages = [{ role: 'user', content: 'Inspect the newest leaf' }];

    const result = await POST({
      json: async () => ({
        messages,
        image: 'data:image/jpeg;base64,abc123',
        model: 'ornith-1.5-35b-a3b',
      }),
    } as any);

    expect(result.status).toBe(200);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(requestBody.messages).toEqual([{
      role: 'user',
      content: [
        { type: 'text', text: 'Inspect the newest leaf' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
      ],
    }]);
  });

  test('preserves existing multimodal parts when attaching a supplied image', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'ornith-1.5-35b-a3b' }]))
      .mockResolvedValueOnce(response({ models: [{ key: 'ornith-1.5-35b-a3b', capabilities: { vision: true } }] }))
      .mockResolvedValueOnce(completionResponse('vision answer'));
    const existingImage = { type: 'image_url', image_url: { url: 'data:image/png;base64,existing' } };

    const result = await POST(requestWithBody({
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: 'Compare these leaves' }, existingImage],
      }],
      image: 'data:image/jpeg;base64,additional',
      model: 'ornith-1.5-35b-a3b',
    }) as any);

    expect(result.status).toBe(200);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(requestBody.messages[0].content).toEqual([
      { type: 'text', text: 'Compare these leaves' },
      existingImage,
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,additional' } },
    ]);
  });

  test('continues to the native catalog when the compatibility catalog is empty', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([]))
      .mockResolvedValueOnce(response({ models: [{ key: 'native-local-model' }] }))
      .mockResolvedValueOnce(completionResponse('native answer'));

    const result = await POST(requestWithBody({ prompt: 'hello' }) as any);

    expect(result.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/models');
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:1234/api/v1/models');
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).model).toBe('native-local-model');
  });

  test('normalizes raw base64 images when the route creates the user message', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'ornith-1.5-35b-a3b' }]))
      .mockResolvedValueOnce(response({ models: [{ key: 'ornith-1.5-35b-a3b', capabilities: { vision: true } }] }))
      .mockResolvedValueOnce(completionResponse('vision answer'));

    const result = await POST(requestWithBody({
      prompt: 'Inspect this plant',
      image: 'ZmFrZS1pbWFnZQ==',
      model: 'ornith-1.5-35b-a3b',
    }) as any);

    expect(result.status).toBe(200);
    const body = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this plant' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==' } },
    ]);
  });

  test('rejects malformed raw image data before contacting LM Studio', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    const result = await POST(requestWithBody({
      prompt: 'Inspect this plant',
      image: 'not-an-image-payload',
      model: 'ornith-1.5-35b-a3b',
    }) as any);

    expect(result.status).toBe(400);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      code: 'INVALID_IMAGE_DATA',
    }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects an advertised text-only model for image requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'text-only-model' }]))
      .mockResolvedValueOnce(response({ models: [{ key: 'text-only-model', capabilities: { vision: false } }] }));

    const result = await POST(requestWithBody({
      prompt: 'Inspect this plant',
      image: 'ZmFrZS1pbWFnZQ==',
      model: 'text-only-model',
    }) as any);

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      code: 'LM_STUDIO_MODEL_NOT_VISION_CAPABLE',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('allows an image request when the selected model has no native capability metadata', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'custom-local-model' }]))
      .mockResolvedValueOnce(response({ models: [{ key: 'custom-local-model' }] }))
      .mockResolvedValueOnce(response({
        model: 'custom-local-model',
        choices: [{ message: { content: 'vision answer' }, finish_reason: 'stop' }],
      }));

    const result = await POST(requestWithBody({
      prompt: 'Inspect this plant',
      image: 'ZmFrZS1pbWFnZQ==',
      model: 'custom-local-model',
    }) as any);

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('returns unavailable when LM Studio advertises no runnable chat model', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(response({ data: [{ id: 'text-embedding-model' }] }));

    const result = await POST({
      json: async () => ({ prompt: 'Inspect this plant' }),
    } as any);

    expect(result.status).toBe(503);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      code: 'LM_STUDIO_NO_CHAT_MODEL',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('normalizes structured and reasoning-only assistant responses', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'local-model' }]))
      .mockResolvedValueOnce(response({
        model: 'local-model',
        choices: [{ message: {
          content: [{ type: 'text', text: 'part one' }, { type: 'text', text: ' part two' }],
        } }],
      }));

    const structured = await POST(requestWithBody({ prompt: 'hello', model: 'local-model' }) as any);
    expect(structured.status).toBe(200);
    await expect(structured.json()).resolves.toEqual(expect.objectContaining({ content: 'part one part two' }));

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(modelsResponse([{ id: 'local-model' }]))
      .mockResolvedValueOnce(response({
        model: 'local-model',
        choices: [{ message: { content: '', reasoning_content: 'reasoning answer' } }],
      }));
    const reasoning = await POST(requestWithBody({ prompt: 'hello', model: 'local-model' }) as any);
    await expect(reasoning.json()).resolves.toEqual(expect.objectContaining({ content: 'reasoning answer' }));
  });

  test('preserves LM Studio SSE responses when streaming is requested', async () => {
    const streamBody = 'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(modelsResponse([{ id: 'local-model' }]))
      .mockResolvedValueOnce(new Response(streamBody, {
        headers: { 'content-type': 'text/event-stream' },
      }));

    const result = await POST(requestWithBody({
      prompt: 'hello',
      model: 'local-model',
      stream: true,
    }) as any);

    expect(result.status).toBe(200);
    expect(result.headers.get('content-type')).toContain('text/event-stream');
    await expect(result.text()).resolves.toBe(streamBody);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).stream).toBe(true);
  });
});
