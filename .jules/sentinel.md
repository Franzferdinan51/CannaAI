## 2025-05-21 - Settings Secrets Management
**Vulnerability:** API Keys exposed in plaintext via `GET /api/settings`, and potential overwrite with masked values in `POST`.
**Learning:** When managing secrets in a settings UI, the backend must implement a "Mask on Read / Merge on Write" pattern. Simply returning the object exposes secrets. Simply updating the object with the frontend state (which might have masked values like `********`) destroys the secrets.
**Prevention:**
1. **GET:** Always mask secrets (replace with `********`) before sending to client.
2. **POST:** Check if the incoming value is the mask. If so, ignore it (keep existing secret). Only update if the value is different and not the mask.
