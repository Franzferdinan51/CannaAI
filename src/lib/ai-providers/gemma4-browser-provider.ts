/**
 * Gemma4 Browser Extension Provider
 *
 * This provider connects to the Gemma4 Chrome extension running locally
 * with WebGPU for on-device inference. No external API calls are made.
 *
 * Communication: Chrome message passing API (chrome.runtime.sendMessage)
 */

import { BaseProvider, AIRequest, AIResponse, ProviderHealth } from './base-provider';

export interface Gemma4ProviderConfig {
  model?: string;
  timeout?: number;
}

export class Gemma4BrowserProvider extends BaseProvider {
  private extensionId = 'gemma4-extension'; // Extension ID in Chrome
  private messagePort: chrome.runtime.Port | null = null;
  private isConnected = false;

  constructor(config: Gemma4ProviderConfig = {}) {
    const providerConfig = {
      name: 'gemma4-browser',
      baseUrl: 'chrome-extension://gemma4-extension',
      model: config.model || 'onnx-community/gemma-4-E2B-it-ONNX',
      timeout: config.timeout || 120000, // 2 minutes for local inference
      maxRetries: 1,
      capabilities: {
        text: true,
        vision: true, // Gemma4 supports vision
        streaming: false,
        functionCalling: false,
        jsonMode: false,
        maxTokens: 8192,
        contextWindow: 8192,
        supportsBatching: false,
        realtime: false,
      },
      pricing: {
        input: 0, // Free - runs locally
        output: 0,
        currency: 'USD',
      },
    };

    super(providerConfig);
  }

  /**
   * Check if the Gemma4 extension is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to ping the extension via message
      const response = await this.sendMessage({ type: 'ping' });
      return response?.status === 'ok';
    } catch (error) {
      console.warn('[Gemma4Provider] Extension not available:', error);
      return false;
    }
  }

  /**
   * Check provider health
   */
  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const available = await this.isAvailable();
      const latency = Date.now() - start;

      return {
        status: available ? 'healthy' : 'unhealthy',
        latency,
        errorRate: available ? 0 : 100,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        successRate: available ? 100 : 0,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        errorRate: 100,
        lastCheck: new Date(),
        consecutiveFailures: 1,
        successRate: 0,
      };
    }
  }

  /**
   * Send message to the extension
   */
  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use chrome.runtime.sendMessage for one-time messages
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(this.extensionId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error('Chrome extension API not available'));
      }
    });
  }

  /**
   * Execute AI request via the extension
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Format messages for the extension
      const messages = request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        image: msg.image || undefined,
      }));

      // Send request to extension
      const response = await this.sendMessage({
        type: 'chat',
        messages,
        model: request.model || this.config.model,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens || 8192,
      });

      const latency = Date.now() - startTime;

      if (!response || !response.content) {
        throw new Error('Invalid response from Gemma4 extension');
      }

      this.updateHealth(true, latency);
      this.recordMetrics(latency, response.usage?.totalTokens || 0, 0, 0, true);

      return {
        content: response.content,
        model: this.config.model,
        provider: this.config.name,
        usage: response.usage || {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        finishReason: response.finishReason || 'stop',
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.updateHealth(false, latency, error as Error);
      this.recordMetrics(latency, 0, 0, 0, false);

      throw new Error(`Gemma4 extension error: ${errorMessage}`);
    }
  }

  /**
   * Process image for vision support
   */
  async processImage(imageData: string): Promise<string> {
    // The extension handles image processing internally
    // Just return the base64 data
    return imageData;
  }

  /**
   * Get available models from extension
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.sendMessage({ type: 'models' });
      return response?.models || [this.config.model];
    } catch {
      return [this.config.model];
    }
  }

  /**
   * Normalize request for Gemma4 format
   */
  normalizeRequest(request: AIRequest): any {
    return {
      model: request.model || this.config.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 8192,
    };
  }
}

// Provider singleton
let gemma4Provider: Gemma4BrowserProvider | null = null;

export function getGemma4Provider(): Gemma4BrowserProvider {
  if (!gemma4Provider) {
    gemma4Provider = new Gemma4BrowserProvider();
  }
  return gemma4Provider;
}

export default Gemma4BrowserProvider;