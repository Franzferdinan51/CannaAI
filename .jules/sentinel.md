# Sentinel's Security Journal

## 2025-05-20 - Global Security Headers Middleware
**Vulnerability:** Missing critical security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) globally, leaving the application vulnerable to Clickjacking, MIME sniffing, and MITM attacks.
**Learning:** Next.js Middleware (`middleware.ts`) provides a central point to enforce security headers across all routes (Pages and API), whereas individual route wrappers (`withSecurity`) only protect specific endpoints.
**Prevention:** Always implement a global `middleware.ts` that applies a comprehensive set of security headers using a configuration object that distinguishes between Development and Production environments.
