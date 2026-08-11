import { AIProviderResult, AIExecuteOptions } from './ai-provider-detection';

const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M3';
const MINIMAX_TIMEOUT_MS = parseInt(process.env.MINIMAX_TIMEOUT_MS || '60000');

export interface MiniMaxMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function checkMiniMax(): Promise<AIProviderResult> {
  console.log('[MiniMax] Checking... KEY=', MINIMAX_API_KEY ? 'SET' : 'MISSING', 'URL=', MINIMAX_BASE_URL);
  if (!MINIMAX_API_KEY) {
    console.log('[MiniMax] Not configured - no API key');
    return { available: false, reason: 'MINIMAX_API_KEY not configured' };
  }

  try {
    console.log('[MiniMax] Starting fetch...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    console.log('[MiniMax] Fetch started, waiting for response...');

    const response = await fetch(`${MINIMAX_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('[MiniMax] Response status:', response.status);
    if (response.ok) {
      console.log('[MiniMax] SUCCESS - available');
      console.log('[MiniMax] Returning SUCCESS'); return { available: true, reason: 'MiniMax API connected' };
    } else {
      const text = await response.text().catch(() => '?');
      console.log('[MiniMax] FAIL:', response.status, text.substring(0, 100));
      console.log('[MiniMax] Returning FAIL:', response.status); return { available: false, reason: `MiniMax API error: ${response.status}` };
    }
  } catch (error: any) {
    console.log('[MiniMax] EXCEPTION:', error.message);
    console.log('[MiniMax] Returning EXCEPTION:', error.message); return { available: false, reason: `MiniMax unreachable: ${error.message}` };
  }
}

export async function executeWithMiniMax(
  messages: MiniMaxMessage[],
  options: AIExecuteOptions
): Promise<{ content: string; provider: string }> {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not configured');
  }

  const { imageBase64, plantInfo } = options;

  // Build content array for vision
  let content: string | Array<{ type: string; text?: string; image?: string }>;

  if (imageBase64) {
    // Strip data URL prefix if present (processedImage.base64 may include it)
    let cleanBase64 = imageBase64;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    // Remove any remaining non-base64 chars (whitespace, data URIs embedded, etc.)
    cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');

    console.log('[MiniMax] Image: original=' + imageBase64.length + ' chars, cleaned base64=' + cleanBase64.length + ' chars');
    console.log('[MiniMax] base64 first 20:', JSON.stringify(cleanBase64.substring(0, 20)));
    console.log('[MiniMax] base64 last 10:', JSON.stringify(cleanBase64.slice(-10)));
    if (cleanBase64.length === 0) throw new Error('Base64 data is empty after cleaning');

    // Vision message
    content = [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
      },
      { type: 'text', text: messages[messages.length - 1]?.content || '' },
    ];
  } else {
    content = messages[messages.length - 1]?.content || '';
  }

  const body: any = {
    model: MINIMAX_MODEL,
    messages: [
      ...(messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))),
      { role: 'user', content },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT_MS);

  try {
    // Log first 100 and last 50 chars of the base64 in the body
    if (body.messages && body.messages[body.messages.length - 1]) {
      const lastMsg = body.messages[body.messages.length - 1];
      if (Array.isArray(lastMsg.content)) {
        for (const item of lastMsg.content) {
          if (item.type === 'image_url' && item.image_url && item.image_url.url) {
            const url = item.image_url.url;
            console.log('[MiniMax] Image URL: len=' + url.length + ' first=' + JSON.stringify(url.substring(0, 30)) + ' last=' + JSON.stringify(url.slice(-20)));
          }
        }
      }
    }

    const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content || '';

    return { content: content_text, provider: 'minimax' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Streaming variant of executeWithMiniMax.
 *
 * Returns an async iterable that yields text deltas as they arrive from the
 * upstream API. The HTTP body is consumed incrementally; if the caller breaks
 * out of the loop (e.g. client disconnect) the underlying request is aborted
 * via the supplied signal so we don't keep streaming into the void.
 *
 * Why: chat UX. With MiniMax currently returning a full ~13s response, the
 * user sees a blank bubble until completion. Streaming cuts perceived latency
 * to first-token (~1s) and feels instant for follow-up turns.
 *
 * OpenAI-compatible streaming protocol: server sends
 *   data: {"choices":[{"delta":{"content":"token"}}]}\n\n
 * followed by `data: [DONE]\n\n`. We parse each SSE line, accumulate
 * the assistant prefix in `prefix` so each yield is the *full* text seen so
 * far (so callers can do terminal replacement if they want) AND emit just
 * the delta in `delta` (so callers that want token-by-token rendering can
 * use that).
 */
export interface MiniMaxStreamChunk {
  delta: string;     // new text since the previous chunk
  prefix: string;    // accumulated assistant text so far
  finishReason?: string; // "stop" / "length" / "content_filter" when present
}

export interface MiniMaxStreamOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

export async function* executeWithMiniMaxStream(
  messages: MiniMaxMessage[],
  options: MiniMaxStreamOptions = {}
): AsyncGenerator<MiniMaxStreamChunk> {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not configured');
  }

  const { signal, temperature = 0.7, maxTokens = 1024 } = options;

  // Build the same content array as the non-streaming variant so vision +
  // text requests work uniformly.
  const lastUser = messages[messages.length - 1];
  const previous = messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  let userContent: any = lastUser?.content || '';
  // (vision is intentionally out of scope for streaming — chat is text-only)

  const body: any = {
    model: MINIMAX_MODEL,
    messages: [...previous, { role: 'user', content: userContent }],
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`MiniMax stream error ${response.status}: ${errorText}`);
  }

  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let prefix = '';
  let finishReason: string | undefined;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines (\n\n). Split on that.
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        // A block may contain multiple "data:" lines; concatenate them.
        const dataLines: string[] = [];
        for (const line of eventBlock.split('\n')) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (dataLines.length === 0) continue;
        const payload = dataLines.join('\n');
        if (payload === '[DONE]') {
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          // Skip malformed lines instead of crashing the whole stream.
          continue;
        }

        const choice = parsed.choices?.[0];
        if (!choice) continue;
        const deltaText: string = choice.delta?.content || '';
        if (deltaText) {
          prefix += deltaText;
          yield { delta: deltaText, prefix, finishReason };
        }
        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }
}
