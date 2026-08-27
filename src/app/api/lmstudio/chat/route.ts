import { NextRequest, NextResponse } from 'next/server';
import {
  getLMStudioApiKey,
  getLMStudioEndpointCandidates,
} from '@/lib/ai-provider-lmstudio';

function lmStudioHeaders(includeJson = false): Record<string, string> {
  const apiKey = getLMStudioApiKey();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeImageUrl(image: unknown): string | undefined {
  if (typeof image !== 'string') return undefined;
  const value = image.trim();
  if (!value) return undefined;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

function textFromCompletionMessage(message: any): string {
  const content = message?.content;
  if (Array.isArray(content)) {
    const text = content
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof content === 'string' && content.trim()) return content.trim();
  return typeof message?.reasoning_content === 'string'
    ? message.reasoning_content.trim()
    : '';
}

function isNonChatModel(entry: any): boolean {
  const id = String(entry?.id || '').toLowerCase();
  return Boolean(
    entry?.type === 'embedding' ||
    entry?.type === 'reranker' ||
    id.includes('embedding') ||
    id.includes('embed-') ||
    id.endsWith('-embed') ||
    id.includes('reranker'),
  );
}

function attachImageToLatestUserMessage(messages: any[], image: unknown): any[] {
  const normalizedImage = normalizeImageUrl(image);
  if (!normalizedImage) return messages;

  let attached = false;
  return [...messages].reverse().map((message: any) => {
    if (attached || message?.role !== 'user') return message;
    attached = true;

    const text = typeof message.content === 'string'
      ? message.content
      : Array.isArray(message.content)
        ? message.content
          .filter((part: any) => part?.type === 'text')
          .map((part: any) => part?.text || '')
          .join('\n')
        : String(message.content || '');

    return {
      ...message,
      content: [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: normalizedImage } },
      ],
    };
  }).reverse();
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const timeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (milliseconds: number) => AbortSignal;
  }).timeout;
  if (typeof timeout === 'function') return timeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
}

async function discoverLMStudio(configuredBaseUrl?: string): Promise<{
  baseUrl: string;
  models: any[];
} | null> {
  for (const baseUrl of getLMStudioEndpointCandidates(configuredBaseUrl)) {
    try {
      const healthResponse = await fetch(`${baseUrl}/v1/models`, {
        signal: createTimeoutSignal(3000),
        headers: lmStudioHeaders(),
      });
      if (!healthResponse.ok) continue;

      const modelsData = await healthResponse.json().catch(() => ({}));
      return {
        baseUrl,
        models: Array.isArray(modelsData?.data) ? modelsData.data : [],
      };
    } catch {
      // localhost and 127.0.0.1 can resolve to different stacks on macOS;
      // continue through every local candidate before declaring LM Studio down.
    }
  }
  return null;
}

async function discoverVisionModelIds(baseUrl: string): Promise<{
  vision: Set<string>;
  known: Set<string>;
} | null> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/models`, {
      signal: createTimeoutSignal(3000),
      headers: lmStudioHeaders(),
    });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => ({}));
    if (!Array.isArray(payload?.models)) return null;

    const modelsWithMetadata = payload.models.filter((model: any) => (
      typeof model?.capabilities?.vision === 'boolean'
    ));
    if (modelsWithMetadata.length === 0) return null;

    const visionIds = new Set<string>();
    const knownIds = new Set<string>();
    for (const model of modelsWithMetadata) {
      for (const id of [model.key, model.id]) {
        if (typeof id === 'string' && id.trim()) {
          knownIds.add(id.trim());
          if (model.capabilities.vision === true) visionIds.add(id.trim());
        }
      }
      for (const instance of model.loaded_instances || []) {
        if (typeof instance?.id === 'string' && instance.id.trim()) {
          knownIds.add(instance.id.trim());
          if (model.capabilities.vision === true) visionIds.add(instance.id.trim());
        }
      }
    }
    return { vision: visionIds, known: knownIds };
  } catch {
    // Older LM Studio builds may not expose the native catalog. The
    // OpenAI-compatible endpoint remains the source of truth in that case.
    return null;
  }
}

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

const TEXT_INFERENCE_TIMEOUT_MS = 120000;
const VISION_INFERENCE_TIMEOUT_MS = 600000;

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      image,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 512,
      modelId,
      model,
      baseUrl,
      messages: requestedMessages,
      stream = false
    } = body;
    const requestedBaseUrl = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : undefined;

    // The legacy settings panel uses this endpoint for its connection test.
    // Keep that probe side-effect free and honor the panel's configured URL.
    if (typeof body.testProvider === 'string' && body.testProvider.trim()) {
      const provider = body.testProvider.trim().toLowerCase().replace(/[-_]/g, '');
      if (provider !== 'lmstudio') {
        return NextResponse.json({ success: false, provider: body.testProvider }, { status: 400 });
      }
      const providerUrl = body.providerSettings?.lmStudio?.url || requestedBaseUrl;
      const discoveredForTest = await discoverLMStudio(providerUrl);
      return NextResponse.json({
        success: Boolean(discoveredForTest),
        provider: 'lmstudio',
        model: discoveredForTest?.models.find((entry: any) => !isNonChatModel(entry))?.id,
      }, { status: discoveredForTest ? 200 : 503 });
    }

    // Check every local loopback candidate. On macOS, localhost may resolve
    // to IPv6 while LM Studio is listening only on IPv4 (or vice versa).
    const discovered = await discoverLMStudio(requestedBaseUrl);
    if (!discovered) {
      return NextResponse.json(
        {
          error: 'LM Studio is not running. Please start LM Studio first.',
          code: 'LM_STUDIO_NOT_RUNNING'
        },
        { status: 503 }
      );
    }

    // Get available models from LM Studio to find the requested model
    const availableModels = discovered.models.filter((entry: any) => {
        const id = String(entry?.id || '').trim();
        return id && !isNonChatModel(entry);
      });

    // Accept both the legacy `modelId` field and the OpenAI-compatible `model`
    // field used by the main chat client. Never auto-select an embedding model.
    const requestedModel = typeof (modelId || model) === 'string'
      ? String(modelId || model).trim()
      : '';
    let selectedModel = requestedModel;
    // An explicit model ID is authoritative. LM Studio can JIT-load a
    // downloaded/custom model that is not currently returned by /v1/models.
    // The inference endpoint remains responsible for validating the ID.
    if (!selectedModel && availableModels.length > 0) {
      selectedModel = availableModels[0].id;
    }
    if (!selectedModel) {
      return NextResponse.json({
        error: 'LM Studio is reachable, but no runnable chat model is available',
        code: 'LM_STUDIO_NO_CHAT_MODEL',
        message: 'Load a chat model in LM Studio and retry.',
      }, { status: 503 });
    }

    if (image) {
      const visionCapabilities = await discoverVisionModelIds(discovered.baseUrl);
      if (
        visionCapabilities?.known.has(selectedModel) &&
        !visionCapabilities.vision.has(selectedModel)
      ) {
        return NextResponse.json({
          error: `LM Studio model "${selectedModel}" is not advertised as vision-capable`,
          code: 'LM_STUDIO_MODEL_NOT_VISION_CAPABLE',
          model: selectedModel,
          visionModels: Array.from(visionCapabilities.vision),
        }, { status: 503 });
      }
    }

    // Preserve an already-normalized OpenAI-compatible message list. This is
    // important for vision requests, which carry image_url content alongside
    // their text and must not be flattened into a prompt-only request.
    let messages = Array.isArray(requestedMessages)
      ? requestedMessages.map((message: any) => ({ ...message }))
      : [];

    if (messages.length > 0 && image) {
      messages = attachImageToLatestUserMessage(messages, image);
    }

    if (messages.length === 0 && systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    if (messages.length === 0) {
      const userMessage: any = {
        role: 'user',
        content: prompt || ''
      };

      // Add image if provided (for vision models)
      const normalizedImage = normalizeImageUrl(image);
      if (normalizedImage) {
        userMessage.content = [
          { type: 'text', text: prompt || '' },
          { type: 'image_url', image_url: { url: normalizedImage } }
        ];
      }

      messages.push(userMessage);
    }

    // Prepare LM Studio request payload
    const lmStudioPayload = {
      model: selectedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
      // Add some default parameters for better responses
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0
    };

    console.log('Sending request to LM Studio:', {
      model: selectedModel,
      messagesCount: messages.length,
      hasImage: !!image,
      temperature,
      maxTokens
    });

    // Call LM Studio API
    const lmStudioResponse = await fetch(`${discovered.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: lmStudioHeaders(true),
      // Large local vision models can legitimately take several minutes, but
      // an inference request must still have a hard upper bound so the UI is
      // never left waiting forever on a stalled LM Studio process.
      signal: createTimeoutSignal(image ? VISION_INFERENCE_TIMEOUT_MS : TEXT_INFERENCE_TIMEOUT_MS),
      body: JSON.stringify(lmStudioPayload)
    });

    if (!lmStudioResponse.ok) {
      const errorText = await lmStudioResponse.text();
      console.error('LM Studio API error:', {
        status: lmStudioResponse.status,
        statusText: lmStudioResponse.statusText,
        errorText
      });

      return NextResponse.json(
        {
          error: `LM Studio API error: ${lmStudioResponse.status} - ${errorText}`,
          code: 'LM_STUDIO_API_ERROR'
        },
        { status: 500 }
      );
    }

    // Preserve LM Studio's OpenAI-compatible SSE stream for callers that
    // explicitly request streaming. Parsing the body as JSON here would
    // consume/fail the event stream and make streamed models unusable.
    if (stream) {
      return new Response(lmStudioResponse.body, {
        status: lmStudioResponse.status,
        headers: {
          'Content-Type': lmStudioResponse.headers.get('content-type') || 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const result = await lmStudioResponse.json();

    // Extract and return the response
    const message = result.choices?.[0]?.message || {};
    const response = {
      // Reasoning-first local models may put the usable answer in
      // reasoning_content while content is empty.
      content: textFromCompletionMessage(message),
      model: result.model || selectedModel,
      usage: result.usage,
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local',
      finishReason: result.choices?.[0]?.finish_reason || 'stop'
    };

    console.log('LM Studio response received:', {
      model: response.model,
      contentLength: response.content.length,
      usage: response.usage
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('LM Studio chat API error:', error);

    // Handle timeout specifically
    if (error?.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'LM Studio request timed out. Please try again.',
          code: 'TIMEOUT'
        },
        { status: 504 }
      );
    }

    // Handle connection refused specifically
    if (error?.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error: 'Could not connect to LM Studio. Make sure LM Studio is running on localhost:1234.',
          code: 'CONNECTION_REFUSED'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: `Failed to process request: ${error.message}`,
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Health check endpoint
  try {
    const discovered = await discoverLMStudio();
    if (!discovered) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'LM Studio is not running',
        code: 'LM_STUDIO_NOT_RUNNING',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'healthy',
      models: discovered.models,
      count: discovered.models.length,
      timestamp: new Date().toISOString(),
      provider: 'lmstudio-local'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      code: 'CONNECTION_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
