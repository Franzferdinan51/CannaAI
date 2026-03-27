## 2025-02-20 - API Key Exposure in Settings Endpoint
**Vulnerability:** The `/api/settings` endpoint returned the full settings object including unmasked API keys in the GET response.
**Learning:** In-memory settings objects initialized from process.env can be inadvertently exposed if directly returned in API responses.
**Prevention:** Always use a masking function (DTO pattern) before returning sensitive configuration objects to the client.
