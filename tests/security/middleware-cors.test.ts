/**
 * @jest-environment node
 *
 * Security tests for global API CORS configuration in src/middleware.ts
 *
 * Acceptance criteria:
 * 1. localhost:3000/5173/5174 remain allowed in development
 * 2. Arbitrary external origin is NOT emitted as Access-Control-Allow-Origin
 * 3. An explicit ALLOWED_ORIGINS env allowlist permits only listed origins
 *
 * RED phase: these tests define the desired hardening behavior.
 * GREEN phase: implement the smallest fix in src/middleware.ts to make them pass.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock next/server before any imports
// ---------------------------------------------------------------------------

const headersMap: Map<string, string> = new Map();

jest.mock('next/server', () => {
  const MockHeaders = class {
    get(key: string) { return headersMap.get(key) ?? null; }
    set(key: string, value: string) { headersMap.set(key, value); }
    append(key: string, value: string) {
      const existing = headersMap.get(key);
      headersMap.set(key, existing ? `${existing}, ${value}` : value);
    }
    has(key: string) { return headersMap.has(key); }
    delete(key: string) { headersMap.delete(key); }
    forEach(fn: (value: string, key: string) => void) { headersMap.forEach(fn); }
    entries() { return headersMap.entries(); }
    keys() { return headersMap.keys(); }
    values() { return headersMap.values(); }
  };

  return {
    NextResponse: {
      next: jest.fn(() => ({
        headers: new MockHeaders(),
        status: 200,
        statusText: 'OK',
      })),
    },
    NextRequest: class {},
  };
});

// ---------------------------------------------------------------------------
// Test environment isolation
// ---------------------------------------------------------------------------

const originalEnv: Record<string, string | undefined> = { ...process.env };

beforeEach(() => {
  jest.resetModules();
  headersMap.clear();
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'development';
});

afterEach(() => {
  process.env = originalEnv;
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CORS hardening — src/middleware.ts', () => {

  // -------------------------------------------------------------------------
  // AC-1: localhost:3000/5173/5174 remain allowed in development
  // -------------------------------------------------------------------------
  describe('AC-1: localhost development ports are allowed', () => {
    const allowedDevOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ];

    test.each(allowedDevOrigins)(
      'in dev mode, %s is allowed (Access-Control-Allow-Origin is set)',
      async (origin) => {
        const { middleware } = await import('@/middleware');

        const mockRequest = {
          method: 'POST',
          nextUrl: { pathname: '/api/test' },
          headers: {
            get(name: string) {
              if (name === 'origin') return origin;
              return null;
            },
          },
        };

        middleware(mockRequest as never);

        expect(headersMap.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(headersMap.get('Vary')).toBe('Origin');
      }
    );
  });

  // -------------------------------------------------------------------------
  // AC-2: arbitrary external origin is NOT emitted
  // -------------------------------------------------------------------------
  describe('AC-2: arbitrary external origin is not echoed back', () => {
    const externalOrigins = [
      'https://evil.com',
      'https://attacker.io',
      'https://external-site.com',
    ];

    test.each(externalOrigins)(
      'external origin %s must NOT be echoed as Access-Control-Allow-Origin',
      async (origin) => {
        const { middleware } = await import('@/middleware');

        const mockRequest = {
          method: 'POST',
          nextUrl: { pathname: '/api/test' },
          headers: {
            get(name: string) {
              if (name === 'origin') return origin;
              return null;
            },
          },
        };

        middleware(mockRequest as never);

        const allowOrigin = headersMap.get('Access-Control-Allow-Origin');
        // The wildcard '*' and the external origin itself are both forbidden
        expect(allowOrigin).not.toBe('*');
        expect(allowOrigin).not.toBe(origin);
        // No header is emitted for unauthorized origins (securest default)
        expect(allowOrigin).toBeUndefined();
      }
    );
  });

  // -------------------------------------------------------------------------
  // AC-3: explicit ALLOWED_ORIGINS env allowlist
  // -------------------------------------------------------------------------
  describe('AC-3: ALLOWED_ORIGINS env allowlist is respected', () => {

    test('only origins listed in ALLOWED_ORIGINS are permitted', async () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://dashboard.example.com';

      const { middleware } = await import('@/middleware');

      // Permitted origin
      headersMap.clear();
      const allowedReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://app.example.com';
            return null;
          },
        },
      };
      middleware(allowedReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
      expect(headersMap.get('Vary')).toBe('Origin');

      // Non-listed origin — must NOT be echoed
      headersMap.clear();
      const deniedReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://not-in-list.com';
            return null;
          },
        },
      };
      middleware(deniedReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('https://not-in-list.com');
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('*');
    });

    test('empty ALLOWED_ORIGINS falls back to dev-safe localhost behavior', async () => {
      delete process.env.ALLOWED_ORIGINS;

      const { middleware } = await import('@/middleware');

      // Any localhost dev origin should still work
      const localhostReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'http://localhost:3000';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(localhostReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(headersMap.get('Vary')).toBe('Origin');

      // External origin must NOT be echoed
      const externalReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://external.com';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(externalReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('https://external.com');
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('*');
    });

    test('whitespace-only ALLOWED_ORIGINS is treated as unset (dev localhost fallback works)', async () => {
      process.env.ALLOWED_ORIGINS = '   ';

      const { middleware } = await import('@/middleware');

      // localhost origin must still be allowed in dev even with whitespace-only ALLOWED_ORIGINS
      const req = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'http://localhost:5173';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(req as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(headersMap.get('Vary')).toBe('Origin');

      // External origin must still be denied (whitespace treated as unset)
      const externalReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://external.com';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(externalReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('https://external.com');
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(headersMap.get('Vary')).toBeUndefined();
    });

    test('empty-string ALLOWED_ORIGINS is treated as unset (dev localhost fallback works)', async () => {
      process.env.ALLOWED_ORIGINS = '';

      const { middleware } = await import('@/middleware');

      const req = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'http://localhost:5174';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(req as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).toBe('http://localhost:5174');
      expect(headersMap.get('Vary')).toBe('Origin');

      // External origin denied
      const externalReq = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://evil.com';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(externalReq as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('https://evil.com');
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(headersMap.get('Vary')).toBeUndefined();
    });

    test('production mode refuses any origin not in ALLOWED_ORIGINS', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';

      const { middleware } = await import('@/middleware');

      const req = {
        method: 'POST',
        nextUrl: { pathname: '/api/test' },
        headers: {
          get(name: string) {
            if (name === 'origin') return 'https://unknown.com';
            return null;
          },
        },
      };
      headersMap.clear();
      middleware(req as never);
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('https://unknown.com');
      expect(headersMap.get('Access-Control-Allow-Origin')).not.toBe('*');
      expect(headersMap.get('Vary')).toBeUndefined();
    });
  });
});
