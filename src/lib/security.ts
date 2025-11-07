import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, analysisRateLimiter, ValidationError } from './validation';
import { headers } from 'next/headers';

export interface SecurityOptions {
  rateLimitPerMinute?: number;
  enableRateLimit?: boolean;
  requireAuth?: boolean;
  maxBodySize?: number;
  allowedOrigins?: string[];
}

const defaultOptions: SecurityOptions = {
  rateLimitPerMinute: 60,
  enableRateLimit: true,
  requireAuth: false,
  maxBodySize: 500 * 1024 * 1024, // 500MB for ultra-high quality image uploads
  allowedOrigins: undefined, // Allow all origins in development
};

// Get client IP from request
function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return request.ip || 'unknown';
}

// CORS validation
function validateCORS(request: NextRequest, options: SecurityOptions): boolean {
  if (!options.allowedOrigins || options.allowedOrigins.length === 0) {
    return true; // Allow all in development
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check origin header
  if (origin && options.allowedOrigins.includes(origin)) {
    return true;
  }

  // Check referer header as fallback
  if (referer) {
    try {
      const refererURL = new URL(referer);
      if (options.allowedOrigins.includes(refererURL.origin)) {
        return true;
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

// Main security middleware
export async function withSecurity(
  request: NextRequest,
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: SecurityOptions = {}
): Promise<NextResponse> {
  const mergedOptions = { ...defaultOptions, ...options };
  const clientIP = getClientIP(request);

  try {
    // 1. Request size validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > mergedOptions.maxBodySize!) {
      return NextResponse.json(
        {
          error: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: mergedOptions.maxBodySize
        },
        { status: 413 }
      );
    }

    // 2. CORS validation
    if (!validateCORS(request, mergedOptions)) {
      return NextResponse.json(
        {
          error: 'CORS policy violation',
          code: 'CORS_VIOLATION'
        },
        {
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': mergedOptions.allowedOrigins?.[0] || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // 3. Rate limiting
    if (mergedOptions.enableRateLimit) {
      const rateLimiter = mergedOptions.rateLimitPerMinute === 20
        ? analysisRateLimiter
        : apiRateLimiter;

      if (!rateLimiter.isAllowed(clientIP)) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': mergedOptions.rateLimitPerMinute?.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + 60).toString(),
              'Retry-After': '60'
            }
          }
        );
      }
    }

    // 4. Content-Type validation for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return NextResponse.json(
          {
            error: 'Content-Type must be application/json',
            code: 'INVALID_CONTENT_TYPE'
          },
          { status: 400 }
        );
      }
    }

    // 5. Request body validation
    let body: any = {};
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const rawBody = await request.text();

        // Additional JSON parsing security
        if (rawBody.length > 0) {
          // Check for potentially malicious JSON patterns
          if (rawBody.includes('__proto__') ||
              rawBody.includes('constructor') ||
              rawBody.includes('prototype')) {
            return NextResponse.json(
              {
                error: 'Invalid request format',
                code: 'MALICIOUS_PAYLOAD'
              },
              { status: 400 }
            );
          }

          body = JSON.parse(rawBody);
        }
      } catch (parseError) {
        return NextResponse.json(
          {
            error: 'Invalid JSON in request body',
            code: 'INVALID_JSON'
          },
          { status: 400 }
        );
      }
    }

    // 6. Add security headers to response
    const response = await handler(request, { validatedBody: body, clientIP });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Add CORS headers
    if (mergedOptions.allowedOrigins && mergedOptions.allowedOrigins.length > 0) {
      const origin = request.headers.get('origin');
      if (origin && mergedOptions.allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        response.headers.set('Access-Control-Allow-Origin', mergedOptions.allowedOrigins[0]);
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }

    return response;

  } catch (error) {
    console.error('Security middleware error:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.message
        },
        { status: error.statusCode }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Predefined security configurations
export const securityConfig = {
  open: {
    enableRateLimit: false,
    requireAuth: false,
    allowedOrigins: undefined
  },

  publicAPI: {
    enableRateLimit: true,
    rateLimitPerMinute: 100,
    requireAuth: false,
    maxBodySize: 512 * 1024,
    allowedOrigins: undefined
  },

  analysisAPI: {
    enableRateLimit: true,
    rateLimitPerMinute: 20,
    requireAuth: false,
    maxBodySize: 500 * 1024 * 1024, // 500MB for ultra-high quality image uploads
    allowedOrigins: undefined
  },

  protectedAPI: {
    enableRateLimit: true,
    rateLimitPerMinute: 60,
    requireAuth: true,
    maxBodySize: 1024 * 1024, // 1MB
    allowedOrigins: undefined
  }
};

// Helper for API responses
export function createAPIResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): NextResponse {
  const response = NextResponse.json({
    success: status < 400,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0',
      ...meta
    }
  }, { status });

  return response;
}

// Helper for error responses
export function createAPIError(
  message: string,
  code: string = 'UNKNOWN_ERROR',
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: '1.0.0'
    }
  }, { status });
}