## BOLT'S JOURNAL

This journal tracks critical performance learnings and patterns specific to this codebase.

## 2025-02-23 - [Missing Foreign Key Indexes]
**Learning:** Prisma does not automatically create indexes for foreign keys in SQLite (and many other DBs) unless explicitly defined. This can lead to silent performance degradation in `include` queries or `where` clauses filtering by relation.
**Action:** Always verify `@@index` exists for foreign keys used in filtering or sorting.
