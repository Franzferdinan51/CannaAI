## 2026-02-03 - Icon-Only Buttons Require ARIA Labels
**Learning:** Icon-only buttons (like Send or Close) are invisible to screen readers without explicit labels, creating a frustrating 'mystery meat navigation' experience for assistive technology users.
**Action:** Always add `aria-label` to any button that relies solely on an icon for its semantic meaning.

## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Automated tools often miss missing labels on icon-only buttons (`size="icon"`).
**Action:** Manually inspect all `size="icon"` buttons for `aria-label` or `sr-only` text.

## 2024-05-22 - Accessible Icon Buttons in Lists
**Learning:** Icon-only buttons in dynamic lists often lack focus visibility and labels. Hover-only visibility (opacity-0) makes them inaccessible to keyboard users.
**Action:** Always pair `opacity-0` with `focus:opacity-100` and ensure `aria-label` includes context (e.g., filename).

# Palette's Journal

## Critical Learnings
Format: `## YYYY-MM-DD - [Title]
**Learning:** [UX/a11y insight]
**Action:** [How to apply next time]`
