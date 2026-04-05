## 2026-02-03 - TooltipProvider Anti-Pattern
**Learning:** The codebase was wrapping every `Tooltip` instance in its own `TooltipProvider`, creating excessive context providers and DOM nodes.
**Action:** Always check for global providers in UI libraries like Radix/Shadcn before using component-level providers.
