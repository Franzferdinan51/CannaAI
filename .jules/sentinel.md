## 2026-02-03 - [SQL Injection via Prisma Raw Queries]
**Vulnerability:** SQL Injection in `prisma.$queryRaw` when using `prisma.$unsafe` with user input.
**Learning:** `prisma.$queryRaw` is safe with tagged templates, but `prisma.$unsafe` explicitly bypasses protections. Using it inside a tagged template (`${...}`) to conditionally build queries opens up injection if the interpolated string contains unvalidated user input.
**Prevention:** Use `Prisma.sql`, `Prisma.empty`, and `Prisma.join` to compose dynamic raw queries safely. Avoid `prisma.$unsafe` entirely.

## 2025-05-20 - Global Security Headers Middleware
**Vulnerability:** Missing critical security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) globally, leaving the application vulnerable to Clickjacking, MIME sniffing, and MITM attacks.
**Learning:** Next.js Middleware (`middleware.ts`) provides a central point to enforce security headers across all routes (Pages and API), whereas individual route wrappers (`withSecurity`) only protect specific endpoints.
**Prevention:** Always implement a global `middleware.ts` that applies a comprehensive set of security headers using a configuration object that distinguishes between Development and Production environments.
