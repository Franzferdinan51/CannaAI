## 2025-05-24 - ChatInput Accessibility
**Learning:** Found critical interactive elements (Send, Remove Image buttons) in ChatInput lacking accessible names. This is a common pattern in chat interfaces where icons are used without text.
**Action:** Always verify icon-only buttons have `aria-label` or `title` attributes. Use dynamic labels for state changes (e.g., "Send message" vs "Sending message").
