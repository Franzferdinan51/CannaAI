## 2026-01-24 - React State Performance with Images
**Learning:** Storing large Base64 strings (10MB+) in React state causes significant main thread blocking and memory pressure, even if the state update is asynchronous, because it impacts diffing and memory GC.
**Action:** Always use `URL.createObjectURL(file)` for image previews. Store the `File` object in state and generate the preview URL. Defer Base64 conversion (if needed for API) until the submission moment.

## 2026-01-24 - Jest Configuration for Next.js
**Learning:** The repository is configured for TypeScript unit tests but lacks proper configuration for React Component (`.tsx`) testing (missing `jsx` transform in `tsconfig.json` used by `ts-jest`). Trying to fix this locally involves modifying `jest.config.ts` and `package.json` which might be restricted.
**Action:** When testing React components in a restricted environment, rely on Playwright/E2E verification if unit tests cannot be run without major config refactoring.
