## 2026-02-06 - Lucide Icon Naming
**Learning:** `lucide-react` exports an `Image` icon which `eslint-plugin-jsx-a11y` incorrectly flags as an HTML `<img>` element missing an `alt` prop.
**Action:** Always alias `Image` as `ImageIcon` (or similar) when importing from `lucide-react` to avoid false positives and confusion.
