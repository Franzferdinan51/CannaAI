/**
 * AI Provider Configuration Endpoint
 * Returns available providers and allows configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkLMStudio, detectAvailableProviders } from '@/lib/ai-provider-detection';

/**
 * Static capability metadata per provider. Detection reports availability;
 * capabilities don't change at runtime, so they live here instead of a
 * second registry that can drift out of sync.
 */
function providerEntryFromDetection(p: { provider: string; isAvailable: boolean; reason: string }) {
  const name = p.provider;
  const isLocal = name === 'lmstudio' || name === 'openclaw' || name === 'hermes';
  const isVision = name === 'lmstudio' || name === 'openclaw' || name === 'hermes' || name === 'minimax' || name === 'bailian' || name === 'openrouter';
  // Agent runtimes are tool-aware; plain model APIs are not.
  const functionCalling = name === 'openclaw' || name === 'hermes';
  return {
    name,
    model: name === 'minimax' ? (process.env.MINIMAX_MODEL || 'MiniMax-M3') : '',
    capabilities: {
      text: true,
      vision: isVision,
      streaming: false,
      functionCalling,
      jsonMode: true,
      maxTokens: name === 'minimax' ? 1024 : 4096,
      contextWindow: 8192,
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
    _local: isLocal,
  };
}

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
    // Single provider system: everything comes from live detection now.
    // (The old unified-ai registry was removed; see git history.)
    let liveProviders: Array<{ provider: string; isAvailable: boolean; reason: string }> = [];
    try {
      const configuredBaseUrl = request.nextUrl.searchParams.get('baseUrl')?.trim() || undefined;
      const detected = await withProviderDetectionTimeout(
        detectAvailableProviders({ fastLocal: true, lmStudioBaseUrl: configuredBaseUrl }),
        10000,
      );
      liveProviders = (detected?.all || [])
        .filter((r: any) => r.provider && r.provider !== 'fallback')
        .map((r: any) => ({
          provider: r.provider,
          isAvailable: !!r.isAvailable,
          reason: r.reason || (r.isAvailable ? 'connected' : 'unavailable'),
        }));
    } catch (detectionError) {
      console.warn('[providers] live detection failed:', detectionError);
    }
    const liveByName = new Map(liveProviders.map((p) => [p.provider, p]));

    // Build the provider list from detection results with static capability
    // metadata per provider (detection reports availability, not capabilities).
    const providerStatus = liveProviders.map((p) => providerEntryFromDetection(p));

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
          .sort((a, b) => a.health.latency - b.health.latency)[0]?.name || 'lmstudio'
      },
      'cost-effective': {
        description: 'Low-cost or free inference for budget-conscious users',
        recommended: ['lmstudio', 'openclaw', 'hermes'],
        primary: 'lmstudio'
      },
      'high-quality': {
        description: 'Premium quality responses with advanced reasoning',
        recommended: providerStatus
          .filter(p => p.name === 'openclaw' || p.name === 'hermes')
          .map(p => p.name),
        primary: 'openclaw'
      },
      'research': {
        description: 'Research-focused with web browsing and citations',
        recommended: ['openclaw', 'hermes'],
        primary: 'openclaw'
      }
    };

    // Environment-specific recommendations
    const environment = {
      isServerless: !!process.env.NETLIFY || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      isDevelopment: process.env.NODE_ENV === 'development',
      platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Dedicated Server'
    };

    const environmentRecommendations = generateEnvironmentRecommendations(environment);

    // The provider list IS the detection result now (single system).
    const mergedProviders = providerStatus;

    const mergedProviderView = (p: any) => {
      const live = liveByName.get(p.name);
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

/**
 * Test one provider from the legacy Settings panel. That panel historically
 * POSTed to this route, but only GET was implemented, producing a 405/network
 * error even when LM Studio itself was healthy.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'test') {
      return NextResponse.json({ success: false, error: 'Unsupported provider action' }, { status: 400 });
    }

    const rawProvider = typeof body.providerId === 'string' ? body.providerId.trim().toLowerCase() : '';
    const providerId = rawProvider.replace(/[-_]/g, '') === 'lmstudio' ? 'lmstudio' : rawProvider;
    const configuredBaseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim()
      ? body.baseUrl.trim()
      : undefined;

    if (providerId === 'lmstudio') {
      const result = await withProviderDetectionTimeout(checkLMStudio(true, configuredBaseUrl), 10000);
      const success = Boolean(result?.isAvailable);
      return NextResponse.json({
        success,
        provider: 'lmstudio',
        model: typeof body.modelId === 'string' && body.modelId.trim()
          ? body.modelId.trim()
          : result?.models?.[0],
        message: success ? 'LM Studio connection successful' : result?.reason || 'LM Studio is unavailable',
        details: result,
      }, { status: success ? 200 : 503 });
    }

    const detected = await withProviderDetectionTimeout(detectAvailableProviders({ fastLocal: true }), 10000);
    const provider = detected?.all?.find((entry: any) => {
      const name = String(entry?.provider || '').toLowerCase().replace(/[-_]/g, '');
      return name === providerId.replace(/[-_]/g, '');
    });
    const success = Boolean(provider?.isAvailable);
    return NextResponse.json({
      success,
      provider: providerId,
      model: body.modelId,
      message: success ? `${providerId} connection successful` : provider?.reason || `${providerId} is unavailable`,
      details: provider,
    }, { status: success ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Provider test failed',
    }, { status: 500 });
  }
}

function getApiKeyStatus(provider: string): boolean {
  const keys: Record<string, string> = {
    openrouter: process.env.OPENROUTER_API_KEY || '',
    lmstudio: process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL || '',
    openclaw: process.env.OPENCLAW_AGENT_COMMAND || '',
    hermes: process.env.HERMES_API_KEY || process.env.HERMES_API_SERVER_KEY || process.env.HERMES_AGENT_COMMAND || '',
    minimax: process.env.MINIMAX_API_KEY || '',
    bailian: process.env.BAILIAN_API_KEY || '',
  };

  return !!keys[provider];
}

function getEnvironmentVars(provider: string): string[] {
  const vars: Record<string, string[]> = {
    openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'],
    lmstudio: ['LM_STUDIO_BASE_URL', 'LM_STUDIO_API_KEY', 'LM_STUDIO_MODEL'],
    openclaw: ['OPENCLAW_AGENT_COMMAND', 'OPENCLAW_MODEL'],
    hermes: ['HERMES_API_URL', 'HERMES_API_KEY', 'HERMES_MODEL', 'HERMES_AGENT_COMMAND'],
    minimax: ['MINIMAX_API_KEY', 'MINIMAX_BASE_URL', 'MINIMAX_MODEL'],
    bailian: ['BAILIAN_API_KEY', 'BAILIAN_MODEL'],
  };

  return vars[provider] || [];
}

function generateEnvironmentRecommendations(environment: any): string[] {
  const recommendations: string[] = [];

  if (environment.isServerless) {
    recommendations.push(
      'Serverless environment detected. LM Studio will not work here. Use cloud providers like OpenRouter or MiniMax.'
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
        'Test connection at /api/health-check'
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
        'Test connection at /api/health-check'
      ]
    },
    {
      title: 'Agent Providers - OpenClaw & Hermes',
      steps: [
        'Install OpenClaw or run the Hermes agent API server',
        'Set OPENCLAW_AGENT_COMMAND or HERMES_API_URL + HERMES_API_KEY',
        'Agent providers give tool-aware chat and image analysis',
        'Test connection at /api/health-check'
      ]
    },
    {
      title: 'Multiple Providers',
      steps: [
        'Configure multiple providers for load balancing',
        'System will automatically select best provider',
        'View provider health at /api/health-check'
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
    LM_STUDIO_BASE_URL: {
      description: 'LM Studio OpenAI-compatible API endpoint',
      required: false,
      example: 'http://127.0.0.1:1234/v1'
    },
    LM_STUDIO_MODEL: {
      description: 'Default LM Studio model',
      required: false,
      example: 'granite-4.0-micro'
    },
    OPENCLAW_AGENT_COMMAND: {
      description: 'OpenClaw agent command for tool-aware chat',
      required: false,
      example: 'openclaw'
    },
    HERMES_API_URL: {
      description: 'Hermes agent API server endpoint',
      required: false,
      example: 'http://127.0.0.1:8642/v1'
    },
    HERMES_API_KEY: {
      description: 'Hermes agent API key',
      required: false,
      example: '...'
    },
    MINIMAX_API_KEY: {
      description: 'MiniMax API key',
      required: false,
      example: '...'
    },
    BAILIAN_API_KEY: {
      description: 'Alibaba Bailian API key',
      required: false,
      example: '...'
    }
  };
}
