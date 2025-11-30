/**
 * ========================================
 * Rate Limiting Middleware
 * ========================================
 * Implements advanced rate limiting with Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redis } from './redis-client';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  skip?: (request: NextRequest) => boolean;
  onLimitReached?: (request: NextRequest, usedKey: string) => void;
  headers?: boolean;
  legacyHeaders?: boolean;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  totalHits: number;
}

const getIP = (request: NextRequest): string => {
  // Check for X-Forwarded-For header (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Check for X-Real-IP header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  return request.ip || '127.0.0.1';
};

const defaultKeyGenerator = (request: NextRequest): string => {
  const ip = getIP(request);
  const forwarded = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host') || 'localhost';

  return `rate-limit:${forwarded || 'http'}:${host}:${ip}`;
};

const hashKey = (key: string): string => {
  return createHash('sha256').update(key).digest('hex');
};

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; info: RateLimitInfo }> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    skip,
    onLimitReached,
    headers = true,
    legacyHeaders = false,
  } = config;

  // Check if we should skip this request
  if (skip && skip(request)) {
    return {
      success: true,
      info: {
        limit: maxRequests,
        remaining: maxRequests,
        reset: Date.now() + windowMs,
        totalHits: 0,
      },
    };
  }

  const key = keyGenerator(request);
  const hashedKey = hashKey(key);
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const redisKey = `ratelimit:${hashedKey}:${window}`;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Get current count
    pipeline.get(redisKey);

    // Increment counter
    pipeline.incr(redisKey);

    // Set expiry if it's a new key
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const [, currentCountResult, expireResult] = results as [null, any, any];
    const currentCount = parseInt(currentCountResult as string, 10) || 0;

    const totalHits = currentCount;
    const remaining = Math.max(0, maxRequests - totalHits);
    const reset = (window + 1) * windowMs;

    const info: RateLimitInfo = {
      limit: maxRequests,
      remaining,
      reset,
      totalHits,
    };

    // Check if limit exceeded
    const success = remaining >= 0;

    if (!success && onLimitReached) {
      onLimitReached(request, key);
    }

    // Track successful/failed requests if needed
    if (success) {
      const status = 200; // We would need to check this later
      if (skipSuccessfulRequests && status < 400) {
        // Decrement counter for successful request
        await redis.decr(redisKey);
      }
    }

    return { success, info };

  } catch (error) {
    console.error('Rate limiting error:', error);

    // Fail open - allow request if Redis is down
    return {
      success: true,
      info: {
        limit: maxRequests,
        remaining: maxRequests,
        reset: Date.now() + windowMs,
        totalHits: 0,
      },
    };
  }
}

// Helper function to add rate limit headers to response
export function addRateLimitHeaders(
  response: NextResponse,
  info: RateLimitInfo,
  headers: boolean = true,
  legacyHeaders: boolean = false
): NextResponse {
  if (!headers) {
    return response;
  }

  // Standard headers (RFC 9333)
  response.headers.set('X-RateLimit-Limit', info.limit.toString());
  response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(info.reset / 1000).toString());

  // Legacy headers (deprecated but still used)
  if (legacyHeaders) {
    response.headers.set('Retry-After', Math.ceil((info.reset - Date.now()) / 1000).toString());
  }

  return response;
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Strict API rate limiting
  strict: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // General API rate limiting
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: true,
  },

  // Chat/analysis endpoint
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    skipSuccessfulRequests: false,
  },

  // Upload endpoint
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    skipSuccessfulRequests: false,
  },

  // Authentication endpoints (very strict)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Search endpoint
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    skipSuccessfulRequests: true,
  },
};

// Middleware wrapper
export function withRateLimit(
  config: RateLimitConfig
) {
  return async (request: NextRequest) => {
    const { success, info } = await rateLimit(request, config);

    if (!success) {
      const response = new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          limit: info.limit,
          remaining: info.remaining,
          reset: info.reset,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((info.reset - Date.now()) / 1000).toString(),
          },
        }
      );

      return addRateLimitHeaders(response, info, config.headers, config.legacyHeaders);
    }

    const response = NextResponse.next();
    return addRateLimitHeaders(response, info, config.headers, config.legacyHeaders);
  };
}
