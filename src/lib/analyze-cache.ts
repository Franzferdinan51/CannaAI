/**
 * Result cache for /api/analyze
 *
 * Keyed on a SHA-1 of the image (if present) PLUS a normalized signature of
 * the text inputs (strain, growth stage, medium, symptoms, ph, env). Cached
 * entries are bounded by TTL and total size so they cannot leak memory.
 *
 * Caching is opportunistic: cache hits return instantly with a `cached: true`
 * flag so the frontend can show "previously analyzed" UI. Cache misses flow
 * through to the AI provider unchanged.
 */

import crypto from 'crypto';

export interface AnalyzeCacheKey {
  imageBase64?: string | null;
  strain?: string;
  growthStage?: string;
  medium?: string;
  leafSymptoms?: string;
  phLevel?: string | number;
  temperature?: string | number;
  humidity?: string | number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  insertedAt: number;
  hits: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes — fresh enough that re-photoing a plant after watering is a new read
const DEFAULT_MAX_ENTRIES = 200;
const DEFAULT_MAX_BYTES = 32 * 1024 * 1024; // 32 MB ceiling on aggregate cached payloads

interface CacheConfig {
  ttlMs: number;
  maxEntries: number;
  maxBytes: number;
  enabled: boolean;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function readConfig(): CacheConfig {
  return {
    ttlMs: Number(process.env.ANALYZE_CACHE_TTL_MS) || DEFAULT_TTL_MS,
    maxEntries: Number(process.env.ANALYZE_CACHE_MAX_ENTRIES) || DEFAULT_MAX_ENTRIES,
    maxBytes: Number(process.env.ANALYZE_CACHE_MAX_BYTES) || DEFAULT_MAX_BYTES,
    enabled: envBool('ANALYZE_CACHE_ENABLED', true),
  };
}

class AnalyzeCache {
  private map = new Map<string, CacheEntry>();
  private totalBytes = 0;
  private stats = { hits: 0, misses: 0, evictions: 0, disabled: 0, errors: 0 };

  /**
   * Build a stable cache key from an analyze request. Image bytes are hashed
   * (so cache keys are tiny); text fields are normalized (lowercased, trimmed)
   * so trivial input variants map to the same cache entry.
   */
  buildKey(input: AnalyzeCacheKey): string {
    let imageHash = '';
    if (input.imageBase64 && typeof input.imageBase64 === 'string') {
      const cleaned = input.imageBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
      try {
        // sha1 is fast and we don't need cryptographic collision resistance —
        // we only need identical inputs to produce identical keys.
        imageHash = crypto.createHash('sha1').update(cleaned).digest('hex');
      } catch {
        imageHash = '';
      }
    }
    const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
    return [
      imageHash || 'noimage',
      norm(input.strain),
      norm(input.growthStage),
      norm(input.medium),
      norm(input.leafSymptoms),
      norm(input.phLevel),
      norm(input.temperature),
      norm(input.humidity),
    ].join('|');
  }

  get<T = unknown>(key: string): T | null {
    const cfg = readConfig();
    if (!cfg.enabled) {
      this.stats.disabled++;
      return null;
    }
    try {
      const entry = this.map.get(key);
      if (!entry) {
        this.stats.misses++;
        return null;
      }
      if (Date.now() - entry.insertedAt > cfg.ttlMs) {
        this.map.delete(key);
        this.stats.misses++;
        return null;
      }
      entry.hits++;
      this.stats.hits++;
      // LRU touch
      this.map.delete(key);
      this.map.set(key, entry);
      return entry.value as T;
    } catch (e) {
      this.stats.errors++;
      return null;
    }
  }

  set<T = unknown>(key: string, value: T): void {
    const cfg = readConfig();
    if (!cfg.enabled) return;
    try {
      const size = approxSizeOf(value);
      if (size > cfg.maxBytes / 4) {
        // Single entry larger than 25% of the budget — don't pollute the cache.
        return;
      }
      const existing = this.map.get(key);
      if (existing) {
        this.totalBytes -= approxSizeOf(existing.value);
        this.map.delete(key);
      }
      const entry: CacheEntry<T> = {
        key,
        value,
        insertedAt: Date.now(),
        hits: 0,
      };
      this.map.set(key, entry);
      this.totalBytes += size;

      this.enforceLimits(cfg);
    } catch (e) {
      this.stats.errors++;
    }
  }

  clear(): void {
    this.map.clear();
    this.totalBytes = 0;
  }

  /** Snapshot for /api/health diagnostics or tests. */
  describe() {
    return {
      enabled: readConfig().enabled,
      entries: this.map.size,
      totalBytesApprox: this.totalBytes,
      stats: { ...this.stats },
    };
  }

  private enforceLimits(cfg: CacheConfig) {
    while (this.map.size > cfg.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.map.get(oldestKey);
      this.map.delete(oldestKey);
      if (oldest) this.totalBytes -= approxSizeOf(oldest.value);
      this.stats.evictions++;
    }
    while (this.totalBytes > cfg.maxBytes && this.map.size > 0) {
      const oldestKey = this.map.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.map.get(oldestKey);
      this.map.delete(oldestKey);
      if (oldest) this.totalBytes -= approxSizeOf(oldest.value);
      this.stats.evictions++;
    }
  }
}

function approxSizeOf(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    // Circular refs etc. — be conservative and assume large.
    return 1024 * 1024;
  }
}

let singleton: AnalyzeCache | null = null;
export function getAnalyzeCache(): AnalyzeCache {
  if (!singleton) singleton = new AnalyzeCache();
  return singleton;
}
