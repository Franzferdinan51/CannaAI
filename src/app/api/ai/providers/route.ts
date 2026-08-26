/**
 * AI Provider Configuration Endpoint
 * Returns available providers and allows configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';
import { detectAvailableProviders } from '@/lib/ai-provider-detection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function withProviderDetectionTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
      timer.unref?.();
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  try {
    const unifiedAI = getUnifiedAI();
    const providerStatus = unifiedAI.getProviderStatus();

    // Also probe the live-detection chain so vision-capable providers we add
    // outside the unified registry (e.g. MiniMax) surface in the Settings UI.
    // This is non-fatal: if detection throws we still return the registry view.
    let liveProviders: Array<{ provider: string; isAvailable: boolean; reason: string }> = [];
    try {
      const detected = await withProviderDetectionTimeout(
        detectAvailableProviders({ fastLocal: true }),
        10000,
      );
      liveProviders = (detected?.all || []).map((r: any) => ({
        provider: r.provider,
        isAvailable: !!r.isAvailable,
        reason: r.reason || (r.isAvailable ? 'connected' : 'unavailable'),
      }));
    } catch (detectionError) {
      console.warn('[providers] live detection failed:', detectionError);
    }
    const liveByName = new Map(liveProviders.map((p) => [p.provider, p]));

    // Normalize registry names vs. live-detector names so the same provider
    // doesn't appear twice (the registry uses "lm-studio", the live detector
    // uses "lmstudio").
    const alias = (n: string) => (n === 'lm-studio' ? 'lmstudio' : n);
    const registryNamesAliased = new Set(providerStatus.map((p) => alias(p.name)));

    // Group by capabilities
    const capabilities = {
      text: providerStatus.filter(p => p.capabilities.text),
      vision: providerStatus.filter(p => p.capabilities.vision),
      streaming: providerStatus.filter(p => p.capabilities.streaming),
      functionCalling: providerStatus.filter(p => p.capabilities.functionCalling)
    };

    // Recommended use cases
    const useCases = {
      'plant-analysis': {
        description: 'Comprehensive plant health diagnosis with image analysis',
        recommended: capabilities.vision
          .filter(p => p.capabilities.functionCalling)
          .map(p => p.name),
        primary: capabilities.vision
          .filter(p => p.capabilities.functionCalling && p.health.status === 'healthy')
          .sort((a, b) => a.health.latency - b.health.latency)[0]?.name || 'openrouter'
      },
      'real-time-chat': {
        description: 'Fast conversational AI for chat assistant',
        recommended: capabilities.streaming
          .filter(p => p.health.status === 'healthy')
          .sort((a, b) => a.health.latency - b.health.latency)
          .slice(0, 3)
          .map(p => p.name),
        primary: capabilities.streaming
          .filter(p => p.health.status === 'healthy')
          .sort((a, b) => a.health.latency - b.health.latency)[0]?.name || 'groq'
      },
      'cost-effective': {
        description: 'Low-cost or free inference for budget-conscious users',
        recommended: ['lm-studio', 'groq', 'gemini'],
        primary: 'lm-studio'
      },
      'high-quality': {
        description: 'Premium quality responses with advanced reasoning',
        recommended: providerStatus
          .filter(p => p.name === 'claude' || p.name === 'gemini')
          .map(p => p.name),
        primary: 'claude'
      },
      'research': {
        description: 'Research-focused with web browsing and citations',
        recommended: ['perplexity', 'claude'],
        primary: 'perplexity'
      }
    };

    // Environment-specific recommendations
    const environment = {
      isServerless: !!process.env.NETLIFY || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      isDevelopment: process.env.NODE_ENV === 'development',
      platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Dedicated Server'
    };

    const environmentRecommendations = generateEnvironmentRecommendations(environment);

    // Build the merged provider list: registry entries first, then any
    // live-detected providers not already in the registry (so vision-capable
    // additions like MiniMax show up in Settings even if they bypass the
    // unified-ai pool).
    const liveOnlyProviders = liveProviders
      .filter((p) => !registryNamesAliased.has(alias(p.provider)))
      .map((p) => ({
        name: p.provider,
        model: p.provider === 'minimax' ? (process.env.MINIMAX_MODEL || 'MiniMax-M3') : '',
        capabilities: {
          text: true,
          vision: p.provider === 'minimax' || p.provider === 'lmstudio' || p.provider === 'openclaw' || p.provider === 'hermes',
          streaming: false,
          functionCalling: false,
          jsonMode: true,
          maxTokens: p.provider === 'minimax' ? 1024 : 4096,
          contextWindow: p.provider === 'minimax' ? 8192 : 8192,
          supportsBatching: false,
          realtime: false,
        },
        health: {
          status: p.isAvailable ? 'healthy' : 'unhealthy',
          latency: 0,
          successRate: 0,
          lastError: p.isAvailable ? null : p.reason,
        },
        cost: { input: 0, output: 0, currency: 'USD' },
        metrics: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, averageLatency: 0 },
      }));
    const mergedProviders = [...providerStatus, ...liveOnlyProviders];

    const mergedProviderView = (p: any) => {
      const aliasedName = alias(p.name);
      const live = liveByName.get(p.name) || liveByName.get(aliasedName);
      const isHealthy = (live?.isAvailable ?? p.health?.status === 'healthy');
      const liveReason = live?.reason;
      return {
        id: p.name,
        name: p.name,
        type: ['lmstudio', 'openclaw', 'hermes'].includes(p.name) ? 'local' : 'cloud',
        models: p.model ? [{ id: p.model, name: p.model, provider: p.name }] : [],
        config: p.capabilities,
        status: isHealthy ? 'available' : 'error',
        lastChecked: new Date().toISOString(),
        healthy: isHealthy,
        liveDetection: live
          ? { available: live.isAvailable, reason: liveReason }
          : null,
        capabilities: p.capabilities,
        performance: {
          latency: p.health?.latency ?? 0,
          successRate: p.health?.successRate ?? 0,
          throughput: p.metrics?.totalRequests ?? 0,
        },
        pricing: p.cost,
        setup: {
          hasApiKey: !!getApiKeyStatus(p.name),
          environmentVars: getEnvironmentVars(p.name),
        },
      };
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment,
      providers: mergedProviders.map(mergedProviderView),
      capabilities: {
        text: mergedProviders.filter((p) => p.capabilities.text),
        vision: mergedProviders.filter((p) => p.capabilities.vision),
        streaming: mergedProviders.filter((p) => p.capabilities.streaming),
        functionCalling: mergedProviders.filter((p) => p.capabilities.functionCalling),
      },
      useCases,
      recommendations: environmentRecommendations,
      setup: {
        guide: getSetupGuide(),
        environmentVariables: getAllEnvironmentVars(),
      },
      liveDetection: {
        primary: liveProviders.find((p) => p.isAvailable)?.provider || null,
        available: liveProviders.filter((p) => p.isAvailable).map((p) => p.provider),
      },
    });

  } catch (error) {
    console.error('Provider configuration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function getApiKeyStatus(provider: string): boolean {
  const keys: Record<string, string> = {
    openrouter: process.env.OPENROUTER_API_KEY || '',
    'lm-studio': process.env.LM_STUDIO_URL || '',
    gemini: process.env.GEMINI_API_KEY || '',
    grok: process.env.XAI_API_KEY || '',
    openclaw: process.env.OPENCLAW_AGENT_COMMAND || '',
    hermes: process.env.HERMES_API_KEY || process.env.HERMES_API_SERVER_KEY || process.env.HERMES_AGENT_COMMAND || '',
    together: process.env.TOGETHER_API_KEY || '',
    claude: process.env.ANTHROPIC_API_KEY || '',
    perplexity: process.env.PERPLEXITY_API_KEY || '',
    lmstudio: process.env.LM_STUDIO_URL || '',
    minimax: process.env.MINIMAX_API_KEY || '',
  };

  return !!keys[provider];
}

function getEnvironmentVars(provider: string): string[] {
  const vars: Record<string, string[]> = {
    openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'],
    'lm-studio': ['LM_STUDIO_URL', 'LM_STUDIO_MODEL'],
    lmstudio: ['LM_STUDIO_BASE_URL', 'LM_STUDIO_API_KEY', 'LM_STUDIO_MODEL'],
    gemini: ['GEMINI_API_KEY', 'GEMINI_MODEL'],
    grok: ['XAI_API_KEY', 'XAI_MODEL'],
    openclaw: ['OPENCLAW_AGENT_COMMAND', 'OPENCLAW_MODEL'],
    hermes: ['HERMES_API_URL', 'HERMES_API_KEY', 'HERMES_MODEL', 'HERMES_AGENT_COMMAND'],
    together: ['TOGETHER_API_KEY', 'TOGETHER_MODEL'],
    claude: ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL'],
    perplexity: ['PERPLEXITY_API_KEY', 'PERPLEXITY_MODEL'],
    minimax: ['MINIMAX_API_KEY', 'MINIMAX_BASE_URL', 'MINIMAX_MODEL'],
  };

  return vars[provider] || [];
}

function generateEnvironmentRecommendations(environment: any): string[] {
  const recommendations: string[] = [];

  if (environment.isServerless) {
    recommendations.push(
      'Serverless environment detected. LM Studio will not work here. Use cloud providers like OpenRouter, Gemini, or Groq.'
    );
    recommendations.push(
      'For production serverless deployments, OpenRouter is recommended for reliability.'
    );
  }

  if (environment.isDevelopment) {
    recommendations.push(
      'Development environment detected. LM Studio is excellent for local development with zero API costs.'
    );
    recommendations.push(
      'Configure both LM Studio (local) and OpenRouter (cloud) for comprehensive testing.'
    );
  }

  if (environment.platform === 'Vercel') {
    recommendations.push(
      'Vercel deployment detected. Consider using Vercel AI SDK for optimized performance.'
    );
  }

  return recommendations;
}

function getSetupGuide(): Array<{
  title: string;
  steps: string[];
}> {
  return [
    {
      title: 'Quick Start - OpenRouter (Recommended)',
      steps: [
        'Sign up at https://openrouter.ai/keys',
        'Get your free API key',
        'Set OPENROUTER_API_KEY environment variable',
        'Optionally set OPENROUTER_MODEL (defaults to free model)',
        'Test connection at /api/ai/health'
      ]
    },
    {
      title: 'Local Development - LM Studio',
      steps: [
        'Download LM Studio from https://lmstudio.ai',
        'Install and start LM Studio',
        'Download a compatible model (e.g., Llama 3.1 8B)',
        'Enable API server in LM Studio settings',
        'Set LM_STUDIO_URL (defaults to http://localhost:1234)',
        'Test connection at /api/ai/health'
      ]
    },
    {
      title: 'Google Gemini',
      steps: [
        'Get API key from Google AI Studio',
        'Set GEMINI_API_KEY environment variable',
        'Optionally set GEMINI_MODEL',
        'Test connection at /api/ai/health'
      ]
    },
    {
      title: 'Multiple Providers',
      steps: [
        'Configure multiple providers for load balancing',
        'System will automatically select best provider',
        'Monitor usage at /api/ai/cost',
        'View provider health at /api/ai/health'
      ]
    }
  ];
}

function getAllEnvironmentVars(): Record<string, { description: string; required: boolean; example: string }> {
  return {
    OPENROUTER_API_KEY: {
      description: 'API key for OpenRouter cloud AI service',
      required: false,
      example: 'sk-or-v1-...'
    },
    OPENROUTER_MODEL: {
      description: 'Default OpenRouter model to use',
      required: false,
      example: 'meta-llama/llama-3.1-8b-instruct:free'
    },
    LM_STUDIO_URL: {
      description: 'LM Studio API endpoint',
      required: false,
      example: 'http://localhost:1234'
    },
    LM_STUDIO_MODEL: {
      description: 'Default LM Studio model',
      required: false,
      example: 'granite-4.0-micro'
    },
    GEMINI_API_KEY: {
      description: 'Google Gemini API key',
      required: false,
      example: 'AIza...'
    },
    GEMINI_MODEL: {
      description: 'Default Gemini model',
      required: false,
      example: 'gemini-1.5-pro'
    },
    GROQ_API_KEY: {
      description: 'Groq API key for ultra-fast inference',
      required: false,
      example: 'gsk_...'
    },
    GROQ_MODEL: {
      description: 'Default Groq model',
      required: false,
      example: 'llama-3.1-70b-versatile'
    },
    TOGETHER_API_KEY: {
      description: 'Together AI API key',
      required: false,
      example: '...'
    },
    ANTHROPIC_API_KEY: {
      description: 'Anthropic Claude API key',
      required: false,
      example: 'sk-ant-...'
    },
    CLAUDE_MODEL: {
      description: 'Default Claude model',
      required: false,
      example: 'claude-3-5-sonnet-20241022'
    },
    PERPLEXITY_API_KEY: {
      description: 'Perplexity AI API key',
      required: false,
      example: 'pplx-...'
    }
  };
}
