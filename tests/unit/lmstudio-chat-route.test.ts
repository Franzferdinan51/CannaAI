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
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:1234/v1/models');
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
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
});
