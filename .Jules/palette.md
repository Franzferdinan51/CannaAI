## 2025-02-19 - Duplicated Components Propagate Accessibility Issues
**Learning:** Found near-identical `ChatInput` components in `src/components/chat` and `src/components/ai/unified/components`. Both lacked ARIA labels for icon-only buttons. Code duplication not only increases maintenance but ensures accessibility gaps are replicated.
**Action:** When fixing an accessibility issue in a UI component, grep for similar components or duplicated code to ensure the fix is applied system-wide.
