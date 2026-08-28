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
    .replace(/\/(?:api\/)?v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
}

function getLMStudioBaseUrl(value?: string): string {
  return normalizeBaseUrl(value || process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_URL);
}

export function getLMStudioEndpointCandidates(configuredBaseUrl?: string): string[] {
  if (configuredBaseUrl?.trim()) return [getLMStudioBaseUrl(configuredBaseUrl)];
  return Array.from(new Set([
    getLMStudioBaseUrl(),
    'http://127.0.0.1:1234',
    'http://localhost:1234',
  ].map(normalizeBaseUrl)));
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

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<Response>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`LM Studio request timed out after ${timeoutMs}ms`)), timeoutMs);
      timer.unref?.();
    });
    return await Promise.race([fetch(input, init), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getLMStudioApiKey(): string {
  if (process.env.LM_STUDIO_API_KEY) return process.env.LM_STUDIO_API_KEY;
  if (process.env.LM_API_TOKEN) return process.env.LM_API_TOKEN;

  try {
    const tokenPath = path.join(process.env.HOME || '', '.lmstudio', 'secrets', 'lm_api_token');
    const token = fs.readFileSync(tokenPath, 'utf8').trim();
    if (token) return token;
  } catch {
    // LM Studio authentication is optional on older/local server versions.
  }

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

function getHeaders(includeJson = false, apiKeyOverride?: string): Record<string, string> {
  const apiKey = apiKeyOverride?.trim() || getLMStudioApiKey();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeImageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  const value = String(image).trim();
  if (!value) return undefined;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

function isEmbeddingModel(id: string): boolean {
  const value = id.toLowerCase();
  return value.includes('embedding') || value.includes('embed-') || value.endsWith('-embed') || value.includes('reranker');
}

function isNonChatModel(model: any): boolean {
  const type = typeof model?.type === 'string' ? model.type.toLowerCase() : '';
  if (type === 'embedding' || type === 'reranker' || type === 'image-embedding') return true;
  const id = String(model?.id || model?.key || '').trim();
  return id ? isEmbeddingModel(id) : false;
}

function modelIdsFromCatalog(data: any, nativeCatalog: boolean): string[] {
  const entries = nativeCatalog
    ? (Array.isArray(data?.models) ? data.models : [])
    : (Array.isArray(data?.data) ? data.data : []);
  const ids = new Set<string>();
  for (const model of entries) {
    if (isNonChatModel(model)) continue;
    const id = typeof model === 'string' ? model : model?.id || model?.key;
    if (typeof id === 'string' && id.trim()) ids.add(id.trim());
    for (const instance of Array.isArray(model?.loaded_instances) ? model.loaded_instances : []) {
      const instanceId = instance?.id;
      if (typeof instanceId === 'string' && instanceId.trim()) ids.add(instanceId.trim());
    }
  }
  return Array.from(ids);
}

async function fetchModelCatalog(endpoint: string, timeoutMs: number, apiKeyOverride?: string): Promise<{ models: string[]; responseEndpoint: string } | null> {
  let successfulEmptyEndpoint: string | undefined;
  // Keep the OpenAI-compatible route first for older LM Studio versions and
  // existing deployments; fall back to the native catalog when that route is
  // unavailable or returns no usable models.
  for (const path of ['/v1/models', '/api/v1/models']) {
    try {
      const response = await fetchWithTimeout(`${endpoint}${path}`, {
        method: 'GET',
        headers: getHeaders(false, apiKeyOverride),
      }, timeoutMs);
      if (!response.ok) continue;
      const models = modelIdsFromCatalog(
        await response.json().catch(() => ({})),
        path === '/api/v1/models',
      );
      if (models.length > 0) return { models, responseEndpoint: `${endpoint}${path}` };
      successfulEmptyEndpoint ||= `${endpoint}${path}`;
    } catch {
      if (path === '/v1/models') return null;
      // A network failure means this loopback candidate is unavailable; move
      // on so localhost and 127.0.0.1 can be tried independently.
    }
  }
  return successfulEmptyEndpoint ? { models: [], responseEndpoint: successfulEmptyEndpoint } : null;
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

export interface LMStudioProviderResult {
  available: boolean;
  isAvailable: boolean;
  reason: string;
  provider: 'lm-studio';
  config?: { url: string; hasApiKey: boolean };
  models?: string[];
  error?: string;
}

export async function checkLMStudio(includeModels = false, configuredBaseUrl?: string, apiKeyOverride?: string): Promise<LMStudioProviderResult> {
  const buildResult = (result: Omit<LMStudioProviderResult, 'isAvailable'>): LMStudioProviderResult => ({
    ...result,
    isAvailable: result.available,
  });

  if (isServerlessEnv()) {
    return buildResult({
      available: false,
      reason: 'LM Studio not supported in serverless environments',
      provider: 'lm-studio',
      config: {
        url: getLMStudioBaseUrl(),
        hasApiKey: Boolean(getLMStudioApiKey()),
      },
    });
  }

  let lastError = 'connection refused';
  for (const url of getLMStudioEndpointCandidates(configuredBaseUrl)) {
    try {
      const catalog = await fetchModelCatalog(url, 3000, apiKeyOverride);
      if (!catalog) {
        lastError = 'LM Studio model catalog request failed';
        continue;
      }
      const models = catalog.models;

      if (models.length === 0) {
        return buildResult({
          available: false,
          reason: 'LM Studio is running but no chat model is available',
          provider: 'lm-studio',
          config: { url, hasApiKey: Boolean(apiKeyOverride || getLMStudioApiKey()) },
          error: 'No chat-capable models were returned by LM Studio',
        });
      }

      return buildResult({
        available: true,
        reason: `LM Studio is running with ${models.length} model(s)`,
        provider: 'lm-studio',
        config: { url, hasApiKey: Boolean(apiKeyOverride || getLMStudioApiKey()) },
        models: includeModels ? models : undefined,
      });
    } catch (error: any) {
      lastError = error?.message || lastError;
    }
  }

  return buildResult({
    available: false,
    reason: `LM Studio not available: ${lastError}`,
    provider: 'lm-studio',
    config: { url: getLMStudioBaseUrl(), hasApiKey: Boolean(getLMStudioApiKey()) },
    error: lastError,
  });
}

export async function getAvailableModels(forceRefresh = false, configuredBaseUrl?: string, apiKeyOverride?: string): Promise<string[]> {
  const now = Date.now();
  const baseUrl = getLMStudioBaseUrl(configuredBaseUrl);

  if (
    !forceRefresh &&
    availableModelsCache &&
    cacheBaseUrl === baseUrl &&
    (now - cacheTime) < CACHE_TTL
  ) {
    return availableModelsCache;
  }

  for (const endpoint of getLMStudioEndpointCandidates(configuredBaseUrl)) {
    try {
      const catalog = await fetchModelCatalog(endpoint, 5000, apiKeyOverride);
      if (!catalog) continue;
      const models = catalog.models;

      // Do not cache an empty transient response. A model may be loading or
      // LM Studio may be switching JIT state, and an empty minute-long cache
      // made that look like a persistent failure. Keep the endpoint that
      // actually answered so inference follows the same working socket.
      if (models.length > 0) {
        availableModelsCache = models;
        cacheTime = now;
        cacheBaseUrl = endpoint;
        return models;
      }
    } catch {
      // Try the next loopback candidate. localhost and 127.0.0.1 can resolve
      // to different stacks on macOS.
    }
  }

  availableModelsCache = null;
  cacheTime = 0;
  cacheBaseUrl = '';
  return [];
}

async function getNativeVisionModelIds(configuredBaseUrl?: string, apiKeyOverride?: string): Promise<string[] | null> {
  const baseUrl = configuredBaseUrl ? getLMStudioBaseUrl(configuredBaseUrl) : cacheBaseUrl || getLMStudioBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/v1/models`, {
      method: 'GET',
      headers: getHeaders(false, apiKeyOverride),
      signal: createTimeoutSignal(5000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data?.models)) return null;

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
    return null;
  }
}

async function getVisionModelCatalog(configuredBaseUrl?: string, apiKeyOverride?: string): Promise<{
  models: string[];
  metadataAvailable: boolean;
}> {
  const models = await getAvailableModels(false, configuredBaseUrl, apiKeyOverride);
  if (models.length === 0) return { models: [], metadataAvailable: false };

  const nativeVision = await getNativeVisionModelIds(configuredBaseUrl, apiKeyOverride);
  if (nativeVision !== null) {
    return {
      models: models.filter(id => nativeVision.includes(id)),
      metadataAvailable: true,
    };
  }

  // Older LM Studio builds may not expose native capability metadata.
  return {
    models: models.filter(looksLikeVisionModel),
    metadataAvailable: false,
  };
}

export async function getVisionModels(configuredBaseUrl?: string, apiKeyOverride?: string): Promise<string[]> {
  return (await getVisionModelCatalog(configuredBaseUrl, apiKeyOverride)).models;
}

export async function getTextModels(configuredBaseUrl?: string, apiKeyOverride?: string): Promise<string[]> {
  return getAvailableModels(false, configuredBaseUrl, apiKeyOverride);
}

function getConfiguredModel(type: 'vision' | 'text'): string {
  if (type === 'vision') {
    return process.env.LM_STUDIO_VISION_MODEL || process.env.LM_STUDIO_MODEL || LM_STUDIO_VISION_MODEL || '';
  }
  return process.env.LM_STUDIO_TEXT_MODEL || process.env.LM_STUDIO_MODEL || LM_STUDIO_TEXT_MODEL || '';
}

async function resolveModel(type: 'vision' | 'text', explicitModel?: string, configuredBaseUrl?: string, apiKeyOverride?: string): Promise<string> {
  const requested = explicitModel?.trim();
  if (requested && type === 'text') return requested;

  const configured = getConfiguredModel(type).trim();
  const available = await getAvailableModels(false, configuredBaseUrl, apiKeyOverride);

  if (type === 'vision') {
    const visionCatalog = await getVisionModelCatalog(configuredBaseUrl, apiKeyOverride);
    const candidate = requested || configured;

    if (candidate && (available.length === 0 || available.includes(candidate))) {
      if (available.length === 0 || visionCatalog.models.includes(candidate) || !visionCatalog.metadataAvailable) {
        return candidate;
      }
    }

    if (requested && available.length > 0 && visionCatalog.metadataAvailable && visionCatalog.models.length === 0) {
      // A model missing from /v1/models may still be a downloaded JIT target.
      // Only reject an explicit ID when the catalog actually contains that ID
      // and native metadata says it is not vision-capable.
      if (available.includes(requested)) {
        throw new Error(
          `LM Studio model "${requested}" is advertised as text-only and cannot process images.`,
        );
      }
    }

    // Explicit model IDs are authoritative. Forward an unknown ID and let
    // LM Studio validate or JIT-load it instead of silently choosing another
    // vision model.
    if (requested && !available.includes(requested)) return requested;

    const visionModels = visionCatalog.models;
    if (visionModels.length > 0) return visionModels[0];

    if (configured && available.length === 0) return configured;

    throw new Error(
      'LM Studio is reachable but no vision-capable model is available. Load a vision model or configure LM_STUDIO_VISION_MODEL.',
    );
  }

  if (configured) {
    // If model discovery temporarily fails, preserve an explicit user choice
    // and let the completion endpoint produce the authoritative error.
    if (available.length === 0 || available.includes(configured)) return configured;
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
    baseUrl?: string;
    image?: string;
    temperature?: number;
    useVision?: boolean;
    timeout?: number;
    returnMetadata?: boolean;
    apiKey?: string;
  } = {},
) {
  const wantsVision = Boolean(options.image) && options.useVision !== false;
  const model = await resolveModel(wantsVision ? 'vision' : 'text', options.model, options.baseUrl, options.apiKey);

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

  const endpoint = options.baseUrl ? getLMStudioBaseUrl(options.baseUrl) : cacheBaseUrl || getLMStudioBaseUrl();
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: getHeaders(true, options.apiKey),
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      stream: false,
    }),
    // Large local vision models (including 35B MoE models) can legitimately
    // need several minutes on CPU/shared-memory hardware. Keep this bounded,
    // but do not abort a healthy inference at the two-minute mark.
    signal: createTimeoutSignal(
      options.timeout && options.timeout > 0
        ? options.timeout
        : parseInt(process.env.LM_STUDIO_TIMEOUT || '300000', 10),
    ),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = textFromCompletionMessage(data.choices?.[0]?.message);
  return options.returnMetadata
    ? { content, result: content, model }
    : content;
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
