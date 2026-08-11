/**
 * LM Studio AI Provider - Dynamic Model Selection
 * Auto-detects available models and allows selection
 */

import fs from 'node:fs';
import path from 'node:path';

// Serverless environments (Netlify, Vercel, AWS Lambda) cannot reach LM Studio on localhost.
// Re-evaluated per-call so tests can flip the env var mid-suite.
function isServerlessEnv(): boolean {
  return Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';

export function getLMStudioApiKey(): string {
  if (process.env.LM_STUDIO_API_KEY) return process.env.LM_STUDIO_API_KEY;
  if (process.env.LM_API_TOKEN) return process.env.LM_API_TOKEN;
  try {
    const configPath = path.join(process.env.HOME || '', '.lmstudio', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const findToken = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      if (Array.isArray(value)) {
        for (const item of value) { const found = findToken(item); if (found) return found; }
        return undefined;
      }
      const record = value as Record<string, unknown>;
      if (typeof record.LM_API_TOKEN === 'string' && record.LM_API_TOKEN.trim()) return record.LM_API_TOKEN.trim();
      for (const child of Object.values(record)) { const found = findToken(child); if (found) return found; }
      return undefined;
    };
    return findToken(config) || '';
  } catch {
    return '';
  }
}

const LM_STUDIO_API_KEY = getLMStudioApiKey();

// Default models (can be overridden)
const LM_STUDIO_VISION_MODEL = process.env.LM_STUDIO_VISION_MODEL || 'nvidia-nemotron-3-nano-omni-30b-a3b-reasoning';
const LM_STUDIO_TEXT_MODEL = process.env.LM_STUDIO_TEXT_MODEL || 'qwen/qwen3.5-27b';

// Cache available models
let availableModelsCache: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

function normalizeImageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  const value = String(image).trim();
  if (!value) return undefined;
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  // Treat raw base64 from the CannaAI pipeline as PNG unless already wrapped.
  return `data:image/png;base64,${value}`;
}

/**
 * AIProviderResult contract (kept compatible with ai-provider-detection.ts):
 *   { available: boolean, reason: string, provider?: string, config?: { url: string, ... }, models?: string[] }
 *
 * Also exposes `isAvailable` for legacy callers (tests, frontend) that use the older key.
 */
export interface LMStudioProviderResult {
  available: boolean;
  isAvailable: boolean; // alias for `available` (kept for backward compat)
  reason: string;
  provider: 'lm-studio';
  config?: { url: string; hasApiKey: boolean };
  models?: string[];
  error?: string;
}

export async function checkLMStudio(includeModels = false): Promise<LMStudioProviderResult> {
  const buildResult = (b: Omit<LMStudioProviderResult, 'isAvailable'>): LMStudioProviderResult =>
    ({ ...b, isAvailable: b.available });

  if (isServerlessEnv()) {
    return buildResult({
      available: false,
      reason: 'LM Studio not supported in serverless environments',
      provider: 'lm-studio',
    });
  }
  const url = LM_STUDIO_BASE_URL.replace(/\/v1\/?$/, '');
  try {
    const response = await fetch(`${url}/v1/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LM_STUDIO_API_KEY}` },
    });
    if (!response.ok) {
      return buildResult({
        available: false,
        reason: `LM Studio responded with HTTP ${response.status}`,
        provider: 'lm-studio',
        config: { url, hasApiKey: !!LM_STUDIO_API_KEY },
        error: `HTTP ${response.status}`,
      });
    }
    const data = await response.json().catch(() => ({} as any));
    const models: string[] | undefined = includeModels
      ? Array.isArray(data?.data) ? data.data.map((m: any) => m?.id).filter(Boolean) : undefined
      : undefined;
    return buildResult({
      available: true,
      reason: 'LM Studio is running',
      provider: 'lm-studio',
      config: { url, hasApiKey: !!LM_STUDIO_API_KEY },
      models,
    });
  } catch (err: any) {
    return buildResult({
      available: false,
      reason: `LM Studio not available: ${err?.message || 'connection refused'}`,
      provider: 'lm-studio',
      config: { url, hasApiKey: !!LM_STUDIO_API_KEY },
      error: err?.message,
    });
  }
}

export async function getAvailableModels(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  
  // Return cache if valid
  if (!forceRefresh && availableModelsCache && (now - cacheTime) < CACHE_TTL) {
    return availableModelsCache;
  }

  try {
    const response = await fetch(`${LM_STUDIO_BASE_URL}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LM_STUDIO_API_KEY}` },
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    availableModelsCache = data.data?.map((m: any) => m.id) || [];
    cacheTime = now;
    return availableModelsCache;
  } catch {
    return [];
  }
}

// All models can potentially do vision - let caller decide
export async function getVisionModels(): Promise<string[]> {
  const models = await getAvailableModels();
  // Most local models support vision - filter only embeddings
  return models.filter(id => !id.includes('embedding'));
}

export async function getTextModels(): Promise<string[]> {
  const models = await getAvailableModels();
  return models.filter(id => !id.includes('embedding'));
}

export async function executeWithLMStudio(
  messages: any[],
  options: { 
    model?: string; 
    image?: string; 
    temperature?: number;
    useVision?: boolean;
  } = {}
) {
  // Determine which model to use
  let model: string;
  
  if (options.model) {
    // Specific model requested
    model = options.model;
  } else if (options.image && options.useVision !== false) {
    // Image provided - use vision model
    model = LM_STUDIO_VISION_MODEL;
  } else {
    // Text model
    model = LM_STUDIO_TEXT_MODEL;
  }

  let formattedMessages = messages;
  
  // Add image to message if using vision model
  const normalizedImage = normalizeImageUrl(options.image);

  if (normalizedImage && options.useVision !== false) {
    formattedMessages = messages.map((msg: any) => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: normalizedImage } },
          ],
        };
      }
      return msg;
    });
  }

  const response = await fetch(`${LM_STUDIO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LM_STUDIO_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Get current configured models
export function getConfiguredModels() {
  return {
    vision: LM_STUDIO_VISION_MODEL,
    text: LM_STUDIO_TEXT_MODEL,
  };
}

// Change model via API (runtime configurable)
export function setModel(type: 'vision' | 'text', model: string) {
  if (type === 'vision') {
    process.env.LM_STUDIO_VISION_MODEL = model;
  } else {
    process.env.LM_STUDIO_TEXT_MODEL = model;
  }
  // Clear cache to force refresh
  availableModelsCache = null;
}

export { LM_STUDIO_VISION_MODEL, LM_STUDIO_TEXT_MODEL };
