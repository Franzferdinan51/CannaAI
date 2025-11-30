/**
 * Perplexity AI Provider Implementation
 * Research-focused with web browsing capabilities
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

export class PerplexityProvider extends BaseProvider {
  constructor(config: any) {
    super({
      name: 'perplexity',
      baseUrl: 'https://api.perplexity.ai',
      timeout: 60000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
      capabilities: {
        text: true,
        vision: false, // Perplexity focuses on text
        streaming: true,
        functionCalling: false,
        jsonMode: true,
        maxTokens: 32768,
        contextWindow: 131072, // 128K tokens
        supportsBatching: true,
        realtime: false,
        ...config.capabilities
      },
      pricing: {
        input: 0.2, // Research-focused pricing
        output: 0.6,
        currency: 'USD',
        ...config.pricing
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      // Test with a simple request
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      return response.ok || response.status === 400; // 400 is ok (just invalid request)
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(normalizedRequest),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText}`
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
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Perplexity specific: can enable web search with search_recency
    return {
      model: request.model || this.config.model,
      messages,
      temperature: request.temperature ?? this.config.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      top_p: request.topP ?? this.config.topP ?? 0.95,
      stream: request.stream ?? this.config.stream ?? false,
      return_citations: true, // Perplexity specific
      search_recency_filter: 'month', // Can be 'day', 'week', 'month', 'year'
      ...(request.responseFormat && { response_format: request.responseFormat })
    };
  }

  protected normalizeResponse(response: any, metadata: any): AIResponse {
    const choice = response.choices?.[0];
    const usage = response.usage;

    // Extract citations if present
    const content = choice?.message?.content || '';
    let parsedContent = content;
    let citations: string[] = [];

    try {
      // Try to parse citations from the response
      if (response.citations && Array.isArray(response.citations)) {
        citations = response.citations;
      }
    } catch (error) {
      // Ignore citation parsing errors
    }

    return {
      id: response.id || `perplexity_${Date.now()}`,
      object: response.object || 'chat.completion',
      created: response.created || Math.floor(Date.now() / 1000),
      model: response.model || this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: choice?.message?.role || 'assistant',
            content: parsedContent
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
        provider: 'perplexity',
        latency: metadata.latency,
        modelUsed: response.model || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false,
        citations: citations.length > 0 ? citations : undefined
      }
    };
  }
}
