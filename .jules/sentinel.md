## 2024-05-22 - SQL Injection via Prisma $unsafe
**Vulnerability:** Found `prisma.$unsafe` being used to inject unvalidated user input (`sensorId`) directly into a raw SQL query in `src/app/api/analytics/sensors/route.ts`.
**Learning:** Developers might resort to `$unsafe` when they struggle to implement conditional logic in raw queries, not realizing `Prisma.sql` allows composing query fragments safely.
**Prevention:** Always use `Prisma.sql` to build conditional query parts. Never use `$unsafe` with user input. Code reviews should grep for `$unsafe`.
