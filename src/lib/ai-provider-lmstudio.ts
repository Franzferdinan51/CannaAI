/**
 * LM Studio AI Provider - Dynamic Model Selection
 * Auto-detects available models and allows runtime selection.
 */

import fs from 'node:fs';
import path from 'node:path';

function isServerlessEnv(): boolean {
  return Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function normalizeBaseUrl(value?: string): string {
  return (value || 'http://localhost:1234')
    .trim()
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function getLMStudioBaseUrl(): string {
  return normalizeBaseUrl(process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL);
}

export function getLMStudioApiKey(): string {
  if (process.env.LM_STUDIO_API_KEY) return process.env.LM_STUDIO_API_KEY;
  if (process.env.LM_API_TOKEN) return process.env.LM_API_TOKEN;

  try {
    const configPath = path.join(process.env.HOME || '', '.lmstudio', 'mcp.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const findToken = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = findToken(item);
          if (found) return found;
        }
        return undefined;
      }

      const record = value as Record<string, unknown>;
      if (typeof record.LM_API_TOKEN === 'string' && record.LM_API_TOKEN.trim()) {
        return record.LM_API_TOKEN.trim();
      }
      for (const child of Object.values(record)) {
        const found = findToken(child);
        if (found) return found;
      }
      return undefined;
    };

    return findToken(config) || '';
  } catch {
    return '';
  }
}

// Runtime-selected values are intentionally mutable. The previous adapter
// captured environment variables at module import, so changing a model in the
// Settings UI had no effect until the whole process restarted.
export let LM_STUDIO_VISION_MODEL = process.env.LM_STUDIO_VISION_MODEL || process.env.LM_STUDIO_MODEL || '';
export let LM_STUDIO_TEXT_MODEL = process.env.LM_STUDIO_TEXT_MODEL || process.env.LM_STUDIO_MODEL || '';

let availableModelsCache: string[] | null = null;
let cacheTime = 0;
let cacheBaseUrl = '';
const CACHE_TTL = 60000;

function getHeaders(includeJson = false): Record<string, string> {
  const apiKey = getLMStudioApiKey();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeImageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  const value = String(image).trim();
  if (!value) return undefined;
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

function isEmbeddingModel(id: string): boolean {
  const value = id.toLowerCase();
  return value.includes('embedding') || value.includes('embed-') || value.endsWith('-embed');
}

function looksLikeVisionModel(id: string): boolean {
  const value = id.toLowerCase();
  return (
    value.includes('vision') ||
    value.includes('vl') ||
    value.includes('llava') ||
    value.includes('omni') ||
    value.includes('multimodal') ||
    value.includes('mmproj')
  );
}

export interface LMStudioProviderResult {
  available: boolean;
  isAvailable: boolean;
  reason: string;
  provider: 'lm-studio';
  config?: { url: string; hasApiKey: boolean };
  models?: string[];
  error?: string;
}

export async function checkLMStudio(includeModels = false): Promise<LMStudioProviderResult> {
  const buildResult = (result: Omit<LMStudioProviderResult, 'isAvailable'>): LMStudioProviderResult => ({
    ...result,
    isAvailable: result.available,
  });

  if (isServerlessEnv()) {
    return buildResult({
      available: false,
      reason: 'LM Studio not supported in serverless environments',
      provider: 'lm-studio',
    });
  }

  const url = getLMStudioBaseUrl();
  try {
    const response = await fetch(`${url}/v1/models`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return buildResult({
        available: false,
        reason: `LM Studio responded with HTTP ${response.status}`,
        provider: 'lm-studio',
        config: { url, hasApiKey: Boolean(getLMStudioApiKey()) },
        error: `HTTP ${response.status}`,
      });
    }

    const data = await response.json().catch(() => ({} as any));
    const models = Array.isArray(data?.data)
      ? data.data
        .map((model: any) => model?.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    return buildResult({
      available: true,
      reason: models.length > 0 ? `LM Studio is running with ${models.length} model(s)` : 'LM Studio is running',
      provider: 'lm-studio',
      config: { url, hasApiKey: Boolean(getLMStudioApiKey()) },
      models: includeModels ? models : undefined,
    });
  } catch (error: any) {
    return buildResult({
      available: false,
      reason: `LM Studio not available: ${error?.message || 'connection refused'}`,
      provider: 'lm-studio',
      config: { url, hasApiKey: Boolean(getLMStudioApiKey()) },
      error: error?.message,
    });
  }
}

export async function getAvailableModels(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  const baseUrl = getLMStudioBaseUrl();

  if (
    !forceRefresh &&
    availableModelsCache &&
    cacheBaseUrl === baseUrl &&
    (now - cacheTime) < CACHE_TTL
  ) {
    return availableModelsCache;
  }

  try {
    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];

    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data
        .map((model: any) => model?.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        .filter(id => !isEmbeddingModel(id))
      : [];

    // Do not cache an empty transient response. A model may be loading or LM
    // Studio may be switching JIT state, and an empty minute-long cache made
    // that look like a persistent failure.
    if (models.length > 0) {
      availableModelsCache = models;
      cacheTime = now;
      cacheBaseUrl = baseUrl;
    } else {
      availableModelsCache = null;
      cacheTime = 0;
      cacheBaseUrl = '';
    }

    return models;
  } catch {
    return [];
  }
}

async function getNativeVisionModelIds(): Promise<string[]> {
  const baseUrl = getLMStudioBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/v1/models`, {
      method: 'GET',
      headers: getHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data?.models)) return [];

    const ids = new Set<string>();
    for (const model of data.models) {
      if (model?.type === 'embedding' || model?.capabilities?.vision !== true) continue;
      if (typeof model?.key === 'string' && model.key) ids.add(model.key);
      if (typeof model?.id === 'string' && model.id) ids.add(model.id);
      if (Array.isArray(model?.loaded_instances)) {
        for (const instance of model.loaded_instances) {
          if (typeof instance?.id === 'string' && instance.id) ids.add(instance.id);
        }
      }
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

export async function getVisionModels(): Promise<string[]> {
  const models = await getAvailableModels();
  if (models.length === 0) return [];

  const nativeVision = new Set(await getNativeVisionModelIds());
  const explicitMatches = models.filter(id => nativeVision.has(id));
  if (explicitMatches.length > 0) return explicitMatches;

  // Native capability metadata is unavailable on some older LM Studio builds.
  // Fall back to conservative model-name hints rather than claiming every
  // local text model is vision-capable.
  return models.filter(looksLikeVisionModel);
}

export async function getTextModels(): Promise<string[]> {
  return getAvailableModels();
}

function getConfiguredModel(type: 'vision' | 'text'): string {
  if (type === 'vision') {
    return process.env.LM_STUDIO_VISION_MODEL || process.env.LM_STUDIO_MODEL || LM_STUDIO_VISION_MODEL || '';
  }
  return process.env.LM_STUDIO_TEXT_MODEL || process.env.LM_STUDIO_MODEL || LM_STUDIO_TEXT_MODEL || '';
}

async function resolveModel(type: 'vision' | 'text', explicitModel?: string): Promise<string> {
  if (explicitModel?.trim()) return explicitModel.trim();

  const configured = getConfiguredModel(type).trim();
  const available = await getAvailableModels();

  if (configured) {
    // If model discovery temporarily fails, preserve an explicit user choice
    // and let the completion endpoint produce the authoritative error.
    if (available.length === 0 || available.includes(configured)) return configured;
  }

  if (type === 'vision') {
    const visionModels = await getVisionModels();
    if (visionModels.length > 0) return visionModels[0];
  }

  if (available.length > 0) return available[0];
  if (configured) return configured;

  throw new Error(
    'LM Studio is reachable but no chat model is available. Download/load a model or configure LM_STUDIO_MODEL.',
  );
}

export async function executeWithLMStudio(
  messages: any[],
  options: {
    model?: string;
    image?: string;
    temperature?: number;
    useVision?: boolean;
  } = {},
) {
  const wantsVision = Boolean(options.image) && options.useVision !== false;
  const model = await resolveModel(wantsVision ? 'vision' : 'text', options.model);

  let formattedMessages = messages;
  const normalizedImage = normalizeImageUrl(options.image);

  if (normalizedImage && options.useVision !== false) {
    // Attach the image only to the last user turn. The previous implementation
    // duplicated the same image into every historical user message, which can
    // rapidly inflate context and confuse multimodal local models.
    let imageAttached = false;
    formattedMessages = [...messages].reverse().map((message: any) => {
      if (!imageAttached && message?.role === 'user') {
        imageAttached = true;
        const text = typeof message.content === 'string'
          ? message.content
          : Array.isArray(message.content)
            ? message.content
              .filter((part: any) => part?.type === 'text')
              .map((part: any) => part?.text || '')
              .join('\n')
            : String(message.content || '');
        return {
          role: 'user',
          content: [
            { type: 'text', text },
            { type: 'image_url', image_url: { url: normalizedImage } },
          ],
        };
      }
      return message;
    }).reverse();
  }

  const response = await fetch(`${getLMStudioBaseUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      stream: false,
    }),
    signal: AbortSignal.timeout(parseInt(process.env.LM_STUDIO_TIMEOUT || '120000', 10)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning_content || '';
  return typeof content === 'string' ? content : String(content || '');
}

export function getConfiguredModels() {
  return {
    vision: getConfiguredModel('vision'),
    text: getConfiguredModel('text'),
  };
}

export function setModel(type: 'vision' | 'text', model: string) {
  const normalized = model.trim();
  if (type === 'vision') {
    LM_STUDIO_VISION_MODEL = normalized;
    process.env.LM_STUDIO_VISION_MODEL = normalized;
  } else {
    LM_STUDIO_TEXT_MODEL = normalized;
    process.env.LM_STUDIO_TEXT_MODEL = normalized;
    // Keep the generic model setting synchronized for older callers that only
    // know about LM_STUDIO_MODEL.
    process.env.LM_STUDIO_MODEL = normalized;
  }

  availableModelsCache = null;
  cacheTime = 0;
  cacheBaseUrl = '';
}
