import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, securityHeadersConfig } from '@/lib/security-headers';

export function isSensitiveMutation(pathname: string, method: string): boolean {
  return method !== 'GET' && method !== 'OPTIONS' && (
    pathname === '/api/backup/create' ||
    pathname === '/api/backup/restore' ||
    pathname === '/api/db/health' ||
    pathname === '/api/automation/engine' ||
    pathname === '/api/import/execute' ||
    pathname === '/api/migration/import'
  );
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Determine if this is an API route
  const isApi = request.nextUrl.pathname.startsWith('/api');
  const isDev = process.env.NODE_ENV === 'development';

  let headersConfig = isDev ? securityHeadersConfig.development : securityHeadersConfig.production;

  if (isApi) {
    headersConfig = { ...headersConfig, ...securityHeadersConfig.apis };
  }

  const securedResponse = applySecurityHeaders(request, response, headersConfig);

  // CORS: harden to prevent arbitrary-origin leakage.
  // - ALLOWED_ORIGINS (comma-separated): explicit allowlist, used in any env.
  // - No allowlist + development: only localhost numeric ports are permitted.
  // - Production without allowlist: no origin is echoed (safest default).
  if (isApi) {
    const publicApiPaths = new Set(['/api/health', '/api/health-check', '/api/version']);
    const sensitiveMutation = isSensitiveMutation(request.nextUrl.pathname, request.method);
    const requireApiToken = process.env.CANNAAI_REQUIRE_AUTH === 'true'
      || process.env.NODE_ENV === 'production'
      || sensitiveMutation;

    // Browser CORS preflights do not carry the eventual Authorization header.
    // They may validate the allowlist here; the actual request remains gated.
    if (requireApiToken && request.method !== 'OPTIONS' && !publicApiPaths.has(request.nextUrl.pathname)) {
      const configuredToken = process.env.CANNAAI_API_TOKEN;
      const authorization = request.headers.get('authorization') ?? '';
      const bearerToken = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';
      const suppliedToken = request.headers.get('x-cannaai-api-token') ?? bearerToken;

      if (!configuredToken) {
        return NextResponse.json(
          { success: false, error: 'API authentication is not configured', code: 'AUTH_MISCONFIGURED' },
          { status: 503 }
        );
      }

      if (suppliedToken !== configuredToken) {
        return NextResponse.json(
          { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' },
          { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
        );
      }
    }

    // SOCKET_IO_ORIGINS is the documented deployment setting and is shared
    // with the Socket.IO server. Keep ALLOWED_ORIGINS for older deployments.
    const allowedListRaw = process.env.SOCKET_IO_ORIGINS ?? process.env.ALLOWED_ORIGINS ?? '';
    const allowedList = allowedListRaw.trim();

    const requestOrigin = request.headers.get('origin') ?? '';
    const devPorts = /^http:\/\/localhost:\d+$/;

    let allowedOrigin: string | null = null;

    if (allowedList) {
      const whitelist = allowedList.split(',').map((o) => o.trim());
      if (whitelist.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    } else if (process.env.NODE_ENV === 'development' && devPorts.test(requestOrigin)) {
      allowedOrigin = requestOrigin;
    }
    // else: allowedOrigin stays null — no Access-Control-Allow-Origin emitted

    if (allowedOrigin) {
      securedResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      securedResponse.headers.set('Vary', 'Origin');
    }
    securedResponse.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    securedResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-CannaAI-API-Token',
    );
  }

  if (isApi && request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: securedResponse.headers });
  }

  return securedResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
