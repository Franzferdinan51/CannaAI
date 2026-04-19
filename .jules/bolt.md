## 2024-05-23 - Prisma Over-fetching
**Learning:** Default Prisma `findMany` fetches all fields, including heavy `Json` blobs (images, metadata). This causes massive payload bloat in list views.
**Action:** Always use `select` to retrieve only scalar fields for list APIs, and fetch heavy fields only in detail views (`[id]`). This reduced payload by ~99% in `api/plants`.

## 2024-05-22 - API Data Over-fetching
**Learning:** The inventory API endpoint (`src/app/api/plants/inventory/route.ts`) fetches the entire `Plant` table (including potentially large JSON fields like `images` and `metadata`) just to calculate simple counts and averages. This is a classic "select *" performance bottleneck.
**Action:** Use Prisma's `select` clause to fetch only the fields strictly necessary for the calculation (`isActive`, `health`), or use database-level aggregations (`count`, `aggregate`) to push the work to the database.

## 2026-02-03 - TooltipProvider Anti-Pattern
**Learning:** The codebase was wrapping every `Tooltip` instance in its own `TooltipProvider`, creating excessive context providers and DOM nodes.
**Action:** Always check for global providers in UI libraries like Radix/Shadcn before using component-level providers.

## Critical Learnings

*Only for performance bottlenecks, anti-patterns, and critical insights.*
