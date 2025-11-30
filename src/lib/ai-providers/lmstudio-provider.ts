/**
 * LM Studio Provider Implementation
 * Local AI inference with no API costs
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

export class LMStudioProvider extends BaseProvider {
  constructor(config: any) {
    super({
      name: 'lm-studio',
      baseUrl: config.url || 'http://localhost:1234',
      timeout: 120000, // Longer timeout for local inference
      maxRetries: 1,
      retryDelay: 1000,
      ...config,
      capabilities: {
        text: true,
        vision: false, // Most local models don't support vision
        streaming: true,
        functionCalling: false,
        jsonMode: true,
        maxTokens: 4096,
        contextWindow: 8192,
        supportsBatching: false,
        realtime: false,
        ...config.capabilities
      },
      pricing: {
        input: 0, // Free
        output: 0,
        currency: 'USD',
        ...config.pricing
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if serverless (LM Studio won't work)
      if (process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return false;
      }

      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const normalizedRequest = this.normalizeRequest(request);

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(normalizedRequest),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Handle models that use reasoning_content instead of content
      if (!data.choices?.[0]?.message?.content && data.choices?.[0]?.message?.reasoning_content) {
        data.choices[0].message.content = data.choices[0].message.reasoning_content;
      }

      const aiResponse = this.normalizeResponse(data, { latency });

      this.updateHealth(true, latency);
      this.recordMetrics(
        latency,
        aiResponse.usage?.promptTokens || 0,
        aiResponse.usage?.completionTokens || 0,
        0, // No cost for local inference
        true
      );

      return aiResponse;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateHealth(false, latency, error as Error);
      this.recordMetrics(latency, 0, 0, 0, false);
      throw error;
    }
  }

  protected normalizeRequest(request: AIRequest): any {
    return {
      model: request.model || this.config.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      stream: request.stream ?? this.config.stream ?? false,
      ...(request.responseFormat && { response_format: request.responseFormat })
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
            content: choice?.message?.content || ''
          },
          finishReason: choice?.finish_reason || 'stop'
        }
      ],
      usage: {
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        cost: 0 // Free local inference
      },
      metadata: {
        provider: 'lm-studio',
        latency: metadata.latency,
        modelUsed: response.model || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false
      }
    };
  }
}
