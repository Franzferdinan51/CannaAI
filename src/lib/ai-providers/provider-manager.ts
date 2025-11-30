/**
 * Provider Manager
 * Orchestrates multiple AI providers with intelligent selection, load balancing, and fallback
 */

import { OpenRouterProvider } from './openrouter-provider';
import { LMStudioProvider } from './lmstudio-provider';
import { GeminiProvider } from './gemini-provider';
import { GroqProvider } from './groq-provider';
import { TogetherProvider } from './together-provider';
import { ClaudeProvider } from './claude-provider';
import { PerplexityProvider } from './perplexity-provider';
import { BaseProvider, AIRequest, AIResponse, ProviderHealth } from './base-provider';

export interface SelectionCriteria {
  requireVision?: boolean;
  requireStreaming?: boolean;
  maxLatency?: number;
  maxCost?: number;
  minSuccessRate?: number;
  preferredProvider?: string;
  excludeProviders?: string[];
  requestType?: 'analysis' | 'chat' | 'research' | 'vision';
  quality?: 'balanced' | 'speed' | 'quality' | 'cost';
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'weighted' | 'latency-based' | 'cost-based' | 'performance-based';
  weights?: Record<string, number>;
}

export interface ProviderPool {
  providers: BaseProvider[];
  weights: Map<string, number>;
  lastUsed: Map<string, number>;
  requestCount: Map<string, number>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

export class ProviderManager {
  private pool: ProviderPool;
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private lastHealthCheck: Map<string, Date> = new Map();
  private healthCheckInterval: number = 30000; // 30 seconds
  private loadBalancerIndex: number = 0;

  // Conversation memory
  private conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();

  // Request batching
  private batchQueue: Map<string, AIRequest[]> = new Map();
  private batchTimeout: number = 100; // ms
  private batchProcessors: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.pool = {
      providers: [],
      weights: new Map(),
      lastUsed: new Map(),
      requestCount: new Map()
    };

    this.initializeProviders();
    this.startHealthChecks();
  }

  private initializeProviders(): void {
    const configs = {
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
        referer: process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
        title: 'CannaAI Pro'
      },
      'lm-studio': {
        url: process.env.LM_STUDIO_URL || 'http://localhost:1234',
        model: process.env.LM_STUDIO_MODEL || 'granite-4.0-micro',
        apiKey: process.env.LM_STUDIO_API_KEY
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro'
      },
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
      },
      together: {
        apiKey: process.env.TOGETHER_API_KEY,
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.1-8B-Instruct-Turbo'
      },
      claude: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
      },
      perplexity: {
        apiKey: process.env.PERPLEXITY_API_KEY,
        model: process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online'
      }
    };

    // Initialize all providers
    if (configs.openrouter.apiKey || process.env.NODE_ENV === 'development') {
      this.pool.providers.push(new OpenRouterProvider(configs.openrouter));
      this.pool.weights.set('openrouter', 1.0);
    }

    if (!process.env.NETLIFY && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.pool.providers.push(new LMStudioProvider(configs['lm-studio']));
      this.pool.weights.set('lm-studio', 0.9);
    }

    if (configs.gemini.apiKey) {
      this.pool.providers.push(new GeminiProvider(configs.gemini));
      this.pool.weights.set('gemini', 0.95);
    }

    if (configs.groq.apiKey) {
      this.pool.providers.push(new GroqProvider(configs.groq));
      this.pool.weights.set('groq', 0.9);
    }

    if (configs.together.apiKey) {
      this.pool.providers.push(new TogetherProvider(configs.together));
      this.pool.weights.set('together', 0.85);
    }

    if (configs.claude.apiKey) {
      this.pool.providers.push(new ClaudeProvider(configs.claude));
      this.pool.weights.set('claude', 0.8);
    }

    if (configs.perplexity.apiKey) {
      this.pool.providers.push(new PerplexityProvider(configs.perplexity));
      this.pool.weights.set('perplexity', 0.8);
    }

    console.log(`🔌 Initialized ${this.pool.providers.length} AI providers`);
  }

  private startHealthChecks(): void {
    for (const provider of this.pool.providers) {
      this.scheduleHealthCheck(provider.config.name);
    }
  }

  private scheduleHealthCheck(providerName: string): void {
    const check = async () => {
      try {
        const provider = this.getProvider(providerName);
        if (provider) {
          const isAvailable = await provider.isAvailable();
          if (!isAvailable) {
            console.warn(`⚠️ Provider ${providerName} is not available`);
          }
        }
      } catch (error) {
        console.error(`Health check failed for ${providerName}:`, error);
      } finally {
        // Schedule next check
        this.healthChecks.set(
          providerName,
          setTimeout(check, this.healthCheckInterval)
        );
      }
    };

    check();
  }

  /**
   * Execute AI request with intelligent provider selection
   */
  async execute(
    request: AIRequest,
    criteria: SelectionCriteria = {},
    strategy: LoadBalancingStrategy = { type: 'weighted' }
  ): Promise<AIResponse> {
    const providers = this.selectProviders(criteria);

    if (providers.length === 0) {
      throw new Error('No providers available matching criteria');
    }

    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      exponentialBase: 2,
      jitter: true
    };

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const response = await this.executeWithRetry(
          provider,
          request,
          retryConfig
        );

        // Update load balancer state
        this.updateLoadBalancer(provider.config.name);

        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider.config.name} failed:`, lastError.message);
        continue;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private async executeWithRetry(
    provider: BaseProvider,
    request: AIRequest,
    config: RetryConfig
  ): Promise<AIResponse> {
    let attempt = 0;
    let delay = config.baseDelay;

    while (attempt < config.maxAttempts) {
      try {
        const response = await provider.execute(request);
        return response;
      } catch (error) {
        attempt++;
        lastError = error as Error;

        if (attempt >= config.maxAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const backoffDelay = Math.min(delay * Math.pow(config.exponentialBase, attempt), config.maxDelay);
        const jitterDelay = config.jitter ? Math.random() * 0.1 * backoffDelay : 0;
        const finalDelay = backoffDelay + jitterDelay;

        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }

    throw lastError!;
  }

  /**
   * Select best providers based on criteria and strategy
   */
  private selectProviders(criteria: SelectionCriteria): BaseProvider[] {
    let availableProviders = this.pool.providers.filter(p => p.getHealth().status !== 'unhealthy');

    // Filter by requirements
    if (criteria.requireVision) {
      availableProviders = availableProviders.filter(p => p.getCapabilities().vision);
    }

    if (criteria.requireStreaming) {
      availableProviders = availableProviders.filter(p => p.getCapabilities().streaming);
    }

    if (criteria.maxLatency) {
      availableProviders = availableProviders.filter(p => p.getHealth().latency <= criteria.maxLatency!);
    }

    if (criteria.minSuccessRate) {
      availableProviders = availableProviders.filter(p => p.getHealth().successRate >= criteria.minSuccessRate!);
    }

    if (criteria.excludeProviders && criteria.excludeProviders.length > 0) {
      availableProviders = availableProviders.filter(p => !criteria.excludeProviders!.includes(p.config.name));
    }

    // Quality-based filtering
    if (criteria.quality) {
      switch (criteria.quality) {
        case 'speed':
          // Prefer providers with lowest latency
          availableProviders.sort((a, b) => a.getHealth().latency - b.getHealth().latency);
          break;
        case 'cost':
          // Prefer providers with lowest cost (LM Studio is free)
          availableProviders.sort((a, b) => {
            const aCost = a.estimateCost({
              messages: [{ role: 'user', content: '' }],
              maxTokens: 1000
            }).total;
            const bCost = b.estimateCost({
              messages: [{ role: 'user', content: '' }],
              maxTokens: 1000
            }).total;
            return aCost - bCost;
          });
          break;
        case 'quality':
          // Prefer providers with highest success rate
          availableProviders.sort((a, b) => b.getHealth().successRate - a.getHealth().successRate);
          break;
        case 'balanced':
          // Balance cost, latency, and success rate
          availableProviders.sort((a, b) => {
            const aScore = this.calculateScore(a);
            const bScore = this.calculateScore(b);
            return bScore - aScore;
          });
          break;
      }
    }

    // Prefer requested provider if available
    if (criteria.preferredProvider) {
      const preferredIndex = availableProviders.findIndex(p => p.config.name === criteria.preferredProvider);
      if (preferredIndex > 0) {
        const preferred = availableProviders.splice(preferredIndex, 1)[0];
        availableProviders.unshift(preferred);
      }
    }

    return availableProviders;
  }

  private calculateScore(provider: BaseProvider): number {
    const health = provider.getHealth();
    const cost = provider.estimateCost({
      messages: [{ role: 'user', content: '' }],
      maxTokens: 1000
    }).total;

    // Weighted score: success rate (40%), low latency (30%), low cost (20%), stability (10%)
    const successScore = health.successRate / 100;
    const latencyScore = Math.max(0, (10000 - health.latency) / 10000); // Lower is better
    const costScore = Math.max(0, (1 - cost)); // Lower is better
    const stabilityScore = Math.max(0, (100 - health.errorRate) / 100);

    return (
      successScore * 0.4 +
      latencyScore * 0.3 +
      costScore * 0.2 +
      stabilityScore * 0.1
    );
  }

  private updateLoadBalancer(providerName: string): void {
    this.pool.lastUsed.set(providerName, Date.now());
    this.pool.requestCount.set(
      providerName,
      (this.pool.requestCount.get(providerName) || 0) + 1
    );
  }

  private getProvider(name: string): BaseProvider | undefined {
    return this.pool.providers.find(p => p.config.name === name);
  }

  /**
   * Get all providers with their health and metrics
   */
  getProvidersStatus(): Array<{
    name: string;
    health: ProviderHealth;
    metrics: any;
    capabilities: any;
    cost: { input: number; output: number; total: number };
  }> {
    return this.pool.providers.map(provider => ({
      name: provider.config.name,
      health: provider.getHealth(),
      metrics: provider.getMetrics(),
      capabilities: provider.getCapabilities(),
      cost: provider.estimateCost({
        messages: [{ role: 'user', content: '' }],
        maxTokens: 1000
      })
    }));
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Add to conversation history
   */
  addToConversation(sessionId: string, message: { role: string; content: string }): void {
    const history = this.conversationHistory.get(sessionId) || [];
    history.push(message);
    // Limit history to last 50 messages to prevent memory issues
    if (history.length > 50) {
      history.shift();
    }
    this.conversationHistory.set(sessionId, history);
  }

  /**
   * Clear conversation history
   */
  clearConversation(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Get cost summary
   */
  getCostSummary(): {
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    byProvider: Record<string, { cost: number; requests: number }>;
  } {
    const byProvider: Record<string, { cost: number; requests: number }> = {};

    for (const provider of this.pool.providers) {
      const metrics = provider.getMetrics();
      byProvider[provider.config.name] = {
        cost: metrics.totalCost,
        requests: metrics.totalRequests
      };
    }

    const totalCost = Object.values(byProvider).reduce((sum, p) => sum + p.cost, 0);
    const totalRequests = Object.values(byProvider).reduce((sum, p) => sum + p.requests, 0);
    const totalTokens = this.pool.providers.reduce(
      (sum, p) => sum + p.getMetrics().totalTokens,
      0
    );

    return {
      totalCost,
      totalRequests,
      totalTokens,
      byProvider
    };
  }

  /**
   * Shutdown provider manager
   */
  shutdown(): void {
    // Clear all health check intervals
    for (const interval of this.healthChecks.values()) {
      clearTimeout(interval);
    }
    this.healthChecks.clear();

    // Clear all batch processors
    for (const interval of this.batchProcessors.values()) {
      clearTimeout(interval);
    }
    this.batchProcessors.clear();

    console.log('🔌 Provider manager shutdown complete');
  }
}

// Global instance
let providerManager: ProviderManager | null = null;

export function getProviderManager(): ProviderManager {
  if (!providerManager) {
    providerManager = new ProviderManager();
  }
  return providerManager;
}

export function shutdownProviderManager(): void {
  if (providerManager) {
    providerManager.shutdown();
    providerManager = null;
  }
}
