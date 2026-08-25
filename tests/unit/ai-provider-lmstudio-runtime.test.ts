/**
 * Regression tests for the legacy LM Studio adapter used by /api/chat.
 */

import {
  executeWithLMStudio,
  getConfiguredModels,
  setModel,
} from '@/lib/ai-provider-lmstudio';

describe('legacy LM Studio runtime configuration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env.LM_STUDIO_MODEL;
    delete process.env.LM_STUDIO_TEXT_MODEL;
    delete process.env.LM_STUDIO_VISION_MODEL;
    setModel('text', '');
    setModel('vision', '');
  });

  test('setModel changes the model used by the next request without a process restart', async () => {
    setModel('text', 'runtime-selected-model');

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
      text: async () => '',
    } as Response);

    await executeWithLMStudio([{ role: 'user', content: 'hello' }]);

    const request = fetchMock.mock.calls.find(([url]) => String(url).includes('/chat/completions'));
    expect(request).toBeDefined();
    const body = JSON.parse(String((request?.[1] as RequestInit)?.body));
    expect(body.model).toBe('runtime-selected-model');
    expect(getConfiguredModels().text).toBe('runtime-selected-model');
  });

  test('auto-selects an advertised local chat model instead of assuming a hard-coded model is installed', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'my-local-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'local answer' } }] }),
        text: async () => '',
      } as Response);

    const result = await executeWithLMStudio([{ role: 'user', content: 'hello' }]);

    expect(result).toBe('local answer');
    const completionCall = fetchMock.mock.calls[1];
    const body = JSON.parse(String((completionCall[1] as RequestInit).body));
    expect(body.model).toBe('my-local-model');
  });

  test('does not auto-select a reranker as a chat model', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'qwen3-reranker-0.6b' }, { id: 'my-local-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'local answer' } }] }),
        text: async () => '',
      } as Response);

    await executeWithLMStudio([{ role: 'user', content: 'hello' }]);

    const completionCall = fetchMock.mock.calls[1];
    const body = JSON.parse(String((completionCall[1] as RequestInit).body));
    expect(body.model).toBe('my-local-model');
  });

  test('uses the loopback endpoint that answered model discovery for inference', async () => {
    process.env.LM_STUDIO_MODEL = 'ornith-1.5-35b-a3b';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED ::1:1234'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'ornith-1.5-35b-a3b' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'ornith-1.5-35b-a3b',
          choices: [{ message: { content: 'ipv4 local answer' } }],
        }),
      } as Response);

    await expect(executeWithLMStudio([{ role: 'user', content: 'hello' }]))
      .resolves.toBe('ipv4 local answer');

    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:1234/v1/models');
    expect(fetchMock.mock.calls[2][0]).toBe('http://127.0.0.1:1234/v1/chat/completions');
  });

  test('does not send an image to a text-only model when no vision model is available', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'text-only-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ key: 'text-only-model', type: 'llm', capabilities: { vision: false } }],
        }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { image: 'data:image/jpeg;base64,abc123', useVision: true },
    )).rejects.toThrow('no vision-capable model');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('rejects an explicitly selected native text-only model for image requests', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'text-only-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ key: 'text-only-model', type: 'llm', capabilities: { vision: false } }],
        }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { model: 'text-only-model', image: 'data:image/jpeg;base64,abc123', useVision: true },
    )).rejects.toThrow('advertised as text-only');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('preserves non-image data URLs such as application/octet-stream captures', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'vision-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'vision-model', type: 'llm', capabilities: { vision: true } }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'vision answer' } }] }),
      } as Response);

    await executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this capture' }],
      { image: 'data:application/octet-stream;base64,abc123', useVision: true },
    );

    const body = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(body.messages[0].content[1].image_url.url).toBe('data:application/octet-stream;base64,abc123');
  });
});
