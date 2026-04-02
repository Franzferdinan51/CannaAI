## 2024-05-23 - Prisma Over-fetching
**Learning:** Default Prisma `findMany` fetches all fields, including heavy `Json` blobs (images, metadata). This causes massive payload bloat in list views.
**Action:** Always use `select` to retrieve only scalar fields for list APIs, and fetch heavy fields only in detail views (`[id]`). This reduced payload by ~99% in `api/plants`.
