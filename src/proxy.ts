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
  // - No allowlist + non-production: loopback, Tailscale (100.x) and LAN
  //   (RFC1918) origins are permitted — the same ranges the Socket.IO server
  //   in server.ts already trusts. This deployment binds the backend to the
  //   tailnet IP only, so those origins can only arrive from the home network.
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
    // Non-production fallback: loopback + Tailscale + LAN origins, any port.
    // Mirrors the dev origin policy in server.ts (Socket.IO). NODE_ENV is
    // unset in the Robin deployment, which server.ts treats as development
    // (dev = NODE_ENV !== 'production') — use the same test here so the HTTP
    // API and the socket server apply one consistent policy.
    const privateOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|100\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2[0-9]|3[01])\.\d+\.\d+):\d+$/;

    let allowedOrigin: string | null = null;

    if (allowedList) {
      const whitelist = allowedList.split(',').map((o) => o.trim());
      if (whitelist.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    } else if (process.env.NODE_ENV !== 'production' && privateOrigin.test(requestOrigin)) {
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

    // Plant photos are embedded with <img> by the web UI, which lives on a
    // different port of the same tailnet host. Chrome blocks those loads
    // under Cross-Origin-Resource-Policy: same-site
    // (ERR_BLOCKED_BY_RESPONSE.NotSameSite), so served plant images
    // explicitly allow cross-origin embedding. The tailnet-only bind is
    // the access control here; API data routes keep the stricter policy.
    if (/^\/api\/plants\/[^/]+\/images\/[^/]+$/.test(request.nextUrl.pathname)) {
      securedResponse.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
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
