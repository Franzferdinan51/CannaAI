## 2026-02-03 - Icon-Only Buttons Require ARIA Labels
**Learning:** Icon-only buttons (like Send or Close) are invisible to screen readers without explicit labels, creating a frustrating 'mystery meat navigation' experience for assistive technology users.
**Action:** Always add `aria-label` to any button that relies solely on an icon for its semantic meaning.
