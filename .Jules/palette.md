## 2024-05-22 - Accessible Icon Buttons in Lists
**Learning:** Icon-only buttons in dynamic lists often lack focus visibility and labels. Hover-only visibility (opacity-0) makes them inaccessible to keyboard users.
**Action:** Always pair `opacity-0` with `focus:opacity-100` and ensure `aria-label` includes context (e.g., filename).
