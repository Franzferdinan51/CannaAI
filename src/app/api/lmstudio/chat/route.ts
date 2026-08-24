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
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
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

async function discoverLMStudio(): Promise<{
  baseUrl: string;
  models: any[];
} | null> {
  for (const baseUrl of getLMStudioEndpointCandidates()) {
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

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

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
      messages: requestedMessages,
      stream = false
    } = body;

    // Check every local loopback candidate. On macOS, localhost may resolve
    // to IPv6 while LM Studio is listening only on IPv4 (or vice versa).
    const discovered = await discoverLMStudio();
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
        const id = String(entry?.id || '').toLowerCase();
        return id && !id.includes('embedding') && !id.includes('embed-') && !id.endsWith('-embed');
      });

    // Accept both the legacy `modelId` field and the OpenAI-compatible `model`
    // field used by the main chat client. Never auto-select an embedding model.
    let selectedModel = modelId || model;
    if (!selectedModel && availableModels.length > 0) {
      selectedModel = availableModels[0].id;
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
      if (image) {
        userMessage.content = [
          { type: 'text', text: prompt || '' },
          { type: 'image_url', image_url: { url: image } }
        ];
      }

      messages.push(userMessage);
    }

    // Prepare LM Studio request payload
    const lmStudioPayload = {
      model: selectedModel || 'auto',
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

    const result = await lmStudioResponse.json();

    // Extract and return the response
    const message = result.choices?.[0]?.message || {};
    const response = {
      // Reasoning-first local models may put the usable answer in
      // reasoning_content while content is empty.
      content: message.content || message.reasoning_content || '',
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
