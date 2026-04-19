## 2026-02-03 - Icon-Only Buttons Require ARIA Labels
**Learning:** Icon-only buttons (like Send or Close) are invisible to screen readers without explicit labels, creating a frustrating 'mystery meat navigation' experience for assistive technology users.
**Action:** Always add `aria-label` to any button that relies solely on an icon for its semantic meaning.

## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Automated tools often miss missing labels on icon-only buttons (`size="icon"`).
**Action:** Manually inspect all `size="icon"` buttons for `aria-label` or `sr-only` text.

# Palette's Journal

## Critical Learnings
Format: `## YYYY-MM-DD - [Title]
**Learning:** [UX/a11y insight]
**Action:** [How to apply next time]`
