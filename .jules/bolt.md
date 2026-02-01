## 2024-05-22 - API Data Over-fetching
**Learning:** The inventory API endpoint (`src/app/api/plants/inventory/route.ts`) fetches the entire `Plant` table (including potentially large JSON fields like `images` and `metadata`) just to calculate simple counts and averages. This is a classic "select *" performance bottleneck.
**Action:** Use Prisma's `select` clause to fetch only the fields strictly necessary for the calculation (`isActive`, `health`), or use database-level aggregations (`count`, `aggregate`) to push the work to the database.
