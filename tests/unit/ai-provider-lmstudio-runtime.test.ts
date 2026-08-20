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
});
