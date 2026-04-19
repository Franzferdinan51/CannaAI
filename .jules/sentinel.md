## 2026-02-03 - [SQL Injection via Prisma Raw Queries]
**Vulnerability:** SQL Injection in `prisma.$queryRaw` when using `prisma.$unsafe` with user input.
**Learning:** `prisma.$queryRaw` is safe with tagged templates, but `prisma.$unsafe` explicitly bypasses protections. Using it inside a tagged template (`${...}`) to conditionally build queries opens up injection if the interpolated string contains unvalidated user input.
**Prevention:** Use `Prisma.sql`, `Prisma.empty`, and `Prisma.join` to compose dynamic raw queries safely. Avoid `prisma.$unsafe` entirely.
