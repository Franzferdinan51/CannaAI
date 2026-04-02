# Sentinel Journal

## 2025-02-18 - [Critical] API Key Exposure in Settings API
**Vulnerability:** The `/api/settings` endpoint was returning full configuration objects including unmasked API keys for all AI providers in the GET response.
**Learning:** Initializing settings from environment variables and serving them directly to the client without a transformation layer exposes server-side secrets.
**Prevention:** Always implement a DTO (Data Transfer Object) or masking layer (like `maskSecrets`) for any API endpoint that serves configuration data. Use a `secureUpdate` pattern to handle masked values coming back from the client.
