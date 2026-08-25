/** @jest-environment node */

import { POST } from '@/app/api/lmstudio/route';

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
});
