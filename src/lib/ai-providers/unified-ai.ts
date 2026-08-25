/**
 * Unified AI Interface
 * Provides a single API for all AI operations with advanced features
 */

import { getProviderManager, SelectionCriteria } from './provider-manager';
import { getCacheManager } from './cache-manager';
import { getCostTracker } from './cost-tracker';
import { AIRequest, AIResponse } from './base-provider';

export interface UnifiedAIConfig {
  defaultProvider?: string;
  enableCaching: boolean;
  enableCostTracking: boolean;
  enableQualityScoring: boolean;
  maxRetries: number;
  defaultTimeout: number;
}

export interface PromptVersion {
  id: string;
  version: string;
  content: string;
  metadata: {
    created: Date;
    createdBy: string;
    description?: string;
    tags?: string[];
    isActive: boolean;
    performance?: {
      averageScore: number;
      usageCount: number;
      successRate: number;
    };
  };
}

export interface QualityScore {
  overall: number; // 0-100
  relevance: number;
  accuracy: number;
  completeness: number;
  clarity: number;
  usefulness: number;
  source: 'heuristic';
  feedback?: {
    userRating?: number;
    issues?: string[];
    improvements?: string[];
  };
}

export interface ConversationContext {
  sessionId: string;
  systemPrompt?: string;
  history: Array<{ role: string; content: string }>;
  metadata?: Record<string, any>;
}

export interface UnifiedAIRequest {
  type: 'text' | 'vision' | 'analysis' | 'chat';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    image?: string;
  }>;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  conversationId?: string;
  promptVersion?: string;
  quality?: 'balanced' | 'speed' | 'quality' | 'cost';
  requireVision?: boolean;
  context?: ConversationContext;
  metadata?: Record<string, any>;
}

export interface UnifiedAIResponse {
  id: string;
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  metadata: {
    latency: number;
    cached: boolean;
    qualityScore?: QualityScore;
    version?: string;
    experimentId?: string;
  };
  conversationId?: string;
}

export class UnifiedAI {
  private config: UnifiedAIConfig;
  private providerManager = getProviderManager();
  private cacheManager = getCacheManager();
  private costTracker = getCostTracker();
  private promptVersions: Map<string, PromptVersion> = new Map();

  constructor(config: Partial<UnifiedAIConfig> = {}) {
    this.config = {
      enableCaching: true,
      enableCostTracking: true,
      enableQualityScoring: false,
      maxRetries: 3,
      defaultTimeout: 60000,
      ...config
    };

    this.initializeDefaultPrompts();
  }

  /**
   * Execute AI request with unified interface
   */
  async execute(request: UnifiedAIRequest): Promise<UnifiedAIResponse> {
    const startTime = Date.now();

    try {
      // Add conversation history if provided
      if (request.conversationId) {
        const history = this.providerManager.getConversationHistory(request.conversationId);
        request.messages = [
          ...history.map(message => ({
            role: message.role as 'system' | 'user' | 'assistant',
            content: message.content,
          })),
          ...request.messages
        ];
      }

      // Apply prompt version if specified
      if (request.promptVersion) {
        request = this.applyPromptVersion(request);
      }

      // Generate cache key
      const cacheKey = this.cacheManager.generateCacheKey({
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      });

      // Check cache first
      if (this.config.enableCaching && !request.stream) {
        const cached = this.cacheManager.get<AIResponse>(cacheKey.requestHash);
        if (cached) {
          return {
            id: `cache_${Date.now()}`,
            content: cached.data.choices[0].message.content,
            provider: cached.data.metadata?.provider || 'cache',
            model: request.model || 'cached',
            usage: cached.data.usage
              ? {
                  promptTokens: cached.data.usage.promptTokens,
                  completionTokens: cached.data.usage.completionTokens,
                  totalTokens: cached.data.usage.totalTokens,
                  cost: cached.data.usage.cost ?? 0,
                }
              : { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
            metadata: {
              latency: Date.now() - startTime,
              cached: true,
              qualityScore: cached.metadata?.qualityScore
            },
            conversationId: request.conversationId
          };
        }
      }

      // Build selection criteria
      const criteria: SelectionCriteria = {
        requireVision: request.requireVision,
        preferredProvider: request.provider,
        quality: request.quality,
        maxCost: request.metadata?.maxCost
      };

      // Build AI request
      const aiRequest: AIRequest = {
        messages: request.messages,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: request.stream,
        metadata: request.metadata
      };

      // Execute request
      const response = await this.providerManager.execute(aiRequest, criteria);

      // Calculate quality score if enabled
      let qualityScore: QualityScore | undefined;
      if (this.config.enableQualityScoring) {
        qualityScore = await this.calculateQualityScore(request, response);
      }

      // Record cost
      if (this.config.enableCostTracking && response.usage?.cost !== undefined) {
        this.costTracker.record({
          provider: response.metadata.provider,
          model: response.metadata.modelUsed,
          requestId: response.id,
          tokensIn: response.usage.promptTokens,
          tokensOut: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          cost: response.usage.cost,
          requestType: request.type,
          metadata: {
            qualityScore: qualityScore?.overall,
            latency: response.metadata.latency
          }
        });
      }

      // Cache response
      if (this.config.enableCaching && !request.stream) {
        this.cacheManager.set(cacheKey.requestHash, response, { qualityScore });
      }

      // Save conversation history
      if (request.conversationId) {
        for (const message of request.messages) {
          this.providerManager.addToConversation(request.conversationId, {
            role: message.role,
            content: message.content
          });
        }
        // Add assistant response
        this.providerManager.addToConversation(request.conversationId, {
          role: 'assistant',
          content: response.choices[0].message.content
        });
      }

      const unifiedResponse: UnifiedAIResponse = {
        id: response.id,
        content: response.choices[0].message.content,
        provider: response.metadata.provider,
        model: response.metadata.modelUsed,
        usage: {
          promptTokens: response.usage?.promptTokens ?? 0,
          completionTokens: response.usage?.completionTokens ?? 0,
          totalTokens: response.usage?.totalTokens ?? 0,
          cost: response.usage?.cost ?? 0,
        },
        metadata: {
          latency: response.metadata.latency,
          cached: response.metadata.cached || false,
          qualityScore,
          version: request.promptVersion
        },
        conversationId: request.conversationId
      };

      return unifiedResponse;

    } catch (error) {
      const latency = Date.now() - startTime;
      throw new Error(`AI execution failed: ${error instanceof Error ? error.message : 'Unknown error'} (${latency}ms)`);
    }
  }

  /**
   * Add prompt version
   */
  addPromptVersion(version: Omit<PromptVersion, 'id'>): string {
    const id = `prompt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.promptVersions.set(id, {
      ...version,
      id,
      metadata: {
        ...version.metadata,
        performance: version.metadata.performance || {
          averageScore: 0,
          usageCount: 0,
          successRate: 100
        }
      }
    });
    return id;
  }

  /**
   * Get prompt version
   */
  getPromptVersion(id: string): PromptVersion | undefined {
    return this.promptVersions.get(id);
  }

  /**
   * Get all prompt versions
   */
  getPromptVersions(): PromptVersion[] {
    return Array.from(this.promptVersions.values());
  }

  /**
   * Activate/deactivate prompt version
   */
  setPromptVersionActive(id: string, active: boolean): void {
    const version = this.promptVersions.get(id);
    if (version) {
      version.metadata.isActive = active;
      this.promptVersions.set(id, version);
    }
  }

  /**
   * Update prompt version performance
   */
  updatePromptVersionPerformance(id: string, score: number, success: boolean): void {
    const version = this.promptVersions.get(id);
    if (version) {
      const perf = version.metadata.performance!;
      perf.usageCount++;
      perf.averageScore = ((perf.averageScore * (perf.usageCount - 1)) + score) / perf.usageCount;
      if (!success) {
        perf.successRate = ((perf.successRate * (perf.usageCount - 1)) + 0) / perf.usageCount;
      }
      this.promptVersions.set(id, version);
    }
  }

  /**
   * A/B test prompts
   */
  async runPromptExperiment(
    basePromptId: string,
    variantPromptId: string,
    trafficSplit: number = 0.5,
    iterations: number = 100
  ): Promise<{
    base: { score: number; usage: number; cost: number };
    variant: { score: number; usage: number; cost: number };
    winner: string;
  }> {
    if (!this.promptVersions.has(basePromptId) || !this.promptVersions.has(variantPromptId)) {
      throw new Error('Prompt experiment requires two existing prompt versions.');
    }
    if (!Number.isFinite(trafficSplit) || trafficSplit < 0 || trafficSplit > 1) {
      throw new Error('trafficSplit must be between 0 and 1.');
    }
    if (!Number.isInteger(iterations) || iterations < 1) {
      throw new Error('iterations must be a positive integer.');
    }

    throw new Error(
      'Prompt experiments are unavailable until an evaluation request and scoring policy are configured; no experiment was run.'
    );
  }

  /**
   * Get provider status
   */
  getProviderStatus() {
    return this.providerManager.getProvidersStatus();
  }

  async refreshProviderHealth() {
    await this.providerManager.refreshProviderHealth();
    return this.getProviderStatus();
  }

  /**
   * Get cost summary
   */
  getCostSummary() {
    const tracked = this.costTracker.getSummary();
    const providerUsage = this.providerManager.getCostSummary();

    return {
      ...tracked,
      // Cost records and provider metrics are maintained by separate layers.
      // Prefer the provider metrics for usage totals because providers also
      // record successful requests that have zero monetary cost (LM Studio).
      totalRequests: providerUsage.totalRequests,
      totalTokens: providerUsage.totalTokens,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.providerManager.clearConversation(conversationId);
  }

  /**
   * Calculate quality score
   */
  private async calculateQualityScore(
    request: UnifiedAIRequest,
    response: AIResponse
  ): Promise<QualityScore> {
    // These are transparent response-shape heuristics, not factual evaluation.
    // Accuracy and usefulness cannot be inferred reliably without a rubric,
    // reference answer, or user feedback, so they are deliberately estimates.
    const content = response.choices[0].message.content;
    const responseLength = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / (words.length || 1);
    const userText = request.messages
      .filter(message => message.role === 'user')
      .map(message => message.content.toLowerCase())
      .join(' ');
    const userTerms = new Set((userText.match(/[a-z0-9]{4,}/g) || []).slice(0, 50));
    const responseTerms = new Set((content.toLowerCase().match(/[a-z0-9]{4,}/g) || []));
    const overlap = [...userTerms].filter(term => responseTerms.has(term)).length;
    const relevance = userTerms.size ? Math.min(100, 40 + Math.round((overlap / userTerms.size) * 60)) : 50;
    const accuracy = 50;
    const completeness = responseLength > 100 ? 85 : 60;
    const clarity = avgWordLength > 3 && avgWordLength < 8 ? 85 : 70;
    const usefulness = /\b(step|recommend|try|because|warning|next)\b/i.test(content) ? 75 : 50;

    const overall = (relevance + accuracy + completeness + clarity + usefulness) / 5;

    return {
      overall: Math.round(overall),
      relevance,
      accuracy,
      completeness,
      clarity,
      usefulness,
      source: 'heuristic'
    };
  }

  /**
   * Apply prompt version to request
   */
  private applyPromptVersion(request: UnifiedAIRequest): UnifiedAIRequest {
    const version = this.promptVersions.get(request.promptVersion!);
    if (version) {
      // Replace system prompt with version
      const messages = [...request.messages];
      const systemIndex = messages.findIndex(m => m.role === 'system');
      if (systemIndex >= 0) {
        messages[systemIndex] = {
          role: 'system',
          content: version.content
        };
      } else {
        messages.unshift({
          role: 'system',
          content: version.content
        });
      }

      this.updatePromptVersionPerformance(request.promptVersion!, 0, true); // Mark as used

      return { ...request, messages };
    }

    return request;
  }

  /**
   * Initialize default prompts
   */
  private initializeDefaultPrompts(): void {
    this.addPromptVersion({
      version: '1.0',
      content: 'You are CultivAI Assistant, an expert cannabis cultivation AI. You provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.',
      metadata: {
        created: new Date(),
        createdBy: 'system',
        description: 'Default cannabis cultivation assistant prompt',
        tags: ['cannabis', 'cultivation', 'default'],
        isActive: true
      }
    });

    this.addPromptVersion({
      version: '1.0-analysis',
      content: 'You are an expert cannabis cultivation specialist with deep knowledge of plant physiology, nutrient deficiencies, pests, diseases, and strain-specific characteristics. You provide detailed, accurate analysis with clear reasoning.',
      metadata: {
        created: new Date(),
        createdBy: 'system',
        description: 'Default plant analysis prompt',
        tags: ['cannabis', 'analysis', 'diagnosis'],
        isActive: true
      }
    });
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Cleanup is handled by individual managers
  }
}

// Global instance
let unifiedAI: UnifiedAI | null = null;

export function getUnifiedAI(config?: Partial<UnifiedAIConfig>): UnifiedAI {
  if (!unifiedAI) {
    unifiedAI = new UnifiedAI(config);
  }
  return unifiedAI;
}

export function shutdownUnifiedAI(): void {
  if (unifiedAI) {
    unifiedAI.shutdown();
    unifiedAI = null;
  }
}
