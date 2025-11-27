/**
 * ========================================
 * Redis Client Configuration
 * ========================================
 * Production-ready Redis client with connection pooling
 */

import Redis from 'ioredis';

let redis: Redis;

// Create Redis client with connection pooling
export function createRedisClient(): Redis {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),

    // Connection Pool Settings
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST || '3', 10),
    enableOfflineQueue: false,
    enableReadyCheck: true,

    // Connection Settings
    connectTimeout: 10000,
    lazyConnect: true,
    keepAlive: process.env.REDIS_SOCKET_KEEPALIVE === 'true',
    family: 4, // IPv4

    // Retry Strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Reconnect on error
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      return err.message.includes(targetError);
    },

    // TLS (for cloud Redis)
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,

    // Sentinel mode
    sentinels: process.env.REDIS_SENTINELS ?
      process.env.REDIS_SENTINELS.split(',').map(h => ({ host: h.trim(), port: 26379 })) :
      undefined,
    name: process.env.REDIS_MASTER_NAME || undefined,

    // Cluster mode
    clusterEnabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    clusterNodes: process.env.REDIS_CLUSTER_NODES ?
      process.env.REDIS_CLUSTER_NODES.split(',').map(n => ({ host: n.trim().split(':')[0], port: parseInt(n.trim().split(':')[1] || '6379', 10) })) :
      [],
  };

  const client = new Redis(config);

  // Event handlers
  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('ready', () => {
    console.log('✅ Redis ready');
  });

  client.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  client.on('close', () => {
    console.warn('⚠️ Redis connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    console.log(`🔄 Redis reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    console.log('🔴 Redis connection ended');
  });

  return client;
}

// Initialize Redis client
redis = createRedisClient();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down Redis client...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down Redis client...');
  await redis.quit();
  process.exit(0);
});

// Cache utilities
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
}

export const cache = {
  // Get value
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  },

  // Set value
  async set(key: string, value: any, options?: CacheOptions): Promise<'OK' | null> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (options?.ttl) {
      return redis.setex(key, options.ttl, serialized);
    }

    const flags: string[] = [];
    if (options?.nx) flags.push('NX');
    if (options?.xx) flags.append('XX');

    if (flags.length > 0) {
      return redis.set(key, serialized, ...flags);
    }

    return redis.set(key, serialized);
  },

  // Delete key
  async del(key: string): Promise<number> {
    return redis.del(key);
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  },

  // Get multiple keys
  async mget(keys: string[]): Promise<(string | null)[]> {
    return redis.mget(...keys);
  },

  // Set multiple keys
  async mset(keyValuePairs: Record<string, any>): Promise<'OK'> {
    const pairs: string[] = [];
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      pairs.push(key, serialized);
    }
    return redis.mset(...pairs);
  },

  // Increment
  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  // Decrement
  async decr(key: string): Promise<number> {
    return redis.decr(key);
  },

  // Increment with expiration
  async incrby(key: string, amount: number, ttl?: number): Promise<number> {
    const pipeline = redis.pipeline();
    pipeline.incrby(key, amount);

    if (ttl) {
      pipeline.expire(key, ttl);
    }

    const results = await pipeline.exec();
    return results?.[0]?.[1] as number || 0;
  },

  // Set expiration
  async expire(key: string, ttl: number): Promise<boolean> {
    return (await redis.expire(key, ttl)) === 1;
  },

  // Get TTL
  async ttl(key: string): Promise<number> {
    return redis.ttl(key);
  },

  // Get all keys matching pattern
  async keys(pattern: string): Promise<string[]> {
    return redis.keys(pattern);
  },

  // Delete by pattern
  async delPattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return redis.del(...keys);
  },

  // Hash operations
  async hset(key: string, field: string, value: any): Promise<number> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return redis.hset(key, field, serialized);
  },

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await redis.hget(key, field);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  },

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const result = await redis.hgetall(key);
    const parsed: Record<string, T> = {};

    for (const [field, value] of Object.entries(result)) {
      try {
        parsed[field] = JSON.parse(value);
      } catch {
        parsed[field] = value as any;
      }
    }

    return parsed;
  },

  // List operations
  async lpush(key: string, ...values: any[]): Promise<number> {
    const serialized = values.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    return redis.lpush(key, ...serialized);
  },

  async rpop<T>(key: string): Promise<T | null> {
    const value = await redis.rpop(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  },

  // Publish/Subscribe for real-time features
  async publish(channel: string, message: any): Promise<number> {
    const serialized = typeof message === 'string' ? message : JSON.stringify(message);
    return redis.publish(channel, serialized);
  },

  // Pipeline for batch operations
  pipeline(): Redis.Pipeline {
    return redis.pipeline();
  },

  // Lua script for atomic operations
  async eval(script: string, keys: string[], args: any[]): Promise<any> {
    const serializedArgs = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    );

    return redis.eval(script, keys.length, ...keys, ...serializedArgs);
  },

  // Connection info
  async getInfo(): Promise<string> {
    return redis.info();
  },

  // Health check
  async health(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;

    return {
      status: pong === 'PONG' ? 'healthy' : 'unhealthy',
      latency,
    };
  },
};

// Export both default and named exports
export default redis;
export { redis };
