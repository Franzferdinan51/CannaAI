import { NextRequest, NextResponse } from 'next/server';
import { detectAvailableProviders, getProviderConfig, executeChatWithFallback, AIProviderUnavailableError } from '@/lib/ai-provider-detection';
import { executeWithMiniMaxStream } from '@/lib/ai-provider-minimax';
import { getChatResponseText } from '@/lib/chat-routing';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';
import { hasUsableLMStudioChatModel } from '@/lib/lmstudio-model-catalog';
import { withRequest } from '@/lib/logger';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
      timer.unref?.();
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const nativeTimeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (milliseconds: number) => AbortSignal;
  }).timeout;
  if (typeof nativeTimeout === 'function') return nativeTimeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
}

function normalizeProviderName(provider: unknown): 'lmstudio' | 'openrouter' | null {
  const value = typeof provider === 'string' ? provider.toLowerCase().replace(/[-_]/g, '') : '';
  return value === 'lmstudio' ? 'lmstudio' : value === 'openrouter' ? 'openrouter' : null;
}

function normalizeLMStudioBaseUrl(value: unknown): string {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:1234';
  return raw
    .replace(/\/(?:api\/)?v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

async function probeRequestedProvider(provider: unknown, providerSettings: any, urlOverride?: unknown): Promise<boolean> {
  const normalized = normalizeProviderName(provider);
  if (!normalized) return false;
  const config = providerSettings?.[normalized === 'lmstudio' ? 'lmStudio' : 'openRouter'] || {};
  const configuredUrl = normalized === 'lmstudio'
    ? urlOverride || config.url || 'http://localhost:1234'
    : urlOverride || config.baseUrl || 'https://openrouter.ai/api/v1';
  const baseUrl = normalized === 'lmstudio'
    ? normalizeLMStudioBaseUrl(configuredUrl)
    : String(configuredUrl).replace(/\/$/, '').replace(/\/v1$/, '');
  const headers: Record<string, string> = {};
  const apiKey = typeof config.apiKey === 'string' && config.apiKey.trim()
    ? config.apiKey.trim()
    : normalized === 'lmstudio' ? getLMStudioApiKey() : '';
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  try {
    const endpoints = normalized === 'lmstudio'
      ? [`${baseUrl}/v1/models`, `${baseUrl}/api/v1/models`]
      : [`${baseUrl}/v1/models`];
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        headers,
        signal: createTimeoutSignal(8000),
      });
      if (response.ok) {
        try {
          if (hasUsableLMStudioChatModel(await response.json())) return true;
        } catch {
          // A successful but malformed catalog is not proof that chat is usable.
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Get contextual prompt based on agentic mode
function getContextualPrompt(mode: string, context: any, sensorData: any, message: string): string {
  const baseContext = `Current page context: ${context?.title || 'CannaAI Pro'} (${context?.page || 'unknown'})
Page description: ${context?.description || 'Cannabis cultivation management system'}

Current environmental conditions:
- Temperature: ${sensorData?.temperature ? Math.round((sensorData.temperature * 9/5) + 32) : 'N/A'}°F (${sensorData?.temperature || 'N/A'}°C)
- Humidity: ${sensorData?.humidity || 'N/A'}%
- pH Level: ${sensorData?.ph || 'N/A'}
- Soil Moisture: ${sensorData?.soilMoisture || 'N/A'}%
- Light Intensity: ${sensorData?.lightIntensity || 'N/A'} μmol
- EC Level: ${sensorData?.ec || 'N/A'} mS/cm`;

  switch (mode) {
    case 'thinking':
      return `You are a deep-thinking cannabis cultivation expert. Use analytical reasoning and provide comprehensive, well-structured responses.

${baseContext}

User question: ${message}

Please provide a thorough analysis with your reasoning process clearly explained.`;

    default:
      return `You are CultivAI Assistant, an expert cannabis cultivation AI. You provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.

${baseContext}

User question: ${message}

Please provide a helpful, concise response. If the user asks about specific readings, reference the current sensor data. Consider the current page context to provide more relevant advice.`;
  }
}

export async function POST(request: NextRequest) {
  const log = withRequest(request, { route: '/api/chat' });
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Streaming is opt-in via ?stream=1 or Accept: text/event-stream. We only
  // stream when the primary provider is MiniMax — the other providers in the
  // fallback chain don't expose a streaming endpoint here, so for them we
  // keep the existing non-streaming behavior.
  const url = new URL(request.url);
  const wantsStream =
    url.searchParams.get('stream') === '1' ||
    (request.headers.get('accept') || '').includes('text/event-stream');

  // Parse body up-front so we can branch into the streaming path early.
  let earlyBody: any;
  try {
    earlyBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!earlyBody || typeof earlyBody.message !== 'string') {
    return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
  }

  // Analysis and agent clients historically used both names. Normalize at
  // the boundary so a phone/Hermes chat request cannot silently lose its
  // attached image when routed through the shared chat endpoint.
  if (!earlyBody.image && typeof earlyBody.plantImage === 'string') {
    earlyBody.image = earlyBody.plantImage;
  }

  if (earlyBody.testProvider) {
    const provider = normalizeProviderName(earlyBody.testProvider);
    const available = await probeRequestedProvider(provider, earlyBody.providerSettings, earlyBody.baseUrl);
    return NextResponse.json(
      { success: available, provider: provider || earlyBody.testProvider },
      { status: available ? 200 : 503 },
    );
  }

  // MiniMax's streaming adapter is text-only. An image-bearing request must
  // stay on the normal provider path so the vision payload is preserved;
  // silently streaming a text-only answer produces a misleading diagnosis.
  if (wantsStream && typeof earlyBody.image !== 'string') {
    return streamChatResponse({
      message: earlyBody.message,
      mode: earlyBody.mode || 'chat',
      context: earlyBody.context,
      sensorData: earlyBody.sensorData,
      log,
    });
  }

  const startTime = Date.now();

  try {
    const body = earlyBody;
    const { message, image, mode = 'chat', context, sensorData, model, baseUrl, primaryProvider, testProvider } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    console.log('💬 Chat request received, detecting AI providers...');

    // Detect available AI providers. detectAvailableProviders itself runs
    // up to 20 s (LM Studio + OpenClaw + Bailian + MiniMax + OpenRouter
    // probes in parallel), so we use a generous 25 s ceiling. The previous
    // 5 s timeout was shorter than the detection itself, which caused every
    // chat request to fall through to "provider unavailable" even when the
    // primary was healthy.
    let providerDetection;
    try {
      providerDetection = await withTimeout(
        detectAvailableProviders({
          lmStudioBaseUrl: typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : undefined,
          fastLocal: true,
        }),
        25000,
      );
    } catch {
      providerDetection = null;
    }
    if (!providerDetection) {
      providerDetection = {
        primary: { provider: 'fallback', isAvailable: false, reason: 'detection timed out' },
        all: [],
        fallback: [],
        recommendations: ['AI provider detection timed out — try again'],
      };
    }
    console.log(`📡 Primary chat provider: ${providerDetection.primary.provider} (${providerDetection.primary.reason})`);

    // Check if AI providers are available before processing
    if (!providerDetection.primary.isAvailable || providerDetection.primary.provider === 'fallback') {
      throw new AIProviderUnavailableError(
        'No AI providers are configured. Please connect an AI provider to use the chat assistant.',
        {
          recommendations: [
            'Configure OpenRouter API key for cloud-based AI chat',
            'Set up LM Studio for local development (non-serverless only)',
            'Visit Settings to configure your AI provider'
          ],
          availableProviders: [],
          setupRequired: true
        }
      );
    }

    // Get contextual prompt based on mode and current data
    const contextPrompt = getContextualPrompt(mode, context || {}, sensorData || {}, message);

    try {
      const requestedProvider = normalizeProviderName(primaryProvider);
      const detectedProvider = normalizeProviderName(providerDetection.primary.provider);
      // Local vision models—especially large reasoning models—can need several
      // minutes for their first image pass. The old fixed 45-second ceiling
      // made a healthy LM Studio instance look broken and triggered fallbacks.
      // Keep cloud/agent requests bounded while matching the dedicated local
      // vision endpoint's ten-minute limit.
      const executionTimeout = image && (requestedProvider === 'lmstudio' || detectedProvider === 'lmstudio')
        ? 600000
        : requestedProvider === 'lmstudio' || detectedProvider === 'lmstudio'
          ? 120000
          : 45000;
      const aiResult = await executeChatWithFallback(contextPrompt, {
        primaryProvider: typeof testProvider === 'string' && testProvider.trim()
          ? testProvider.trim()
          : typeof primaryProvider === 'string' && primaryProvider.trim()
          ? primaryProvider.trim()
          : providerDetection.primary.provider === 'fallback' ? undefined : providerDetection.primary.provider,
        model: typeof model === 'string' && model.trim() ? model.trim() : undefined,
        baseUrl: typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : undefined,
        image: typeof image === 'string' ? image : undefined,
        timeout: executionTimeout,
      });
      const chatResult = aiResult.result;
      const usedProvider = aiResult.provider;
      const fallbackUsed = aiResult.provider === 'fallback';
      const fallbackReason = aiResult.fallbackReason || '';
      console.log(`✅ Chat completed using ${aiResult.provider} in ${aiResult.processingTime}ms`);

      const responseText = getChatResponseText(chatResult);
      if (!responseText.trim()) {
        throw new Error(`${usedProvider || 'AI provider'} returned an empty response`);
      }

      // A provider test must validate the provider the user selected. A
      // successful fallback response is useful for chat, but would otherwise
      // make a broken OpenRouter/LM Studio connection look healthy.
      if (typeof testProvider === 'string' && testProvider.trim()) {
        const expectedProvider = testProvider.trim().toLowerCase().replace('-', '').replace('_', '');
        if (usedProvider !== expectedProvider) {
          return NextResponse.json({
            success: false,
            error: `The requested provider is unavailable; response came from ${usedProvider}.`,
            provider: usedProvider,
            fallback: { used: true, reason: `Requested ${testProvider}, used ${usedProvider}` },
          }, { status: 503 });
        }
      }

      const totalTime = Date.now() - startTime;
      const chatMetadata = chatResult && typeof chatResult === 'object' ? chatResult : {};

      return NextResponse.json({
        success: true,
        response: responseText,
        // Legacy local adapters may return a plain string. Preserve the
        // request-selected model so diagnostics never report an unknown model
        // after successful local inference.
        model: aiResult.model || chatMetadata.model || model || 'unknown',
        provider: usedProvider,
        usage: chatMetadata.usage,
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        mode: mode,
        buildMode: 'server',
        fallback: {
          used: fallbackUsed,
          reason: fallbackReason,
          recommendations: providerDetection.recommendations
        },
        providerInfo: {
          primary: providerDetection.primary.provider,
          available: [
            providerDetection.primary.isAvailable ? providerDetection.primary.provider : null,
            ...providerDetection.fallback.filter(f => f.isAvailable).map(f => f.provider)
          ].filter(Boolean)
        },
      });

    } catch (innerError) {
      // Handle specific AI execution errors
      console.error('AI execution error:', innerError);
      throw innerError; // Re-throw to be handled by outer catch
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;

    // Handle AI provider unavailability specifically
    if (error instanceof AIProviderUnavailableError) {
      console.error('❌ AI provider unavailable for chat:', error.message);

      return NextResponse.json({
        success: false,
        error: {
          type: 'ai_provider_unavailable',
          message: 'AI Provider Required',
          userMessage: 'An AI provider is required for the chat assistant. Please configure an AI provider in Settings.',
          details: error.message,
          recommendations: error.recommendations,
          setupRequired: error.setupRequired,
          timestamp: new Date().toISOString(),
          processingTime: `${totalTime}ms`,
          buildMode: 'server'
        },
        setupGuide: {
          title: 'Configure AI Provider for Chat',
          steps: [
            'Go to Settings → AI Configuration',
            'Configure OpenRouter API key (recommended for production)',
            'Or set up LM Studio for local development',
            'Test connection and return to chat'
          ],
          helpText: 'AI chat assistant requires an active AI provider connection. Fallback responses have been removed to ensure quality.'
        }
      }, { status: 503 }); // Service Unavailable
    }

    console.error('Chat API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${totalTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        buildMode: 'server'
      },
      { status: 500 }
    );
  }
}

/**
 * Streaming chat response.
 *
 * Wraps MiniMax's SSE stream in a Next.js Response whose body is a
 * ReadableStream. The wire format is `text/event-stream` with these event
 * types:
 *   - event: meta    data: {provider, model, requestId, timestamp}
 *   - event: token   data: {delta, prefix}
 *   - event: done    data: {full, finishReason, totalTimeMs}
 *   - event: error   data: {message}
 *
 * Aborting the upstream request: Next.js exposes `request.signal`; when the
 * client disconnects mid-stream we forward that signal to the upstream fetch
 * so we don't keep burning tokens after the user navigates away.
 */
async function streamChatResponse(args: {
  message: string;
  mode: string;
  context: any;
  sensorData: any;
  log: {
    info: (...values: unknown[]) => void;
    warn: (...values: unknown[]) => void;
    error: (...values: unknown[]) => void;
  };
}): Promise<Response> {
  const { message, mode, context, sensorData, log } = args;

  // Build the same prompt the non-streaming path uses, so the two responses
  // are semantically equivalent when the model would have answered the same.
  const prompt = getContextualPrompt(mode, context || {}, sensorData || {}, message);
  const messages = [{ role: 'user' as const, content: prompt }];

  // Provider detection: only stream when MiniMax is actually available.
  // For everything else we tell the client via a single SSE error event and
  // close, so the client knows to retry the non-streaming endpoint.
  let providerDetection: any;
  try {
    providerDetection = await withTimeout(detectAvailableProviders(), 25000);
  } catch {
    providerDetection = null;
  }
  const primary = providerDetection?.primary?.provider;
  if (primary !== 'minimax') {
    const enc = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ message: `Streaming is only available with the MiniMax provider; primary is "${primary ?? 'unknown'}". Retry the non-streaming endpoint.` })}\n\n`));
        controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      },
    });
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const encoder = new TextEncoder();
  const startTime = Date.now();

  // We intentionally do NOT consume request.signal here — Next.js wraps the
  // request body in a ReadableStream, and once we've called request.json()
  // there's no per-request AbortSignal exposed. If the client disconnects,
  // Node will close the downstream socket and `reader.read()` will throw /
  // return done, which ends the generator.
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        send('meta', {
          provider: 'minimax',
          model: process.env.MINIMAX_MODEL || 'MiniMax-M3',
          timestamp: new Date().toISOString(),
        });

        let full = '';
        let finishReason: string | undefined;
        let chunkCount = 0;
        const iter = executeWithMiniMaxStream(messages, { temperature: 0.7, maxTokens: 1024 });
        for await (const chunk of iter) {
          chunkCount++;
          full = chunk.prefix;
          finishReason = chunk.finishReason || finishReason;
          send('token', { delta: chunk.delta, prefix: chunk.prefix });
        }
        send('done', {
          full,
          finishReason: finishReason || 'stop',
          chunkCount,
          totalTimeMs: Date.now() - startTime,
        });
        log.info('chat.stream_done', { provider: 'minimax', chunks: chunkCount, totalTimeMs: Date.now() - startTime });
        controller.close();
      } catch (err: any) {
        log.warn('chat.stream_error', { error: err?.message || String(err) });
        try {
          send('error', { message: err?.message || String(err) });
          send('done', { full: '', finishReason: 'error', chunkCount: 0, totalTimeMs: Date.now() - startTime });
        } catch { /* controller already closed */ }
        try { controller.close(); } catch { /* noop */ }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET(request?: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Enhanced server-side functionality with provider detection
  try {
    console.log('🔍 Detecting AI providers for chat endpoint...');

    // Keep the status probe responsive and local-first. The chat POST path
    // already uses this mode; running the full cloud/agent probe here made
    // the UI report a disconnected provider after its short status timeout.
    const statusUrl = request
      ? new URL(request.url).searchParams.get('baseUrl')?.trim() || undefined
      : undefined;
    const providerDetection = await withTimeout(
      detectAvailableProviders({ fastLocal: true, lmStudioBaseUrl: statusUrl }),
      10000,
    );

    if (!providerDetection) {
      return NextResponse.json({
        success: false,
        currentProvider: 'fallback',
        error: 'AI provider status detection timed out',
        availableProviders: [],
        unavailableProviders: [],
        recommendations: ['Confirm LM Studio is running and try again'],
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    // Get configuration for each provider
    const lmStudioConfig = getProviderConfig('lmstudio') || {
      url: statusUrl || 'http://localhost:1234', model: '', apiKey: '', timeout: 120000,
    };
    const openRouterConfig = getProviderConfig('openrouter') || {
      baseUrl: 'https://openrouter.ai/api/v1', model: '', apiKey: '', timeout: 30000,
    };

    const settings = {
      aiProvider: providerDetection.primary.provider,
      lmStudio: {
        url: lmStudioConfig.url,
        model: lmStudioConfig.model,
        hasApiKey: !!lmStudioConfig.apiKey,
        timeout: lmStudioConfig.timeout
      },
      openRouter: {
        baseUrl: openRouterConfig.baseUrl,
        model: openRouterConfig.model,
        hasApiKey: !!openRouterConfig.apiKey,
        timeout: openRouterConfig.timeout
      }
    };

    return NextResponse.json({
      success: true,
      currentProvider: providerDetection.primary.provider,
      primaryProvider: {
        provider: providerDetection.primary.provider,
        isAvailable: providerDetection.primary.isAvailable,
        reason: providerDetection.primary.reason
      },
      availableProviders: [
        providerDetection.primary.isAvailable ? providerDetection.primary.provider : null,
        ...providerDetection.fallback.filter(f => f.isAvailable).map(f => f.provider)
      ].filter(Boolean),
      unavailableProviders: providerDetection.fallback.filter(f => !f.isAvailable).map(f => ({
        provider: f.provider,
        reason: f.reason,
        recommendations: f.recommendations
      })),
      settings: settings,
      recommendations: providerDetection.recommendations,
      environment: {
        isServerless: !!process.env.NETLIFY || !!process.env.VERCEL,
        platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Dedicated Server',
        isDevelopment: process.env.NODE_ENV === 'development'
      },
      buildMode: 'server',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat endpoint provider detection failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect AI providers',
        timestamp: new Date().toISOString(),
        aiProviderRequired: true,
        message: 'AI provider detection failed - chat functionality requires an active AI provider'
      },
      { status: 503 }
    );
  }
}
