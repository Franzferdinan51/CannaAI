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
