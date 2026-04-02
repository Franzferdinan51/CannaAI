## 2024-05-23 - Analytics Optimization & Environment Issues
**Learning:** `prisma.findMany()` fetches all fields by default, which is catastrophic for models with large JSON fields (like `Plant.health` or `Plant.images`) when doing aggregations. Always use `select` to fetch only necessary fields for in-memory aggregation.
**Action:** Audit all `findMany` calls on models with `Json` or `Bytes` fields for over-fetching.

**Learning:** The project's `jest.config.ts` requires `ts-node` to be interpreted, but `ts-node` is missing from `devDependencies`, preventing tests from running locally.
**Action:** When running tests, ensure `ts-node` is available or suggest adding it to `package.json` for long-term fix.
