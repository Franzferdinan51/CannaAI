/**
 * Base Provider Interface
 * All AI providers must implement this interface
 */

export interface ProviderCapabilities {
  text: boolean;
  vision: boolean;
  streaming: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
  maxTokens: number;
  contextWindow: number;
  supportsBatching: boolean;
  realtime: boolean;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number; // milliseconds
  errorRate: number; // percentage
  lastCheck: Date;
  consecutiveFailures: number;
  successRate: number; // percentage over last 100 requests
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

export interface ProviderMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  errorCount: number;
  timeoutCount: number;
  averageResponseTime: number;
  peakRPS: number;
  cacheHitRate: number;
}

export interface ProviderPricing {
  input: number; // cost per 1K tokens (input)
  output: number; // cost per 1K tokens (output)
  currency: string;
  visionCostPerImage?: number;
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl: string;
  model: string;
  version?: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  capabilities: ProviderCapabilities;
  pricing: ProviderPricing;
  region?: string;
  [key: string]: any;
}

export interface AIRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    image?: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
  responseFormat?: any;
  user?: string;
  metadata?: Record<string, any>;
  batchId?: string;
}

export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  metadata?: {
    provider: string;
    latency: number;
    cached?: boolean;
    batched?: boolean;
    modelUsed: string;
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedError?: (error: Error) => boolean;
}

export abstract class BaseProvider {
  public config: ProviderConfig;
  public health: ProviderHealth;
  public metrics: ProviderMetrics;
  protected circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailureTime?: number;
    nextAttempt?: number;
  };

  constructor(config: ProviderConfig) {
    this.config = config;
    this.health = {
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      successRate: 100
    };
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      successRate: 100,
      errorCount: 0,
      timeoutCount: 0,
      averageResponseTime: 0,
      peakRPS: 0,
      cacheHitRate: 0
    };
    this.circuitBreaker = {
      state: 'closed',
      failures: 0
    };
  }

  /**
   * Check if the provider is available and healthy
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Execute an AI request
   */
  abstract execute(request: AIRequest): Promise<AIResponse>;

  /**
   * Get health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Get metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatency: 0,
      successRate: 100,
      errorCount: 0,
      timeoutCount: 0,
      averageResponseTime: 0,
      peakRPS: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Update health metrics
   */
  protected updateHealth(success: boolean, latency: number, error?: Error): void {
    this.health.lastCheck = new Date();
    this.health.latency = latency;

    if (success) {
      this.health.consecutiveFailures = 0;
      this.circuitBreaker.failures = 0;
    } else {
      this.health.consecutiveFailures++;
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = Date.now();

      if (this.health.consecutiveFailures >= 5) {
        this.health.status = 'unhealthy';
        this.circuitBreaker.state = 'open';
      }
    }

    // Update success rate (simplified)
    const total = this.metrics.totalRequests || 1;
    this.health.successRate = ((total - this.metrics.errorCount) / total) * 100;
  }

  /**
   * Check circuit breaker state
   */
  protected checkCircuitBreaker(): boolean {
    if (this.circuitBreaker.state === 'closed') {
      return true;
    }

    if (this.circuitBreaker.state === 'open') {
      const now = Date.now();
      if (this.circuitBreaker.nextAttempt && now >= this.circuitBreaker.nextAttempt) {
        this.circuitBreaker.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open
    return true;
  }

  /**
   * Record request metrics
   */
  protected recordMetrics(
    latency: number,
    tokensIn: number,
    tokensOut: number,
    cost: number,
    success: boolean,
    fromCache: boolean = false
  ): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokensIn + tokensOut;
    this.metrics.totalCost += cost;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests;

    if (fromCache) {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (this.metrics.totalRequests - 1) + 100) /
        this.metrics.totalRequests;
    }

    if (!success) {
      this.metrics.errorCount++;
      if (this.health.status !== 'unhealthy') {
        this.health.status = 'degraded';
      }
    }
  }

  /**
   * Calculate cost based on tokens
   */
  protected calculateCost(tokensIn: number, tokensOut: number, images: number = 0): number {
    const cost =
      (tokensIn / 1000) * this.config.pricing.input +
      (tokensOut / 1000) * this.config.pricing.output;

    if (this.config.pricing.visionCostPerImage && images > 0) {
      return cost + images * this.config.pricing.visionCostPerImage;
    }

    return cost;
  }

  /**
   * Normalize request to provider-specific format
   */
  protected abstract normalizeRequest(request: AIRequest): any;

  /**
   * Normalize response from provider to standard format
   */
  protected abstract normalizeResponse(response: any, metadata: any): AIResponse;

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return { ...this.config.capabilities };
  }

  /**
   * Get pricing information
   */
  getPricing(): ProviderPricing {
    return { ...this.config.pricing };
  }

  /**
   * Get estimated cost for a request
   */
  estimateCost(request: AIRequest): { input: number; output: number; total: number } {
    const messagesText = request.messages.map(m => m.content).join(' ');
    const estimatedInputTokens = Math.ceil(messagesText.length / 4); // Rough estimate
    const estimatedOutputTokens = request.maxTokens || 500;

    return {
      input: (estimatedInputTokens / 1000) * this.config.pricing.input,
      output: (estimatedOutputTokens / 1000) * this.config.pricing.output,
      total:
        (estimatedInputTokens / 1000) * this.config.pricing.input +
        (estimatedOutputTokens / 1000) * this.config.pricing.output
    };
  }
}
