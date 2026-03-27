import { NextRequest } from 'next/server';
import { securityHeadersMiddleware } from './lib/security-headers';

export function middleware(request: NextRequest) {
  return securityHeadersMiddleware(request);
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
