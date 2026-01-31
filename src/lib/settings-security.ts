/**
 * Security utilities for handling settings and sensitive data
 */

/**
 * Checks if a key represents a secret
 */
function isSecretKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes('apikey') ||
    lowerKey.includes('api_key') ||
    lowerKey.includes('secret') ||
    lowerKey.includes('token') ||
    lowerKey.includes('password')
  );
}

/**
 * Masks a secret value
 * Shows first 4 and last 4 characters, masks the middle
 */
function maskValue(value: string): string {
  if (!value) return '';
  if (value.length <= 10) return '********';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

/**
 * Checks if a value appears to be masked
 */
export function isMasked(value: string): boolean {
  if (typeof value !== 'string') return false;
  return value.includes('****') || value === '********';
}

/**
 * Recursively masks secrets in an object
 * Returns a new object with masked values
 */
export function maskSecrets(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSecrets);
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string' && isSecretKey(key)) {
        result[key] = maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = maskSecrets(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Securely merges incoming settings into current settings
 * Preserves existing secrets if incoming value is masked
 */
export function secureUpdate(current: any, incoming: any): any {
  if (incoming === undefined || incoming === null) {
    return current;
  }

  if (typeof incoming !== 'object' || Array.isArray(incoming)) {
    // For non-objects or arrays, we generally overwrite,
    // unless it's a masked string (though arrays of secrets are rare in this context)
    if (typeof incoming === 'string' && isMasked(incoming)) {
      return current;
    }
    return incoming;
  }

  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    return incoming;
  }

  const result: any = { ...current };

  for (const key in incoming) {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      const incomingValue = incoming[key];
      const currentValue = current[key];

      if (typeof incomingValue === 'object' && incomingValue !== null && !Array.isArray(incomingValue)) {
        // Recursive merge for objects
        result[key] = secureUpdate(currentValue || {}, incomingValue);
      } else if (typeof incomingValue === 'string' && isSecretKey(key) && isMasked(incomingValue)) {
        // If incoming is masked, keep the current value (which might be the real secret)
        // If current value is missing, we keep the masked value (better than nothing) or empty?
        // If we return current, and current is undefined, we get undefined.
        // If the user submits a masked key, they intend to KEEP the existing key.
        if (currentValue !== undefined) {
          result[key] = currentValue;
        } else {
          // If we don't have a current value, we can't unmask it.
          // But storing the masked value is useless.
          // However, better to not overwrite if we can't help it.
          // In this specific app context, settings are initialized with defaults, so currentValue usually exists.
          result[key] = currentValue;
        }
      } else {
        // Not a secret or not masked, so update
        result[key] = incomingValue;
      }
    }
  }

  return result;
}
