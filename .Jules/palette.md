## 2026-01-25 - Chat Interface Accessibility
**Learning:** Icon-only buttons in chat interfaces (like Send/Remove) are major accessibility traps. They must have ARIA labels. Tooltips add a nice layer of "delight" and clarity.
**Action:** Always check icon-only buttons for `aria-label` and consider wrapping them in Tooltips for better UX.
