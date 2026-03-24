/**
 * AI Provider Detection and Management
 * 
 * Provider Priority (LOCAL FIRST):
 * 1. LM Studio - Local models (FREE, PRIMARY for vision)
 * 2. OpenClaw Gateway - Local model management
 * 3. Bailian - Cloud fallback
 */

import { checkOpenClaw, executeWithOpenClaw } from './ai-provider-openclaw';
import { checkBailian, executeWithBailian } from './ai-provider-bailian';
import { checkOpenRouter } from './ai-provider-openrouter';
import { executeWithLMStudio, checkLMStudio } from './ai-provider-lmstudio';

export const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
export const isDevelopment = process.env.NODE_ENV === 'development';

export class AIProviderUnavailableError extends Error {
  public readonly recommendations: string[];
  public readonly availableProviders: string[];
  public readonly setupRequired: boolean;
  public readonly attemptedProviders?: string[];

  constructor(message: string, details: {
    recommendations: string[];
    availableProviders: string[];
    setupRequired: boolean;
    attemptedProviders?: string[];
  }) {
    super(message);
    this.name = 'AIProviderUnavailableError';
    this.recommendations = details.recommendations;
    this.availableProviders = details.availableProviders;
    this.setupRequired = details.setupRequired;
    this.attemptedProviders = details.attemptedProviders;
  }
}

// Check all available providers
export async function detectAvailableProviders() {
  const [lmstudio, openclaw, bailian, openrouter] = await Promise.all([
    checkLMStudio().catch(() => false),
    checkOpenClaw().catch(() => false),
    checkBailian().catch(() => false),
    checkOpenRouter().catch(() => false),
  ]);

  return {
    lmstudio,
    openclaw,
    bailian,
    openrouter,
  };
}

// Get provider config
export function getProviderConfig(provider: string) {
  switch (provider) {
    case 'lmstudio':
      return {
        baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://100.116.54.125:1234/v1',
        apiKey: process.env.LM_STUDIO_API_KEY || '',
        model: process.env.LM_STUDIO_MODEL || 'qwen3-vl-8b',
      };
    case 'openclaw':
      return {
        baseUrl: process.env.OPENCLAW_BASE_URL || 'http://localhost:18789',
        apiKey: process.env.OPENCLAW_API_KEY || '',
      };
    case 'bailian':
      return {
        baseUrl: process.env.BAILIAN_BASE_URL || 'https://coding-intl.dashscope.aliyuncs.com/v1',
        apiKey: process.env.BAILIAN_API_KEY || '',
        model: process.env.BAILIAN_MODEL || 'qwen-vl-max',
      };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Execute AI with fallback chain (LOCAL FIRST)
export async function executeAIWithFallback(
  messages: any[],
  options: { model?: string; image?: string; temperature?: number } = {}
) {
  const providers = [
    { name: 'lmstudio', fn: () => executeWithLMStudio(messages, options) },
    { name: 'openclaw', fn: () => executeWithOpenClaw(messages, options) },
    { name: 'bailian', fn: () => executeWithBailian(messages, options) },
  ];

  const attempted: string[] = [];
  
  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name}...`);
      const result = await provider.fn();
      console.log(`${provider.name} succeeded`);
      return result;
    } catch (error: any) {
      console.log(`${provider.name} failed: ${error.message}`);
      attempted.push(provider.name);
    }
  }

  throw new AIProviderUnavailableError('All AI providers failed', {
    recommendations: [
      'Check LM Studio is running locally',
      'Verify API keys are configured',
      'Check network connectivity',
    ],
    availableProviders: [],
    setupRequired: true,
    attemptedProviders: attempted,
  });
}
