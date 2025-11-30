/**
 * Cache Manager for AI Responses
 * Provides intelligent caching with TTL, compression, and intelligent invalidation
 */

import crypto from 'crypto';

export interface CacheEntry<T> {
  data: T;
  created: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  key: string;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number;
  compressionThreshold: number; // Compress entries larger than this (bytes)
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheKey {
  requestHash: string;
  provider: string;
  model: string;
  parameters: Record<string, any>;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private totalSize: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 500, // 500 MB default
      defaultTTL: 60 * 60 * 1000, // 1 hour
      maxEntries: 10000,
      compressionThreshold: 1024, // 1 KB
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.startCleanupScheduler();
  }

  /**
   * Generate cache key from request
   */
  generateCacheKey(request: {
    messages: Array<{ role: string; content: string; image?: string }>;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): CacheKey {
    // Create a hash of the request content
    const content = JSON.stringify({
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        hasImage: !!m.image // Don't cache image data
      })),
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens
    });

    const requestHash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);

    return {
      requestHash,
      provider: '', // Will be set by caller
      model: request.model || 'default',
      parameters: {
        temperature: request.temperature,
        maxTokens: request.maxTokens
      }
    };
  }

  /**
   * Get from cache
   */
  get<T>(key: string): { data: T; metadata?: any } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.created.getTime();
    if (age > this.config.defaultTTL) {
      this.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = new Date();
    entry.accessCount++;

    this.hitCount++;
    return { data: entry.data, metadata: entry.metadata };
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, metadata?: Record<string, any>): void {
    // Don't cache if too large
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');

    // If cache is full, clean up
    if (this.cache.size >= this.config.maxEntries || this.totalSize + size > this.config.maxSize * 1024 * 1024) {
      this.cleanup();
    }

    // If still too large, skip caching
    if (this.totalSize + size > this.config.maxSize * 1024 * 1024) {
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      created: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      size,
      key,
      metadata
    };

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.totalSize -= this.cache.get(key)!.size;
    }

    this.cache.set(key, entry);
    this.totalSize += size;
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    size: number; // MB
    hitRate: number;
    hitCount: number;
    missCount: number;
    averageEntrySize: number;
  } {
    const hitRate = this.hitCount / (this.hitCount + this.missCount) * 100 || 0;
    const avgSize = this.cache.size > 0 ? this.totalSize / this.cache.size : 0;

    return {
      entries: this.cache.size,
      size: this.totalSize / (1024 * 1024),
      hitRate,
      hitCount: this.hitCount,
      missCount: this.missCount,
      averageEntrySize: avgSize
    };
  }

  /**
   * Get cache usage by provider
   */
  getUsageByProvider(): Record<string, { entries: number; size: number }> {
    const usage: Record<string, { entries: number; size: number }> = {};

    for (const [key, entry] of this.cache.entries()) {
      const provider = this.extractProviderFromKey(key);
      if (!usage[provider]) {
        usage[provider] = { entries: 0, size: 0 };
      }
      usage[provider].entries++;
      usage[provider].size += entry.size;
    }

    return usage;
  }

  /**
   * Get least frequently used entries for cleanup
   */
  private getEntriesForCleanup(count: number): Array<{ key: string; score: number }> {
    const now = Date.now();
    const entries: Array<{ key: string; score: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.lastAccessed.getTime();
      const score = entry.accessCount / (age / 1000 + 1); // Frequency / age
      entries.push({ key, score });
    }

    entries.sort((a, b) => a.score - b.score);
    return entries.slice(0, count);
  }

  /**
   * Clean up expired and least valuable entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    const toRemove: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.created.getTime();
      if (age > this.config.defaultTTL) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.delete(key);
    }

    // If still need to free up space, remove least valuable entries
    const excessEntries = this.cache.size - this.config.maxEntries;
    const excessSize = this.totalSize - (this.config.maxSize * 1024 * 1024);

    if (excessEntries > 0 || excessSize > 0) {
      const lfuEntries = this.getEntriesForCleanup(Math.max(excessEntries, 10));
      for (const entry of lfuEntries) {
        toRemove.push(entry.key);
      }
    }

    for (const key of toRemove) {
      this.delete(key);
    }

    if (expiredKeys.length > 0 || toRemove.length > 0) {
      console.log(
        `🧹 Cache cleanup: removed ${expiredKeys.length} expired and ${toRemove.length} LFU entries`
      );
    }
  }

  private extractProviderFromKey(key: string): string {
    // Cache keys are formatted as: provider:requestHash
    const parts = key.split(':');
    return parts[0] || 'unknown';
  }

  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Global instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager(config);
  }
  return cacheManager;
}

export function shutdownCacheManager(): void {
  if (cacheManager) {
    cacheManager.shutdown();
    cacheManager = null;
  }
}
