/**
 * OpenRouter Provider Implementation
 * Supports multiple models with cost tracking and load balancing
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

export class OpenRouterProvider extends BaseProvider {
  constructor(config: any) {
    super({
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
      capabilities: {
        text: true,
        vision: true,
        streaming: true,
        functionCalling: true,
        jsonMode: true,
        maxTokens: 128000,
        contextWindow: 128000,
        supportsBatching: true,
        realtime: false,
        ...config.capabilities
      },
      pricing: {
        input: 0.1, // Default, varies by model
        output: 0.3,
        currency: 'USD',
        visionCostPerImage: 0.01,
        ...config.pricing
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': this.config.referer || 'http://localhost:3000',
          'X-Title': this.config.title || 'CannaAI Pro'
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
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.config.referer || 'http://localhost:3000',
          'X-Title': this.config.title || 'CannaAI Pro'
        },
        body: JSON.stringify(normalizedRequest),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = this.normalizeResponse(data, { latency });

      this.updateHealth(true, latency);
      this.recordMetrics(
        latency,
        aiResponse.usage?.promptTokens || 0,
        aiResponse.usage?.completionTokens || 0,
        aiResponse.usage?.cost || 0,
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
    const messages = request.messages.map(msg => {
      if (msg.image) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: {
                url: msg.image
              }
            }
          ]
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });

    return {
      model: request.model || this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      stream: request.stream ?? this.config.stream ?? false,
      top_p: request.topP ?? this.config.topP,
      top_k: request.topK ?? this.config.topK,
      ...(request.responseFormat && { response_format: request.responseFormat })
    };
  }

  protected normalizeResponse(response: any, metadata: any): AIResponse {
    const choice = response.choices?.[0];
    const usage = response.usage;

    return {
      id: response.id || `or_${Date.now()}`,
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
        cost: this.calculateCost(
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0,
          0
        )
      },
      metadata: {
        provider: 'openrouter',
        latency: metadata.latency,
        modelUsed: response.model || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false
      }
    };
  }
}
