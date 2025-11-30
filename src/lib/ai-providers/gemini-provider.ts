/**
 * Google Gemini Provider Implementation
 * Fast, cost-effective with excellent vision capabilities
 */

import { BaseProvider, AIRequest, AIResponse } from './base-provider';

export class GeminiProvider extends BaseProvider {
  constructor(config: any) {
    super({
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
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
        maxTokens: 32768,
        contextWindow: 1048576, // 1M tokens
        supportsBatching: true,
        realtime: false,
        ...config.capabilities
      },
      pricing: {
        input: 0.075, // $0.075 per 1M tokens
        output: 0.3, // $0.30 per 1M tokens
        currency: 'USD',
        visionCostPerImage: 0.0025,
        ...config.pricing
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      // Check models availability
      const response = await fetch(
        `${this.config.baseUrl}/models?key=${this.config.apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const normalizedRequest = this.normalizeRequest(request);

    try {
      const response = await fetch(
        `${this.config.baseUrl}/models/${normalizedRequest.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(normalizedRequest),
          signal: AbortSignal.timeout(this.config.timeout)
        }
      );

      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
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
    const contents: any[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        const parts: any[] = [{ text: msg.content }];

        if (msg.image) {
          // Extract image data
          const imageData = msg.image.split(',')[1];
          parts.push({
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageData
            }
          });
        }

        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        });
      }
    }

    const genConfig: any = {
      temperature: request.temperature ?? this.config.temperature ?? 0.3,
      maxOutputTokens: request.maxTokens ?? this.config.maxTokens ?? 2000,
      topP: request.topP ?? this.config.topP ?? 0.95,
      topK: request.topK ?? this.config.topK ?? 40
    };

    if (request.responseFormat?.type === 'json_object') {
      genConfig.response_mime_type = 'application/json';
    }

    return {
      contents,
      generationConfig: genConfig
    };
  }

  protected normalizeResponse(response: any, metadata: any): AIResponse {
    const candidate = response.candidates?.[0];
    const content = candidate?.content?.parts?.[0];
    const usage = candidate?.usageMetadata;

    // Extract text from response
    let text = '';
    if (content?.parts) {
      text = content.parts.map((part: any) => part.text || '').join('');
    } else if (content?.text) {
      text = content.text;
    }

    return {
      id: `gemini_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.modelVersion || this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          finishReason: candidate?.finishReason || 'stop'
        }
      ],
      usage: {
        promptTokens: usage?.promptTokenCount || 0,
        completionTokens: usage?.candidatesTokenCount || 0,
        totalTokens: usage?.totalTokenCount || 0,
        cost: this.calculateCost(
          usage?.promptTokenCount || 0,
          usage?.candidatesTokenCount || 0,
          0
        )
      },
      metadata: {
        provider: 'gemini',
        latency: metadata.latency,
        modelUsed: response.modelVersion || this.config.model,
        cached: metadata.cached || false,
        batched: metadata.batched || false
      }
    };
  }
}
