/**
 * LM Studio Provider Implementation
 * Local AI inference with no API costs.
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

interface LMStudioNativeModel {
  key?: string;
  id?: string;
  type?: string;
  loaded_instances?: Array<{ id?: string }>;
  capabilities?: {
    vision?: boolean;
    trained_for_tool_use?: boolean;
  };
}

interface ResolvedLMStudioModel {
  id: string;
  nativeModel?: LMStudioNativeModel;
  loaded: boolean;
}

function isNonChatModel(model: any): boolean {
  const type = typeof model?.type === 'string' ? model.type.toLowerCase() : '';
  if (type === 'embedding' || type === 'reranker' || type === 'image-embedding') return true;
  const id = String(model?.id || model?.key || '').trim().toLowerCase();
  return id.includes('embedding') || id.includes('embed-') || id.endsWith('-embed') || id.includes('reranker');
}

function normalizeImageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  const value = String(image).trim();
  if (!value) return undefined;
  if (value.startsWith('data:')) {
    const separator = value.indexOf(',');
    return separator >= 0 && value.slice(separator + 1).trim() ? value : undefined;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

function imageFromMessage(message: any): string | undefined {
  const direct = normalizeImageUrl(message?.image);
  if (direct) return direct;
  if (!Array.isArray(message?.content)) return undefined;
  const imagePart = message.content.find((part: any) => (
    (part?.type === 'image_url' && typeof part?.image_url?.url === 'string') ||
    (part?.type === 'image' && typeof part?.image_url === 'string')
  ));
  return normalizeImageUrl(imagePart?.image_url?.url || imagePart?.image_url);
}

function textFromMessageContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n');
  }
  return String(content || '');
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

function normalizeBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/(?:api\/)?v1\/?$/i, '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');
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

export class LMStudioProvider extends BaseProvider {
  constructor(config: any) {
    const rawBaseUrl = config.baseUrl || config.url || 'http://localhost:1234';
    super({
      name: 'lm-studio',
      // CannaAI historically accepted both http://host:1234 and
      // http://host:1234/v1. Provider methods append the endpoint version.
      baseUrl: normalizeBaseUrl(rawBaseUrl),
      timeout: 120000,
      maxRetries: 1,
      retryDelay: 1000,
      ...config,
      capabilities: {
        text: true,
        // LM Studio's OpenAI-compatible endpoint supports image content for
        // multimodal models. Capability is model-dependent, but the provider
        // itself must remain eligible so a selected vision model can be used.
        vision: true,
        // execute() currently returns a completed JSON response rather than an
        // SSE iterator, so do not advertise streaming until that path exists.
        streaming: false,
        functionCalling: false,
        jsonMode: true,
        maxTokens: 4096,
        contextWindow: 8192,
        supportsBatching: false,
        realtime: false,
        ...config.capabilities,
      },
      pricing: {
        input: 0,
        output: 0,
        currency: 'USD',
        ...config.pricing,
      },
    });

    // `...config` above may contain a baseUrl with /v1. Normalize the final
    // value as well so callers can use either historical setting shape.
    this.config.baseUrl = normalizeBaseUrl(this.config.baseUrl || rawBaseUrl);
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return false;
      }

      return Boolean(await this.resolveAvailableModel());
    } catch {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Resolve against both LM Studio's native model catalog and OpenAI model
    // list. The latter is important for JIT mode: a downloaded model can be
    // runnable even when there is no preloaded instance yet.
    const requiresVision = request.messages.some(message => Boolean(imageFromMessage(message)));
    const resolvedModel = await this.resolveAvailableModel(request.model, requiresVision);
    if (requiresVision && !resolvedModel) {
      throw new Error(
        'LM Studio is reachable but no vision-capable model is available. Load a vision model or configure a vision-capable model.',
      );
    }
    const selectedModel = resolvedModel?.id || request.model || this.config.model;
    if (!selectedModel) {
      throw new Error(
        'LM Studio is reachable, but no runnable chat model was found. Download or load a model in LM Studio and retry.',
      );
    }

    const normalizedRequest = this.normalizeRequest({ ...request, model: selectedModel });

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(normalizedRequest),
        signal: createTimeoutSignal(this.config.timeout),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
          `LM Studio API error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`,
        );
      }

      const data = await response.json();

      // Some reasoning models expose their usable answer through
      // reasoning_content. Preserve compatibility with those local models.
      const aiResponse = this.normalizeResponse(data, { latency });

      this.updateHealth(true, latency);
      this.recordMetrics(
        latency,
        aiResponse.usage?.promptTokens || 0,
        aiResponse.usage?.completionTokens || 0,
        0,
        true,
      );

      return aiResponse;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateHealth(false, latency, error as Error);
      this.recordMetrics(latency, 0, 0, 0, false);
      throw error;
    }
  }

  private getHeaders(includeJson = false): Record<string, string> {
    return {
      ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }

  private async getNativeModels(): Promise<LMStudioNativeModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: createTimeoutSignal(5000),
      });
      if (!response.ok) return [];

      const payload = await response.json();
      if (!Array.isArray(payload?.models)) return [];
      return payload.models.filter((model: LMStudioNativeModel) => !isNonChatModel(model));
    } catch {
      // Older LM Studio releases may not expose the native v1 endpoint. The
      // OpenAI-compatible /v1/models endpoint below is sufficient as fallback.
      return [];
    }
  }

  private async getOpenAIModelIds(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: createTimeoutSignal(5000),
      });
      if (!response.ok) return [];

      const payload = await response.json();
      if (!Array.isArray(payload?.data)) return [];

      return payload.data
        .map((model: any) => model?.id)
        .filter((id: unknown): id is string => (
          typeof id === 'string' &&
          id.trim().length > 0 &&
          !isNonChatModel({ id })
        ));
    } catch {
      return [];
    }
  }

  private findNativeModel(models: LMStudioNativeModel[], id: string): LMStudioNativeModel | undefined {
    return models.find(model => {
      if (model.key === id || model.id === id) return true;
      return model.loaded_instances?.some(instance => instance?.id === id) || false;
    });
  }

  /**
   * Resolve a model that the OpenAI-compatible endpoint can actually use.
   *
   * - Preloaded instances are preferred when available.
   * - /v1/models is used as the runnable/JIT model source of truth.
   * - A configured/requested model wins when it is present in that list.
   */
  private async resolveAvailableModel(
    requestedModel?: string,
    requiresVision = false,
  ): Promise<ResolvedLMStudioModel | undefined> {
    const [nativeModels, openAIModelIds] = await Promise.all([
      this.getNativeModels(),
      this.getOpenAIModelIds(),
    ]);

    const preferredModel = requestedModel || this.config.model || undefined;
    const isVisionCapable = (model: LMStudioNativeModel | undefined) => (
      !requiresVision ||
      !model ||
      typeof model.capabilities?.vision !== 'boolean' ||
      model?.capabilities?.vision === true
    );

    // Explicit/configured model that LM Studio currently advertises as
    // runnable (including JIT-loadable models).
    if (
      preferredModel &&
      openAIModelIds.includes(preferredModel) &&
      isVisionCapable(this.findNativeModel(nativeModels, preferredModel))
    ) {
      return {
        id: preferredModel,
        nativeModel: this.findNativeModel(nativeModels, preferredModel),
        loaded: Boolean(
          this.findNativeModel(nativeModels, preferredModel)?.loaded_instances?.some(instance => instance?.id),
        ),
      };
    }

    // A configured model may name the native catalog key while the OpenAI API
    // advertises a loaded instance id. Resolve that alias before falling back.
    if (preferredModel) {
      const nativePreferred = this.findNativeModel(nativeModels, preferredModel);
      const loadedId = nativePreferred?.loaded_instances?.find(instance => instance?.id)?.id;
      if (loadedId && openAIModelIds.includes(loadedId) && isVisionCapable(nativePreferred)) {
        return { id: loadedId, nativeModel: nativePreferred, loaded: true };
      }

      // An explicitly advertised model is authoritative. Never replace a
      // selected text-only model with a different vision model merely because
      // another vision model happens to be available.
      if (
        requiresVision &&
        openAIModelIds.includes(preferredModel) &&
        nativePreferred?.capabilities?.vision === false
      ) {
        return undefined;
      }

      // LM Studio can JIT-load a downloaded model that is not present in the
      // compatibility catalog yet. An explicit model ID is authoritative: do
      // not silently replace it with the first discovered model. If native
      // metadata knows the model is text-only, the vision guard above still
      // prevents sending an image to it.
      if (!nativePreferred || isVisionCapable(nativePreferred)) {
        return {
          id: preferredModel,
          nativeModel: nativePreferred,
          loaded: false,
        };
      }

      // An explicitly selected native text-only model must not be replaced
      // with a different vision model behind the user's back.
      return undefined;
    }

    // Prefer an already-loaded model to avoid unnecessary JIT churn.
    for (const model of nativeModels) {
      const loadedId = model.loaded_instances?.find(instance => instance?.id)?.id;
      if (
        loadedId &&
        (openAIModelIds.length === 0 || openAIModelIds.includes(loadedId)) &&
        isVisionCapable(model)
      ) {
        return { id: loadedId, nativeModel: model, loaded: true };
      }
    }

    // JIT mode: /v1/models advertises downloaded models that can be loaded on
    // first inference even though native loaded_instances is empty.
    const jitId = openAIModelIds.find(id => isVisionCapable(this.findNativeModel(nativeModels, id)));
    if (jitId) {
      return {
        id: jitId,
        nativeModel: this.findNativeModel(nativeModels, jitId),
        loaded: false,
      };
    }

    return undefined;
  }

  protected normalizeRequest(request: AIRequest): any {
    const messages = request.messages.map(message => {
      const image = imageFromMessage(message);
      if (image) {
        return {
          role: message.role,
          content: [
            { type: 'text', text: textFromMessageContent(message.content) },
            { type: 'image_url', image_url: { url: image } },
          ],
        };
      }

      return {
        role: message.role,
        content: message.content,
      };
    });

    return {
      model: request.model || this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      // This provider consumes a JSON completion response. Streaming requests
      // must use a dedicated SSE path rather than asking response.json() to
      // parse an event stream.
      stream: false,
      ...(request.responseFormat && { response_format: request.responseFormat }),
    };
  }

  protected normalizeResponse(response: any, metadata: any): AIResponse {
    const choice = response.choices?.[0];
    const usage = response.usage;

    return {
      id: response.id || `lm_${Date.now()}`,
      object: response.object || 'chat.completion',
      created: response.created || Math.floor(Date.now() / 1000),
      model: response.model || this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: choice?.message?.role || 'assistant',
            content: textFromCompletionMessage(choice?.message),
          },
          finishReason: choice?.finish_reason || 'stop',
        },
      ],
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        cost: 0,
      },
      metadata: {
        provider: 'lm-studio',
        latency: metadata.latency,
        modelUsed: response.model || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false,
      },
    };
  }
}
