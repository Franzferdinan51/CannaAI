/**
 * Regression tests for the legacy LM Studio adapter used by /api/chat.
 *
 * The adapter is the function module `@/lib/ai-provider-lmstudio`. (The
 * class-based `@/lib/ai-providers/lmstudio-provider` was deleted in the
 * provider consolidation. The function adapter now matches the class
 * behavior the old suite guarded: an explicitly selected text-only model
 * is refused for image requests even when another vision model is
 * available, images embedded as message content parts select vision, and
 * a native catalog entry that omits capability metadata is not treated
 * as authoritatively text-only.)
 *
 * The module keeps a 60-second model-catalog cache, so each test re-imports
 * a fresh module instance; otherwise one test's catalog would leak into the
 * next test's discovery.
 */

type LMStudioModule = typeof import('@/lib/ai-provider-lmstudio');

let executeWithLMStudio: LMStudioModule['executeWithLMStudio'];
let getConfiguredModels: LMStudioModule['getConfiguredModels'];
let setModel: LMStudioModule['setModel'];

describe('legacy LM Studio runtime configuration', () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.restoreAllMocks();
    const mod = await import('@/lib/ai-provider-lmstudio');
    executeWithLMStudio = mod.executeWithLMStudio;
    getConfiguredModels = mod.getConfiguredModels;
    setModel = mod.setModel;
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

  test('uses an explicit LM Studio endpoint for discovery and completion', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'remote-local-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'remote answer' } }] }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'hello' }],
      { baseUrl: 'http://192.168.1.50:1234/api/v1' },
    )).resolves.toBe('remote answer');

    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.1.50:1234/v1/models');
    expect(fetchMock.mock.calls[1][0]).toBe('http://192.168.1.50:1234/v1/chat/completions');
  });

  test('uses a per-request API key for discovery and completion', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'authenticated-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'authenticated answer' } }] }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'hello' }],
      { apiKey: 'settings-token' },
    )).resolves.toBe('authenticated answer');

    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer settings-token' }),
    );
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer settings-token' }),
    );
  });

  test('can preserve the resolved model for the provider fallback chain', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'auto-selected-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'answer' } }] }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'hello' }],
      { returnMetadata: true },
    )).resolves.toEqual(expect.objectContaining({
      content: 'answer',
      result: 'answer',
      model: 'auto-selected-model',
    }));
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

  test('refuses an explicitly selected text-only model even when another vision model is available', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'text-only-model' }, { id: 'vision-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { key: 'text-only-model', type: 'llm', capabilities: { vision: false } },
            { key: 'vision-model', type: 'llm', capabilities: { vision: true } },
          ],
        }),
      } as Response);

    await expect(executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { model: 'text-only-model', image: 'data:image/jpeg;base64,abc123', useVision: true },
    )).rejects.toThrow('advertised as text-only');

    // No completion call: the image was not silently rerouted to the
    // other vision model either.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('treats an image_url message part as a vision request without an explicit image option', async () => {
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

    const result = await executeWithLMStudio([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Inspect this leaf' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
        ],
      },
    ]);

    expect(result).toBe('vision answer');
    const body = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(body.model).toBe('vision-model');
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this leaf' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc123' } },
    ]);
  });

  test('forwards an explicitly selected model whose native entry omits capability metadata', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'mystery-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'mystery-model', type: 'llm' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'mystery answer' } }] }),
      } as Response);

    const result = await executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { model: 'mystery-model', image: 'data:image/jpeg;base64,abc123', useVision: true },
    );

    expect(result).toBe('mystery answer');
    const body = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(body.model).toBe('mystery-model');
  });

  test('auto-selects a vision-named model whose native entry omits capability metadata', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'mystery-vision-model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'mystery-vision-model', type: 'llm' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'auto vision answer' } }] }),
      } as Response);

    const result = await executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { image: 'data:image/jpeg;base64,abc123', useVision: true },
    );

    expect(result).toBe('auto vision answer');
    const body = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(body.model).toBe('mystery-vision-model');
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
