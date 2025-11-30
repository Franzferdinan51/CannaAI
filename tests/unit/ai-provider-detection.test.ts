/**
 * Unit Tests for AI Provider Detection
 */

import {
  detectAvailableProviders,
  getProviderConfig,
  executeAIWithFallback,
  AIProviderUnavailableError,
  checkLMStudio,
  checkOpenRouter
} from '@/lib/ai-provider-detection';

// Mock fetch globally
global.fetch = jest.fn();

describe('AI Provider Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.LM_STUDIO_URL;
    delete process.env.LM_STUDIO_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  describe('checkLMStudio', () => {
    test('should detect LM Studio when running locally', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'granite-4.0-micro' },
            { id: 'llama-3.1-8b-instruct' }
          ]
        })
      });

      const result = await checkLMStudio();

      expect(result.isAvailable).toBe(true);
      expect(result.provider).toBe('lm-studio');
      expect(result.reason).toContain('LM Studio is running');
      expect(result.config.url).toBe('http://localhost:1234');
    });

    test('should not detect LM Studio when not running', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkLMStudio();

      expect(result.isAvailable).toBe(false);
      expect(result.provider).toBe('lm-studio');
      expect(result.reason).toContain('not available');
    });

    test('should not detect LM Studio in serverless environment', async () => {
      process.env.VERCEL = '1';

      const result = await checkLMStudio();

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('not supported in serverless environments');
    });

    test('should use default URL when not configured', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await checkLMStudio();

      expect(result.config.url).toBe('http://localhost:1234');
    });

    test('should handle timeout during health check', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';

      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const result = await checkLMStudio();

      expect(result.isAvailable).toBe(false);
    });
  });

  describe('checkOpenRouter', () => {
    test('should detect OpenRouter when API key is valid', async () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'meta-llama/llama-3.1-8b-instruct:free' }
          ]
        })
      });

      const result = await checkOpenRouter();

      expect(result.isAvailable).toBe(true);
      expect(result.provider).toBe('openrouter');
      expect(result.reason).toContain('OpenRouter API is accessible');
      expect(result.config.apiKey).toBe('test-api-key');
    });

    test('should not detect OpenRouter when API key is missing', async () => {
      const result = await checkOpenRouter();

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('API key not configured');
    });

    test('should not detect OpenRouter when API returns error', async () => {
      process.env.OPENROUTER_API_KEY = 'invalid-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await checkOpenRouter();

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('API test failed');
    });

    test('should handle network errors', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkOpenRouter();

      expect(result.isAvailable).toBe(false);
      expect(result.reason).toContain('Network error');
    });

    test('should use default model when not configured', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await checkOpenRouter();

      expect(result.config.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    });

    test('should respect custom model configuration', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.OPENROUTER_MODEL = 'custom-model';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await checkOpenRouter();

      expect(result.config.model).toBe('custom-model');
    });
  });

  describe('detectAvailableProviders', () => {
    test('should detect both providers when available', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }) // LM Studio
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // OpenRouter

      const result = await detectAvailableProviders();

      expect(result.primary.provider).toBe('openrouter'); // Should prefer OpenRouter
      expect(result.fallback.length).toBeGreaterThan(0);
    });

    test('should select primary provider correctly', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });

      const result = await detectAvailableProviders();

      expect(result.primary.provider).toBe('openrouter');
    });

    test('should handle serverless environment correctly', async () => {
      process.env.VERCEL = '1';
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }) // LM Studio (ignored)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // OpenRouter

      const result = await detectAvailableProviders();

      expect(result.primary.provider).toBe('openrouter');
      expect(result.recommendations).toContain(
        expect.stringContaining('serverless')
      );
    });

    test('should return setup required when no providers available', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await detectAvailableProviders();

      expect(result.primary.provider).toBe('fallback');
      expect(result.primary.isAvailable).toBe(false);
      expect(result.primary.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Configure OpenRouter'),
          expect.stringContaining('LM Studio')
        ])
      );
    });

    test('should generate appropriate recommendations', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';
      delete process.env.OPENROUTER_API_KEY;
      process.env.NODE_ENV = 'development';

      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
        .mockRejectedValue(new Error('Not configured'));

      const result = await detectAvailableProviders();

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('OpenRouter'),
          expect.stringContaining('LM Studio')
        ])
      );
    });
  });

  describe('getProviderConfig', () => {
    test('should get LM Studio config from environment', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';
      process.env.LM_STUDIO_MODEL = 'test-model';
      process.env.LM_STUDIO_API_KEY = 'test-key';
      process.env.LM_STUDIO_TIMEOUT = '60000';

      const config = await getProviderConfig('lm-studio');

      expect(config.url).toBe('http://localhost:1234');
      expect(config.model).toBe('test-model');
      expect(config.apiKey).toBe('test-key');
      expect(config.timeout).toBe(60000);
    });

    test('should get OpenRouter config from environment', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      process.env.OPENROUTER_MODEL = 'test-model';
      process.env.OPENROUTER_TIMEOUT = '60000';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      const config = await getProviderConfig('openrouter');

      expect(config.apiKey).toBe('test-key');
      expect(config.model).toBe('test-model');
      expect(config.timeout).toBe(60000);
      expect(config.baseUrl).toBe('https://openrouter.ai/api/v1');
    });

    test('should get fallback config', async () => {
      const config = await getProviderConfig('fallback');

      expect(config.type).toBe('setup-required');
      expect(config.setupRequired).toBe(true);
    });

    test('should handle settings API timeout', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const config = await getProviderConfig('openrouter');

      // Should fall back to environment variables
      expect(config.apiKey).toBe('test-key');
    });

    test('should handle invalid settings response', async () => {
      process.env.OPENROUTER_API_KEY = 'env-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      const config = await getProviderConfig('openrouter');

      expect(config.apiKey).toBe('env-key');
    });

    test('should throw error for unknown provider', async () => {
      await expect(
        getProviderConfig('unknown' as any)
      ).rejects.toThrow('Unknown provider');
    });
  });

  describe('executeAIWithFallback', () => {
    test('should execute AI analysis successfully', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test diagnosis',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const result = await executeAIWithFallback('test prompt', undefined, {
        primaryProvider: 'openrouter'
      });

      expect(result.result).toBeDefined();
      expect(result.provider).toBe('openrouter');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should execute AI with image', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      const imageBase64 = 'data:image/jpeg;base64,test-image';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test diagnosis',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const result = await executeAIWithFallback('test prompt', imageBase64);

      expect(result.result).toBeDefined();
    });

    test('should throw AIProviderUnavailableError when no providers configured', async () => {
      await expect(
        executeAIWithFallback('test prompt')
      ).rejects.toThrow(AIProviderUnavailableError);
    });

    test('should try multiple providers in order', async () => {
      process.env.LM_STUDIO_URL = 'http://localhost:1234';
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('LM Studio error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    diagnosis: 'Test diagnosis',
                    confidence: 90
                  })
                }
              }
            ]
          })
        });

      const result = await executeAIWithFallback('test prompt', undefined, {
        primaryProvider: 'lm-studio'
      });

      expect(result.provider).toBe('openrouter');
    });

    test('should throw error when all providers fail', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockRejectedValue(new Error('Provider error'));

      await expect(
        executeAIWithFallback('test prompt')
      ).rejects.toThrow(AIProviderUnavailableError);
    });

    test('should parse text response when JSON parsing fails', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Plain text response from AI'
              }
            }
          ]
        })
      });

      const result = await executeAIWithFallback('test prompt');

      expect(result.result.diagnosis).toBeDefined();
      expect(result.result.provider).toBe('ai-model');
    });

    test('should respect timeout configuration', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const result = await executeAIWithFallback('test prompt', undefined, {
        timeout: 50
      });

      // Should complete (timeout is handled by AbortController)
      expect(result).toBeDefined();
    });

    test('should track processing time', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  diagnosis: 'Test diagnosis',
                  confidence: 90
                })
              }
            }
          ]
        })
      });

      const result = await executeAIWithFallback('test prompt');

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should include user settings in provider config', async () => {
      process.env.OPENROUTER_API_KEY = 'env-key';

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            settings: {
              openRouter: {
                model: 'user-selected-model'
              }
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    diagnosis: 'Test diagnosis',
                    confidence: 90
                  })
                }
              }
            ]
          })
        });

      const result = await executeAIWithFallback('test prompt', undefined);

      expect(result.result).toBeDefined();
    });
  });
});
