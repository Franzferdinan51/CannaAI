/**
 * Security utilities for settings management.
 * Handles masking of sensitive data and safe merging of updates.
 */

// Keys that are considered sensitive and should be masked
const SENSITIVE_KEYS = [
  'apiKey',
  'secret',
  'password',
  'token',
  'privateKey',
  'accessKey'
];

/**
 * Masks a sensitive string value
 * @param key The sensitive string to mask
 * @returns A masked version (e.g., "sk-***1234")
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 3)}***${key.slice(-4)}`;
}

/**
 * Checks if a key name indicates sensitive data
 * @param key The key name to check
 * @returns True if the key is sensitive
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()));
}

/**
 * Checks if a value appears to be a masked value
 * @param value The value to check
 * @returns True if the value follows the masking pattern
 */
export function isMaskedValue(value: string): boolean {
  return value === '********' || (value.length > 7 && value.includes('***'));
}

/**
 * Recursively masks sensitive fields in a settings object
 * @param settings The settings object to mask
 * @returns A new object with sensitive fields masked
 */
export function maskSettings(settings: any): any {
  if (Array.isArray(settings)) {
    return settings.map(item => maskSettings(item));
  }

  if (typeof settings === 'object' && settings !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(settings)) {
      if (isSensitiveKey(key) && typeof value === 'string') {
        masked[key] = maskApiKey(value);
      } else {
        masked[key] = maskSettings(value);
      }
    }
    return masked;
  }

  return settings;
}

/**
 * Safely merges settings updates, preserving existing secrets if the update contains a masked value
 * @param current The current settings object (with real secrets)
 * @param update The update object (potentially with masked secrets)
 * @returns The merged object
 */
export function safeMergeSettings(current: any, update: any): any {
  if (typeof current !== 'object' || current === null || typeof update !== 'object' || update === null) {
    return update;
  }

  // Create a copy of current to start with
  // Note: This implementation assumes we are merging 'update' properties INTO 'current' structure
  // but for the return value we want a new object.
  // Ideally, we want to start with 'current' and apply 'update' on top.
  const merged = Array.isArray(current) ? [...current] : { ...current };

  for (const [key, newValue] of Object.entries(update)) {
    // If key is sensitive and new value is masked, ignore the update (keep original)
    if (isSensitiveKey(key) && typeof newValue === 'string' && isMaskedValue(newValue)) {
      continue;
    }

    // Recursive merge for objects (but not arrays, usually arrays are replaced entirely or appended,
    // but here we assume replacement for arrays unless we want complex array merging)
    // We'll stick to simple object merging.
    if (key in current &&
        typeof current[key] === 'object' && current[key] !== null &&
        typeof newValue === 'object' && newValue !== null &&
        !Array.isArray(newValue)) {
      merged[key] = safeMergeSettings(current[key], newValue);
    } else {
      merged[key] = newValue;
    }
  }

  return merged;
}
