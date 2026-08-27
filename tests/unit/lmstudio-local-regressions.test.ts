/**
 * Regression coverage for local-model failures that previously made a healthy
 * LM Studio server look unavailable or caused successful completions to be
 * discarded by the fallback chain.
 */

import { LMStudioProvider } from '@/lib/ai-providers/lmstudio-provider';

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

class TestLMStudioProvider extends LMStudioProvider {
  normalizeForTest(request: any) {
    return this.normalizeRequest(request);
  }
}

describe('LM Studio local-model regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NETLIFY;
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;

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

    const result = await executeAIWithFallback([
      { role: 'user', content: 'How does this plant look?' },
    ]);

    expect(result).toEqual(expect.objectContaining({
      success: true,
      provider: 'lmstudio',
      result: 'local model answer',
      content: 'local model answer',
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
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
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
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 'qwen/qwen3.5-9b', object: 'model' }],
        }),
      } as Response);

    const provider = new LMStudioProvider({
      url: 'http://localhost:1234/api/v1',
      apiKey: '',
      model: '',
    });

    await expect(provider.isAvailable()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:1234/v1/models',
      expect.objectContaining({ method: 'GET' }),
    );
    fetchMock.mockRestore();
  });

  test('LM Studio preserves image messages for OpenAI-compatible multimodal models', () => {
    const provider = new TestLMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'vision-model',
    });

    const normalized = provider.normalizeForTest({
      messages: [
        {
          role: 'user',
          content: 'Inspect this leaf',
          image: 'data:image/jpeg;base64,abc123',
        },
      ],
    });

    expect(normalized.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this leaf' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,abc123' },
      },
    ]);
  });

  test('LM Studio preserves non-image data URL MIME types', () => {
    const provider = new TestLMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'vision-model',
    });

    const normalized = provider.normalizeForTest({
      messages: [{
        role: 'user',
        content: 'Inspect this capture',
        image: 'data:application/octet-stream;base64,AAECAwQ=',
      }],
    });

    expect(normalized.messages[0].content[1].image_url.url).toBe(
      'data:application/octet-stream;base64,AAECAwQ=',
    );
  });

  test('LM Studio refuses to send images to an advertised text-only model', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{
            key: 'text-only-model',
            type: 'llm',
            capabilities: { vision: false },
          }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'text-only-model' }] }),
      } as Response);

    const provider = new LMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'text-only-model',
    });

    await expect(provider.execute({
      messages: [{
        role: 'user',
        content: 'Inspect this leaf',
        image: 'data:image/jpeg;base64,abc123',
      }],
    })).rejects.toThrow('no vision-capable model');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('LM Studio accepts an arbitrarily named model when native metadata reports vision support', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
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
        json: async () => ({ data: [{ id: 'ornith-1.5-35b-a3b', object: 'model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'ornith-1.5-35b-a3b',
          choices: [{ message: { role: 'assistant', content: 'The plant appears healthy.' } }],
        }),
      } as Response);

    const provider = new LMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'ornith-1.5-35b-a3b',
    });

    const result = await provider.execute({
      messages: [{
        role: 'user',
        content: 'Inspect this plant',
        image: 'ZmFrZS1pbWFnZQ==',
      }],
    });

    expect(result.choices[0].message.content).toBe('The plant appears healthy.');
    const request = fetchMock.mock.calls[2][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe('ornith-1.5-35b-a3b');
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Inspect this plant' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==' } },
    ]);
  });

  test('LM Studio allows vision requests when native metadata omits capabilities', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'custom-local-model', type: 'llm' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'custom-local-model', object: 'model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'custom-local-model',
          choices: [{ message: { role: 'assistant', content: 'Image received.' } }],
        }),
      } as Response);

    const provider = new LMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'custom-local-model',
    });

    await expect(provider.execute({
      messages: [{ role: 'user', content: 'Describe this image', image: 'ZmFrZS1pbWFnZQ==' }],
    })).resolves.toEqual(expect.objectContaining({
      choices: [expect.objectContaining({
        message: expect.objectContaining({ content: 'Image received.' }),
      })],
    }));

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('LM Studio forwards an explicit custom model omitted from both catalogs', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ key: 'another-model', type: 'llm' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'another-model', object: 'model' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'custom-jit-model',
          choices: [{ message: { role: 'assistant', content: 'Custom model answer.' } }],
        }),
      } as Response);

    const provider = new LMStudioProvider({
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'custom-jit-model',
    });

    await expect(provider.execute({
      messages: [{ role: 'user', content: 'Use the explicitly selected model.' }],
    })).resolves.toEqual(expect.objectContaining({
      choices: [expect.objectContaining({
        message: expect.objectContaining({ content: 'Custom model answer.' }),
      })],
    }));

    const requestBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
    expect(requestBody.model).toBe('custom-jit-model');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
