## 2024-05-22 - [CRITICAL] API Key Exposure in Settings API
**Vulnerability:** The `/api/settings` endpoint was returning the entire settings object, including unmasked API keys and secrets, in `GET` responses. Additionally, `POST` updates were blindly overwriting settings, risking the replacement of valid secrets with placeholder values if the client sent masked data back.
**Learning:** Returning configuration objects directly to the client is dangerous when they contain mixed public and private data. Always assume the client should never see raw secrets.
**Prevention:**
1. Implement a `maskSettings` utility to redact sensitive fields (e.g., `apiKey`, `password`) before sending data to the client.
2. Implement a `safeMergeSettings` utility for updates that ignores masked values (e.g., `***`) to preserve existing secrets in the backend.
3. Apply these utilities in all API routes handling sensitive configuration.
