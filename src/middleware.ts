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

  // The Vite UI is intentionally hosted on a sibling port (and the Pixel
  // reaches it through Tailscale). Expose the JSON API to those clients.
  // Authentication is handled by the individual routes; these APIs do not
  // use browser credentials, so a wildcard is safe here and avoids brittle
  // per-device origin lists.
  if (isApi) {
    securedResponse.headers.set('Access-Control-Allow-Origin', '*');
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
