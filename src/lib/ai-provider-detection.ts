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
// 3-second wall per provider – Node.js AbortSignal.timeout is more reliable than Promise.race with setTimeout
export async function detectAvailableProviders() {
  const withSignal = <T>(p: Promise<T>, ms: number) =>
    p.then(r => ({ r, isAvailable: typeof r === 'boolean' ? r : Boolean((r as any)?.isAvailable) }))
     .catch(() => ({ r: false as any, isAvailable: false }));

  const [lmstudio, openclaw, bailian, openrouter] = await Promise.all([
    withSignal(Promise.race([checkLMStudio(), AbortSignal.timeout(3000)])),
    withSignal(Promise.race([checkOpenClaw(), AbortSignal.timeout(3000)])),
    withSignal(Promise.race([checkBailian(), AbortSignal.timeout(3000)])),
    withSignal(Promise.race([checkOpenRouter(), AbortSignal.timeout(3000)])),
  ]);

  const results = [
    { provider: 'lmstudio',  isAvailable: lmstudio.isAvailable,  reason: lmstudio.isAvailable  ? 'connected' : 'not reachable', data: lmstudio.r },
    { provider: 'openclaw',   isAvailable: openclaw.isAvailable,   reason: openclaw.isAvailable   ? (openclaw.r as any)?.reason   || 'connected' : 'not reachable', data: openclaw.r },
    { provider: 'bailian',   isAvailable: bailian.isAvailable,   reason: bailian.isAvailable   ? (bailian.r as any)?.reason   || 'connected' : 'not configured', data: bailian.r },
    { provider: 'openrouter',isAvailable: openrouter.isAvailable, reason: openrouter.isAvailable ? (openrouter.r as any)?.reason || 'connected' : 'not reachable', data: openrouter.r },
  ];

  const available = results.filter(r => r.isAvailable);
  const primary  = available[0] || { provider: 'fallback', isAvailable: false, reason: 'no providers available' };

  return {
    primary,
    fallback: available.slice(1),
    all: results,
    recommendations: primary.isAvailable
      ? []
      : ['Configure an AI provider in Settings → AI Configuration'],
  };
}

// Get provider config
export function getProviderConfig(provider: string) {
  switch (provider) {
    case 'lmstudio':
      return {
        baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
        apiKey: process.env.LM_STUDIO_API_KEY || '',
        model: process.env.LM_STUDIO_MODEL || 'qwen3-vl-8b',
      };
    case 'openclaw':
      return {
        baseUrl: 'openclaw://gateway/acp',
        transport: 'acp',
        managedAuth: true,
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
      const content = result?.result;
      const hasContent = typeof content === 'string'
        ? content.trim().length > 0
        : Boolean(content && typeof content === 'object' && Object.keys(content).length > 0);
      if (result?.success === false || !hasContent) {
        throw new Error(result?.error || `${provider.name} returned an empty response`);
      }
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

// Simplified wrapper for chat API calls that passes a string prompt
export async function executeChatWithFallback(
  prompt: string,
  options: { model?: string; image?: string; temperature?: number; primaryProvider?: string } = {}
) {
  // Build messages array from prompt
  const messages = [{ role: 'user' as const, content: prompt }];
  const result = await executeAIWithFallback(messages, options);
  return {
    result: result?.result || result?.content || '',
    provider: result?.provider || 'unknown',
    processingTime: result?.processingTime || 0,
    fallbackReason: result?.fallbackReason || '',
    ...result,
  };
}
