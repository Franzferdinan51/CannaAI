/**
 * ========================================
 * Security Headers Middleware
 * ========================================
 * Implements comprehensive security headers for production
 */

import { NextRequest, NextResponse } from 'next/server';

interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  xXSSProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
}

const getDefaultSecurityHeaders = (): SecurityHeadersConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  const csp = process.env.CONTENT_SECURITY_POLICY || [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "connect-src 'self' wss: https:",
    "worker-src 'self' blob:",
    "child-src 'self'",
    "frame-src 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  return {
    contentSecurityPolicy: isProduction ? csp : "default-src 'self'",
    strictTransportSecurity: isProduction ? 'max-age=63072000; includeSubDomains; preload' : undefined,
    xFrameOptions: 'SAMEORIGIN',
    xContentTypeOptions: 'nosniff',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'clipboard-read=()',
      'clipboard-write=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'hid=()',
      'interest-cohort=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=()',
      'usb=()',
      'screen-wake-lock=()',
    ].join(', '),
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-site',
  };
};

export function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  customHeaders?: Partial<SecurityHeadersConfig>
): NextResponse {
  const config = { ...getDefaultSecurityHeaders(), ...customHeaders };

  // Apply Content Security Policy
  if (config.contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', config.contentSecurityPolicy);
  }

  // Apply Strict Transport Security
  if (config.strictTransportSecurity) {
    response.headers.set('Strict-Transport-Security', config.strictTransportSecurity);
  }

  // Apply X-Frame-Options
  if (config.xFrameOptions) {
    response.headers.set('X-Frame-Options', config.xFrameOptions);
  }

  // Apply X-Content-Type-Options
  if (config.xContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', config.xContentTypeOptions);
  }

  // Apply X-XSS-Protection
  if (config.xXSSProtection) {
    response.headers.set('X-XSS-Protection', config.xXSSProtection);
  }

  // Apply Referrer Policy
  if (config.referrerPolicy) {
    response.headers.set('Referrer-Policy', config.referrerPolicy);
  }

  // Apply Permissions Policy
  if (config.permissionsPolicy) {
    response.headers.set('Permissions-Policy', config.permissionsPolicy);
  }

  // Apply Cross-Origin Policies
  if (config.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy);
  }

  if (config.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy);
  }

  if (config.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy);
  }

  // Remove Server header for security
  response.headers.delete('Server');

  // Remove X-Powered-By header if present
  response.headers.delete('X-Powered-By');

  return response;
}

// Export configuration
export const securityHeadersConfig = {
  production: {
    contentSecurityPolicy: getDefaultSecurityHeaders().contentSecurityPolicy,
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
  },
  development: {
    contentSecurityPolicy: "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
    xFrameOptions: 'SAMEORIGIN',
  },
  apis: {
    contentSecurityPolicy: "default-src 'none'",
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
  },
};
