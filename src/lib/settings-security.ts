
/**
 * Security utilities for settings management
 */

// Keys that likely contain sensitive information
const SENSITIVE_KEYS = [
  'apiKey',
  'secret',
  'password',
  'token',
  'privateKey',
  'accessKey'
];

/**
 * Mask sensitive values in an object
 * Returns a new object with sensitive values replaced by '***'
 */
export function maskSettings(obj: any): any {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => maskSettings(item));
  }

  if (typeof obj === 'object') {
    const masked: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const isSensitive = SENSITIVE_KEYS.some(k =>
          key.toLowerCase().includes(k.toLowerCase())
        );

        if (isSensitive && typeof obj[key] === 'string' && obj[key].length > 0) {
          masked[key] = '***';
        } else {
          masked[key] = maskSettings(obj[key]);
        }
      }
    }
    return masked;
  }

  return obj;
}

/**
 * Safely merge settings, preserving existing secrets if input is masked
 */
export function safeMergeSettings(current: any, incoming: any): any {
  if (!incoming) return current;
  if (!current) return incoming;

  // If types don't match, overwrite (unless one is null/undefined)
  if (typeof current !== typeof incoming) return incoming;

  if (Array.isArray(incoming)) {
    // For arrays, we typically just overwrite
    return incoming;
  }

  if (typeof incoming === 'object') {
    const merged = { ...current };

    for (const key in incoming) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        const value = incoming[key];

        // If value is exactly '***', it means "keep existing secret"
        if (value === '***') {
          // Keep current[key]
          continue;
        }

        // Otherwise recurse or assign
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          merged[key] = safeMergeSettings(current[key], value);
        } else {
          merged[key] = value;
        }
      }
    }
    return merged;
  }

  return incoming;
}
