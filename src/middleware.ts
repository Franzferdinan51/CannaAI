import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, securityHeadersConfig } from '@/lib/security-headers';

export function middleware(request: NextRequest) {
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
    const allowedListRaw = process.env.ALLOWED_ORIGINS ?? '';
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
    securedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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
