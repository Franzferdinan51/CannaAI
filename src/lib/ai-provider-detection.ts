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
import { checkMiniMax, executeWithMiniMax } from './ai-provider-minimax';

// Re-export provider checkers so consumers (tests, /api/providers) can import them from this module
export { checkLMStudio } from './ai-provider-lmstudio';
export { checkOpenRouter } from './ai-provider-openrouter';
export { checkMiniMax } from './ai-provider-minimax';
export { checkOpenClaw } from './ai-provider-openclaw';
export { checkBailian } from './ai-provider-bailian';

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
  const withSignal = <T>(p: Promise<T>, ms: number, name: string) =>
    p.then(r => {
      // Support both 'isAvailable' (capital I) and 'available' (lowercase) from different providers
      const isAvail = typeof r === 'boolean' ? r : Boolean((r as any)?.isAvailable ?? (r as any)?.available);
      console.log(`[withSignal][${name}] resolved isAvailable=${isAvail}`, typeof r === 'object' ? JSON.stringify((r as any)) : r);
      return { r, isAvailable: isAvail };
    })
     .catch((e: any) => {
      console.log(`[withSignal][${name}] rejected: type=${typeof e}, message=${e?.message}, name=${e?.name}, code=${e?.code}`);
      return { r: false as any, isAvailable: false };
    });

  // Run fast checks in parallel with short timeouts
  // MiniMax and OpenRouter have their OWN internal timeouts (15s) so no AbortSignal race needed
  const [lmstudio, openclaw, bailian] = await Promise.all([
    withSignal(Promise.race([checkLMStudio(), AbortSignal.timeout(3000)]), 3000, 'lmstudio'),
    withSignal(Promise.race([checkOpenClaw(), AbortSignal.timeout(3000)]), 3000, 'openclaw'),
    withSignal(Promise.race([checkBailian(), AbortSignal.timeout(10000)]), 10000, 'bailian'),
  ]);

  // Run slow checks (MiniMax, OpenRouter) WITHOUT race timeout - they manage their own
  // This prevents the race from killing them before they respond
  const [openrouter, minimax] = await Promise.all([
    withSignal(checkOpenRouter(), 20000, 'openrouter'),
    withSignal(checkMiniMax(), 20000, 'minimax'),
  ]);

  const results = [
    { provider: 'lmstudio',  isAvailable: lmstudio.isAvailable,  reason: lmstudio.isAvailable  ? 'connected' : 'not reachable', data: lmstudio.r },
    { provider: 'openclaw',   isAvailable: openclaw.isAvailable,   reason: openclaw.isAvailable   ? (openclaw.r as any)?.reason   || 'connected' : 'not reachable', data: openclaw.r },
    { provider: 'bailian',   isAvailable: bailian.isAvailable,   reason: bailian.isAvailable   ? (bailian.r as any)?.reason   || 'connected' : 'not configured', data: bailian.r },
    { provider: 'openrouter',isAvailable: openrouter.isAvailable, reason: openrouter.isAvailable ? (openrouter.r as any)?.reason || 'connected' : 'not reachable', data: openrouter.r },
    { provider: 'minimax',   isAvailable: minimax.isAvailable,   reason: minimax.isAvailable   ? (minimax.r as any)?.reason   || 'connected' : 'not configured', data: minimax.r },
  ];

  const available = results.filter(r => r.isAvailable);
  const primary  = available[0] || { provider: 'fallback', isAvailable: false, reason: 'no providers available' };

  console.log('[Detection] Available:', available.map(a => a.provider).join(', ') || 'none');
  console.log('[Detection] Primary:', primary.provider, 'isAvailable:', primary.isAvailable);

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
    case 'openrouter':
      return {
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '60000'),
      };
    case 'minimax':
      return {
        baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
        apiKey: process.env.MINIMAX_API_KEY || '',
        model: process.env.MINIMAX_MODEL || 'MiniMax-M3',
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
    { name: 'minimax', fn: () => executeWithMiniMax(messages, options) },
    {
      name: 'bailian',
      fn: () => executeWithBailian({
        prompt: Array.isArray(messages)
          ? messages.map((m: any) => typeof m.content === 'string' ? m.content : '').filter(Boolean).join('\n')
          : String(messages || ''),
        image: options?.image,
        model: options?.model,
        temperature: options?.temperature,
      }),
    },
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
