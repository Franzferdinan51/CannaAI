/**
 * Regression coverage for local-model failures that previously made a healthy
 * LM Studio server look unavailable or caused successful completions to be
 * discarded by the fallback chain.
 *
 * The class-based `@/lib/ai-providers/lmstudio-provider` was deleted in the
 * provider consolidation; the behaviors below are exercised against its
 * replacement, the function module `@/lib/ai-provider-lmstudio`, via
 * `jest.requireActual` (the module is mocked for the fallback-chain tests).
 * Each ported test uses its own baseUrl so the module's 60-second catalog
 * cache cannot leak one test's catalog into the next. Vision resolution no
 * longer honors a caller baseUrl (it always uses the deployment endpoint),
 * so the vision test that needs an empty catalog cache re-requires a fresh
 * module instance instead. The fallback-chain tests exercise the unlocked
 * provider chain, so the suite opts into CANNAAI_ALLOW_CLOUD_AI; the
 * local-only lock itself is covered in ai-provider-detection.test.ts.
 *
 * Class-only coverage not carried over:
 * - "preserves non-image data URL MIME types" and "refuses to send images to
 *   an advertised text-only model" — already covered against the function
 *   adapter in ai-provider-lmstudio-runtime.test.ts.
 * - "detects image_url content arrays before selecting a model" — the
 *   function adapter selects vision models from the explicit `image`
 *   option, not from message content parts; no current equivalent.
 * - "allows vision requests when native metadata omits capabilities" — the
 *   function adapter treats a native catalog that omits a model from its
 *   vision set as authoritative and rejects the request instead. Provider
 *   behavior divergence, tracked outside this suite.
 */

const mockCheckLMStudio = jest.fn();
const mockExecuteWithLMStudio = jest.fn();
const mockCheckOpenClaw = jest.fn();
const mockExecuteWithOpenClaw = jest.fn();
const mockCheckBailian = jest.fn();
const mockExecuteWithBailian = jest.fn();
const mockCheckOpenRouter = jest.fn();
const mockExecuteWithOpenRouter = jest.fn();
const mockCheckMiniMax = jest.fn();
const mockExecuteWithMiniMax = jest.fn();
const mockCheckHermes = jest.fn();
const mockExecuteWithHermes = jest.fn();

jest.mock('@/lib/ai-provider-lmstudio', () => ({
  checkLMStudio: (...args: unknown[]) => mockCheckLMStudio(...args),
  executeWithLMStudio: (...args: unknown[]) => mockExecuteWithLMStudio(...args),
  getLMStudioApiKey: () => '',
}));

jest.mock('@/lib/ai-provider-openclaw', () => ({
  checkOpenClaw: (...args: unknown[]) => mockCheckOpenClaw(...args),
  executeWithOpenClaw: (...args: unknown[]) => mockExecuteWithOpenClaw(...args),
}));

jest.mock('@/lib/ai-provider-bailian', () => ({
  checkBailian: (...args: unknown[]) => mockCheckBailian(...args),
  executeWithBailian: (...args: unknown[]) => mockExecuteWithBailian(...args),
}));

jest.mock('@/lib/ai-provider-openrouter', () => ({
  checkOpenRouter: (...args: unknown[]) => mockCheckOpenRouter(...args),
  executeWithOpenRouter: (...args: unknown[]) => mockExecuteWithOpenRouter(...args),
}));

jest.mock('@/lib/ai-provider-minimax', () => ({
  checkMiniMax: (...args: unknown[]) => mockCheckMiniMax(...args),
  executeWithMiniMax: (...args: unknown[]) => mockExecuteWithMiniMax(...args),
}));

jest.mock('@/lib/ai-provider-hermes', () => ({
  checkHermes: (...args: unknown[]) => mockCheckHermes(...args),
  executeWithHermes: (...args: unknown[]) => mockExecuteWithHermes(...args),
}));

import {
  detectAvailableProviders,
  executeAIWithFallback,
} from '@/lib/ai-provider-detection';

type LMStudioModule = typeof import('@/lib/ai-provider-lmstudio');
const realLMStudio = jest.requireActual('@/lib/ai-provider-lmstudio') as LMStudioModule;

describe('LM Studio local-model regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NETLIFY;
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    // This suite exercises the unlocked fallback chain (incl. cloud
    // providers); the local-only lock has its own coverage elsewhere.
    process.env.CANNAAI_ALLOW_CLOUD_AI = 'true';

    mockCheckOpenClaw.mockResolvedValue({ available: false, isAvailable: false });
    mockCheckBailian.mockResolvedValue({ available: false, isAvailable: false });
    mockCheckOpenRouter.mockResolvedValue({ available: false, isAvailable: false });
    mockCheckMiniMax.mockResolvedValue({ available: false, isAvailable: false });
    mockCheckHermes.mockResolvedValue({ available: false, isAvailable: false });
    mockExecuteWithOpenClaw.mockRejectedValue(new Error('OpenClaw unavailable'));
    mockExecuteWithBailian.mockRejectedValue(new Error('Bailian unavailable'));
    mockExecuteWithOpenRouter.mockRejectedValue(new Error('OpenRouter unavailable'));
    mockExecuteWithMiniMax.mockRejectedValue(new Error('MiniMax unavailable'));
    mockExecuteWithHermes.mockRejectedValue(new Error('Hermes unavailable'));
  });

  afterAll(() => {
    delete process.env.CANNAAI_ALLOW_CLOUD_AI;
  });

  test('provider detection waits for the LM Studio health check instead of racing an AbortSignal object', async () => {
    mockCheckLMStudio.mockResolvedValue({
      available: true,
      isAvailable: true,
      provider: 'lm-studio',
      reason: 'LM Studio is running',
    });

    const result = await detectAvailableProviders();

    expect(result.primary.provider).toBe('lmstudio');
    expect(result.primary.isAvailable).toBe(true);
  });

  test('fallback accepts a successful plain-string LM Studio completion', async () => {
    mockExecuteWithLMStudio.mockResolvedValue('local model answer');

    const result = await executeAIWithFallback(
      [{ role: 'user', content: 'How does this plant look?' }],
      { model: 'ornith-1.5-35b-a3b' },
    );

    expect(result).toEqual(expect.objectContaining({
      success: true,
      provider: 'lmstudio',
      result: 'local model answer',
      content: 'local model answer',
      model: 'ornith-1.5-35b-a3b',
    }));
    expect(mockExecuteWithOpenClaw).not.toHaveBeenCalled();
  });

  test('fallback honors a requested primary provider instead of always trying LM Studio first', async () => {
    mockExecuteWithOpenRouter.mockResolvedValue({
      success: true,
      provider: 'openrouter',
      result: 'preferred provider answer',
    });

    const result = await executeAIWithFallback(
      [{ role: 'user', content: 'Use my selected provider' }],
      { primaryProvider: 'openrouter' },
    );

    expect(result).toEqual(expect.objectContaining({
      success: true,
      provider: 'openrouter',
      result: 'preferred provider answer',
    }));
    expect(mockExecuteWithOpenRouter).toHaveBeenCalledTimes(1);
    expect(mockExecuteWithLMStudio).not.toHaveBeenCalled();
  });

  test('LM Studio is available with a downloaded JIT-loadable chat model even when no instance is preloaded', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/models')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              {
                key: 'qwen/qwen3.5-9b',
                type: 'llm',
                loaded_instances: [],
                capabilities: {
                  vision: false,
                  trained_for_tool_use: true,
                },
              },
            ],
          }),
        } as Response;
      }
      if (url.endsWith('/v1/models')) {
        return { ok: true, json: async () => ({ data: [] }) } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const result = await realLMStudio.checkLMStudio(true, 'http://localhost:1234/api/v1');

    expect(result.available).toBe(true);
    expect(result.isAvailable).toBe(true);
    expect(result.models).toContain('qwen/qwen3.5-9b');
    expect(fetchMock.mock.calls.some(([input]) => String(input) === 'http://localhost:1234/v1/models')).toBe(true);
    fetchMock.mockRestore();
  });

  test('LM Studio preserves image messages for OpenAI-compatible multimodal models', async () => {
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

    await realLMStudio.executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this leaf' }],
      { image: 'data:image/jpeg;base64,abc123', useVision: true, baseUrl: 'http://localhost:1234' },
    );

    const completion = fetchMock.mock.calls[2];
    const body = JSON.parse(String((completion[1] as RequestInit).body));
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this leaf' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,abc123' },
      },
    ]);
  });

  test('LM Studio does not select a reranker when a chat model is available', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [
          { id: 'qwen3-reranker-0.6b' },
          { id: 'chat-model' },
        ] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'chat answer' } }] }),
      } as Response);

    const result = await realLMStudio.executeWithLMStudio(
      [{ role: 'user', content: 'hello' }],
      { baseUrl: 'http://localhost:2234' },
    );

    expect(result).toBe('chat answer');
    const completion = fetchMock.mock.calls[1];
    const body = JSON.parse(String((completion[1] as RequestInit).body));
    expect(body.model).toBe('chat-model');
  });

  test('LM Studio accepts an arbitrarily named model when native metadata reports vision support', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'ornith-1.5-35b-a3b', object: 'model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{
            key: 'ornith-1.5-35b-a3b',
            type: 'llm',
            loaded_instances: [{ id: 'ornith-1.5-35b-a3b' }],
            capabilities: { vision: true },
          }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'ornith-1.5-35b-a3b',
          choices: [{ message: { role: 'assistant', content: 'The plant appears healthy.' } }],
        }),
      } as Response);

    const result = await realLMStudio.executeWithLMStudio(
      [{ role: 'user', content: 'Inspect this plant' }],
      { model: 'ornith-1.5-35b-a3b', image: 'ZmFrZS1pbWFnZQ==', baseUrl: 'http://localhost:3234' },
    );

    expect(result).toBe('The plant appears healthy.');
    const request = fetchMock.mock.calls[2][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('ornith-1.5-35b-a3b');
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this plant' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==' } },
    ]);
  });

  test('LM Studio forwards an explicit custom model omitted from both catalogs', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'custom-jit-model',
          choices: [{ message: { role: 'assistant', content: 'Custom model answer.' } }],
        }),
      } as Response);

    const result = await realLMStudio.executeWithLMStudio(
      [{ role: 'user', content: 'Use the explicitly selected model.' }],
      { model: 'custom-jit-model', baseUrl: 'http://localhost:4234' },
    );

    expect(result).toBe('Custom model answer.');
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.model).toBe('custom-jit-model');
    // An explicit text model is authoritative: no catalog discovery happens.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('legacy LM Studio vision adapter forwards an explicit unknown JIT model', async () => {
    // Vision resolution ignores caller baseUrl and always uses the
    // deployment endpoint, whose catalog cache is shared with the earlier
    // vision test in this file. Re-require a fresh module for an empty
    // cache so this test's catalog is the one under test.
    jest.resetModules();
    const freshLMStudio = jest.requireActual('@/lib/ai-provider-lmstudio') as LMStudioModule;
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'another-model', object: 'model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'another-model', capabilities: { vision: false } }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'JIT vision answer.' } }],
        }),
      } as Response);

    await expect(freshLMStudio.executeWithLMStudio(
      [{ role: 'user', content: 'Describe this image.' }],
      { model: 'custom-jit-vision-model', image: 'ZmFrZS1pbWFnZQ==', baseUrl: 'http://localhost:5234' },
    )).resolves.toBe('JIT vision answer.');

    const requestBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(requestBody.model).toBe('custom-jit-vision-model');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
