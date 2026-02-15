## 2025-02-02 - Frontend Provider Optimization
**Learning:** `shadcn/ui` Tooltip component implementation was wrapping each tooltip in a `TooltipProvider`, creating thousands of unnecessary React Contexts in list views. Moving this to a global provider significantly reduces React tree depth and overhead.
**Action:** Always check UI library component implementations for redundant providers when optimizing frontend performance.
