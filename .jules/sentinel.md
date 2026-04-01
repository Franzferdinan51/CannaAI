## 2024-05-23 - Unused Security Middleware
**Vulnerability:** Application had comprehensive security headers logic defined in `security-headers.middleware.ts` but the file was not imported or used in any active middleware, leaving the application without global security headers.
**Learning:** Existence of security code does not imply its execution. Always verify entry points explicitly.
**Prevention:** Add integration tests that verify the presence of security headers in the running application.
