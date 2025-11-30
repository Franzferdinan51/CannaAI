/**
 * Mock AI Provider for Testing
 */

import { mockAIResponses } from './test-utils';

export class MockAIProvider {
  private provider: 'lm-studio' | 'openrouter';
  private shouldFail: boolean;
  private responseDelay: number;

  constructor(
    provider: 'lm-studio' | 'openrouter',
    options: { shouldFail?: boolean; responseDelay?: number } = {}
  ) {
    this.provider = provider;
    this.shouldFail = options.shouldFail || false;
    this.responseDelay = options.responseDelay || 100;
  }

  async analyzeImage(prompt: string, imageBase64?: string): Promise<any> {
    await this.delay();

    if (this.shouldFail) {
      throw new Error(`${this.provider} provider error: Simulated failure`);
    }

    // Return appropriate mock response based on prompt content
    if (prompt.includes('trichome') || prompt.includes('microscopic')) {
      return mockAIResponses.trichomeAnalysis;
    }

    return mockAIResponses.plantAnalysis;
  }

  async checkHealth(): Promise<{ status: 'ok' | 'error'; message: string }> {
    await this.delay(50);

    return {
      status: this.shouldFail ? 'error' : 'ok',
      message: this.shouldFail
        ? 'Provider unavailable'
        : `${this.provider} is healthy`
    };
  }

  private delay(ms: number = this.responseDelay): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Mock provider factory
export const createMockProvider = (
  provider: 'lm-studio' | 'openrouter',
  options: { shouldFail?: boolean; responseDelay?: number } = {}
) => new MockAIProvider(provider, options);

// Mock provider manager
export class MockAIProviderManager {
  private providers: Map<'lm-studio' | 'openrouter', MockAIProvider> = new Map();

  registerProvider(
    provider: 'lm-studio' | 'openrouter',
    options: { shouldFail?: boolean; responseDelay?: number } = {}
  ) {
    this.providers.set(provider, createMockProvider(provider, options));
  }

  getProvider(provider: 'lm-studio' | 'openrouter'): MockAIProvider | undefined {
    return this.providers.get(provider);
  }

  async analyzeImage(provider: 'lm-studio' | 'openrouter', prompt: string, imageBase64?: string) {
    const mock = this.getProvider(provider);
    if (!mock) {
      throw new Error(`Provider ${provider} not registered`);
    }
    return mock.analyzeImage(prompt, imageBase64);
  }
}

// Global mock provider instances
export const globalMockProviders = {
  lmStudio: createMockProvider('lm-studio'),
  openRouter: createMockProvider('openrouter')
};

// Mock fetch for AI provider calls
export const mockAIFetch = jest.fn();

global.fetch = mockAIFetch;

mockAIFetch.mockImplementation(async (url: string, options: any) => {
  // Simulate different providers
  if (url.includes('lm-studio') || url.includes('localhost:1234')) {
    return mockLMStudioResponse(options);
  }

  if (url.includes('openrouter') || url.includes('openrouter.ai')) {
    return mockOpenRouterResponse(options);
  }

  throw new Error(`Unknown provider URL: ${url}`);
});

const mockLMStudioResponse = async (options: any) => {
  const body = JSON.parse(options.body);
  const messages = body.messages;

  // Check if it's a health check
  if (options.method === 'GET') {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: 'granite-4.0-micro', object: 'model' },
          { id: 'llama-3.1-8b-instruct', object: 'model' }
        ]
      })
    };
  }

  // Mock analysis response
  const mockResponse = mockAIResponses.plantAnalysis;

  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(mockResponse),
            role: 'assistant'
          }
        }
      ]
    })
  };
};

const mockOpenRouterResponse = async (options: any) => {
  const body = JSON.parse(options.body);
  const messages = body.messages;

  // Check if it's a model list request
  if (options.method === 'GET' || options.headers?.['HTTP-Referer']) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: 'meta-llama/llama-3.1-8b-instruct:free',
            name: 'Llama 3.1 8B Instruct',
            pricing: { prompt: 0, completion: 0 },
            top_provider: { ctx_len: 131072, modality: 'text->text' }
          }
        ]
      })
    };
  }

  // Mock analysis response
  const mockResponse = mockAIResponses.plantAnalysis;

  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(mockResponse),
            role: 'assistant'
          }
        }
      ]
    })
  };
};

// Export mock AI responses for direct use in tests
export { mockAIResponses };
