/**
 * AI Provider Detection and Management
 *
 * Provider priority is local-first. Provider checks are deliberately isolated
 * so a slow or broken provider cannot make the whole chat path unusable.
 */

import { checkOpenClaw, executeWithOpenClaw } from './ai-provider-openclaw';
import { checkBailian, executeWithBailian } from './ai-provider-bailian';
import { checkOpenRouter, executeWithOpenRouter } from './ai-provider-openrouter';
import { executeWithLMStudio, checkLMStudio } from './ai-provider-lmstudio';
import { checkMiniMax, executeWithMiniMax } from './ai-provider-minimax';

export interface ProviderDetectionResult {
  isAvailable: boolean;
  available?: boolean;
  provider: string;
  reason: string;
  config?: Record<string, any>;
  models?: string[];
  recommendations?: string[];
  error?: string;
}

export interface AIExecutionOptions {
  model?: string;
  image?: string;
  temperature?: number;
  primaryProvider?: string;
  timeout?: number;
}

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

function normalizeProviderName(provider?: string): string | undefined {
  if (!provider) return undefined;
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'lm-studio' || normalized === 'lm_studio') return 'lmstudio';
  if (normalized === 'open-router' || normalized === 'open_router') return 'openrouter';
  return normalized;
}

/**
 * Promise timeout helper.
 *
 * AbortSignal.timeout(ms) returns an AbortSignal object immediately; it is not
 * a promise that settles after `ms`. Passing that object directly to
 * Promise.race therefore makes the race resolve immediately. Keep timeout
 * behavior explicit here instead.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${name} provider check timed out after ${ms}ms`)),
        ms,
      );
      timer.unref?.();
    });

    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getPromptFromMessages(messages: any[]): string {
  if (!Array.isArray(messages)) return String(messages || '');
  return messages
    .map((message: any) => {
      if (typeof message?.content === 'string') return message.content;
      if (Array.isArray(message?.content)) {
        return message.content
          .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
          .map((part: any) => part.text)
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

// Check all available providers.
export async function detectAvailableProviders() {
  const runCheck = async <T>(promise: Promise<T>, ms: number, name: string) => {
    try {
      const result = await withTimeout(promise, ms, name);
      // Providers in this repository historically used both keys. Normalize
      // them at this boundary instead of making every caller special-case it.
      const isAvailable = typeof result === 'boolean'
        ? result
        : Boolean((result as any)?.isAvailable ?? (result as any)?.available);
      console.log(`[provider-check][${name}] resolved isAvailable=${isAvailable}`);
      return { r: result, isAvailable };
    } catch (error: any) {
      console.log(`[provider-check][${name}] failed: ${error?.message || error}`);
      return { r: false as any, isAvailable: false };
    }
  };

  // Run local / inexpensive probes together. These timeouts are outer safety
  // rails; provider implementations may also abort their own fetch calls.
  const [lmstudio, openclaw, bailian, openrouter, minimax] = await Promise.all([
    runCheck(checkLMStudio(), 3000, 'lmstudio'),
    runCheck(checkOpenClaw(), 3000, 'openclaw'),
    runCheck(checkBailian(), 10000, 'bailian'),
    runCheck(checkOpenRouter(), 20000, 'openrouter'),
    runCheck(checkMiniMax(), 20000, 'minimax'),
  ]);

  const results = [
    {
      provider: 'lmstudio',
      isAvailable: lmstudio.isAvailable,
      reason: lmstudio.isAvailable ? (lmstudio.r as any)?.reason || 'connected' : (lmstudio.r as any)?.reason || 'not reachable',
      data: lmstudio.r,
    },
    {
      provider: 'openclaw',
      isAvailable: openclaw.isAvailable,
      reason: openclaw.isAvailable ? (openclaw.r as any)?.reason || 'connected' : (openclaw.r as any)?.reason || 'not reachable',
      data: openclaw.r,
    },
    {
      provider: 'bailian',
      isAvailable: bailian.isAvailable,
      reason: bailian.isAvailable ? (bailian.r as any)?.reason || 'connected' : (bailian.r as any)?.reason || 'not configured',
      data: bailian.r,
    },
    {
      provider: 'openrouter',
      isAvailable: openrouter.isAvailable,
      reason: openrouter.isAvailable ? (openrouter.r as any)?.reason || 'connected' : (openrouter.r as any)?.reason || 'not reachable',
      data: openrouter.r,
    },
    {
      provider: 'minimax',
      isAvailable: minimax.isAvailable,
      reason: minimax.isAvailable ? (minimax.r as any)?.reason || 'connected' : (minimax.r as any)?.reason || 'not configured',
      data: minimax.r,
    },
  ];

  const available = results.filter(result => result.isAvailable);
  const primary = available[0] || {
    provider: 'fallback',
    isAvailable: false,
    reason: 'no providers available',
  };

  console.log('[Detection] Available:', available.map(item => item.provider).join(', ') || 'none');
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

// Get provider config.
export function getProviderConfig(provider: string) {
  switch (normalizeProviderName(provider)) {
    case 'lmstudio':
      return {
        baseUrl: process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
        apiKey: process.env.LM_STUDIO_API_KEY || process.env.LM_API_TOKEN || '',
        model: process.env.LM_STUDIO_MODEL || process.env.LM_STUDIO_TEXT_MODEL || '',
        timeout: parseInt(process.env.LM_STUDIO_TIMEOUT || '120000', 10),
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
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '60000', 10),
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

// Execute AI with fallback chain (LOCAL FIRST).
export async function executeAIWithFallback(
  messages: any[],
  options: AIExecutionOptions = {},
) {
  const prompt = getPromptFromMessages(messages);
  const providers = [
    {
      name: 'lmstudio',
      fn: () => executeWithLMStudio(messages, options),
    },
    {
      name: 'openclaw',
      fn: () => executeWithOpenClaw(messages, options),
    },
    {
      name: 'minimax',
      fn: () => executeWithMiniMax(messages, options),
    },
    {
      name: 'bailian',
      fn: () => executeWithBailian({
        prompt,
        image: options.image,
        model: options.model,
        timeoutMs: options.timeout,
        temperature: options.temperature,
      }),
    },
    {
      name: 'openrouter',
      fn: () => executeWithOpenRouter({
        prompt,
        image: options.image,
        model: options.model,
        requireVision: Boolean(options.image),
      }),
    },
  ];

  const requestedPrimary = normalizeProviderName(options.primaryProvider);
  if (requestedPrimary) {
    const index = providers.findIndex(provider => provider.name === requestedPrimary);
    if (index > 0) {
      const [preferred] = providers.splice(index, 1);
      providers.unshift(preferred);
    }
  }

  const attempted: string[] = [];

  for (const provider of providers) {
    const startedAt = Date.now();
    try {
      console.log(`Trying ${provider.name}...`);
      const rawResult: any = await provider.fn();
      const content = typeof rawResult === 'string'
        ? rawResult
        : rawResult?.result ?? rawResult?.content ?? rawResult?.response;
      const hasContent = typeof content === 'string'
        ? content.trim().length > 0
        : Boolean(content && typeof content === 'object' && Object.keys(content).length > 0);

      if (rawResult?.success === false || !hasContent) {
        throw new Error(rawResult?.error || `${provider.name} returned an empty response`);
      }

      console.log(`${provider.name} succeeded`);

      if (typeof rawResult === 'string') {
        return {
          success: true,
          provider: provider.name,
          result: rawResult,
          content: rawResult,
          processingTime: Date.now() - startedAt,
        };
      }

      return {
        ...rawResult,
        success: rawResult?.success !== false,
        provider: rawResult?.provider || provider.name,
        result: content,
        content: rawResult?.content ?? content,
        processingTime: rawResult?.processingTime ?? (Date.now() - startedAt),
      };
    } catch (error: any) {
      console.log(`${provider.name} failed: ${error?.message || error}`);
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

// Simplified wrapper for chat API calls that passes a string prompt.
export async function executeChatWithFallback(
  prompt: string,
  options: AIExecutionOptions = {},
) {
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
