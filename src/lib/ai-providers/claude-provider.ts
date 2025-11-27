/**
 * Anthropic Claude Provider Implementation
 * Direct Claude API access with superior reasoning
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

export class ClaudeProvider extends BaseProvider {
  constructor(config: any) {
    super({
      name: 'claude',
      baseUrl: 'https://api.anthropic.com/v1',
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
      capabilities: {
        text: true,
        vision: true,
        streaming: true,
        functionCalling: true,
        jsonMode: true,
        maxTokens: 8192,
        contextWindow: 200000, // 200K tokens for Claude 3
        supportsBatching: true,
        realtime: false,
        ...config.capabilities
      },
      pricing: {
        input: 0.8, // $0.80 per 1M input tokens
        output: 4.0, // $4.00 per 1M output tokens
        currency: 'USD',
        visionCostPerImage: 0.01,
        ...config.pricing
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      // Claude doesn't have a models endpoint, just verify key
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      return response.status !== 401;
    } catch (error) {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const normalizedRequest = this.normalizeRequest(request);

    try {
      const response = await fetch(`${this.config.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          ...(normalizedRequest.system && { 'anthropic-system-hint': normalizedRequest.system })
        },
        body: JSON.stringify(normalizedRequest),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${error.error?.message || 'Unknown error'}`
        );
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
    let systemPrompt = '';
    const messages: any[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else {
        const content: any = { type: 'text', text: msg.content };

        if (msg.image) {
          // Claude expects base64 encoded image with source
          const imageData = msg.image.split(',')[1];
          content.type = 'image';
          content.source = {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageData
          };
        }

        messages.push({
          role: msg.role,
          content: msg.image ? [content] : msg.content
        });
      }
    }

    const result: any = {
      model: request.model || this.config.model,
      messages,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
      ...(systemPrompt && { system: systemPrompt }),
      ...(request.topP && { top_p: request.topP }),
      ...(request.topK && { top_k: request.topK })
    };

    return result;
  }

  protected normalizeResponse(response: any, metadata: any): AIResponse {
    const content = response.content?.[0];
    const text = content?.type === 'text' ? content.text : '';

    return {
      id: response.id || `claude_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model || this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finishReason: response.stop_reason || 'stop'
        }
      ],
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens:
          (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        cost: this.calculateCost(
          response.usage?.input_tokens || 0,
          response.usage?.output_tokens || 0,
          0
        )
      },
      metadata: {
        provider: 'claude',
        latency: metadata.latency,
        modelUsed: response.model || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false
      }
    };
  }
}
