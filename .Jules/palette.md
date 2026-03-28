## 2024-05-24 - Chat Interface Accessibility
**Learning:** Icon-only buttons in chat interfaces often lack accessible labels, making them unusable for screen reader users. The "Image" icon from `lucide-react` can also trigger false positives in linter accessibility checks if not renamed (e.g., to `ImageIcon`).
**Action:** Always add `aria-label` to icon-only buttons and consider tooltips for better UX. Rename `Image` imports from icon libraries to avoid confusion with `next/image` or HTML `<img>` tags.
