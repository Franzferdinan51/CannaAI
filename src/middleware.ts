import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, securityHeadersConfig } from './lib/security-headers';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Determine if this is an API route
  const isApi = request.nextUrl.pathname.startsWith('/api');
  const isDev = process.env.NODE_ENV === 'development';

  let headersConfig = isDev ? securityHeadersConfig.development : securityHeadersConfig.production;

  if (isApi) {
    headersConfig = { ...headersConfig, ...securityHeadersConfig.apis };
  }

  return applySecurityHeaders(request, response, headersConfig);
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
