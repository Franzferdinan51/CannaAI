## 2024-05-22 - Accessibility Quick Wins
**Learning:** Icon-only buttons (like Send, Close, Upload) are frequent accessibility gaps in Chat interfaces. Adding `aria-label` is a high-impact, low-effort fix.
**Action:** Systematically check all `Button` components with icons for `aria-label` or `sr-only` text during implementation.
