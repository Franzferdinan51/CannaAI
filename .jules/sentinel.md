## 2026-02-01 - API Key Leakage in Settings
**Vulnerability:** The `/api/settings` endpoint was returning the full settings object, including sensitive API keys (OpenAI, Anthropic, etc.), in both GET responses and POST update responses.
**Learning:** In-memory settings storage without explicit DTOs or serialization logic can easily leak sensitive data if the entire state object is returned to the client. Defaulting to `return { settings }` is dangerous.
**Prevention:** Always use a "masking" or "sanitization" layer (DTO) before returning sensitive configuration objects to the client. Additionally, ensure that masked values sent back by the client do not overwrite real values in the backend.
