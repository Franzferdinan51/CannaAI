export function maskSettings(settings: any): any {
  if (Array.isArray(settings)) {
    return settings.map(maskSettings);
  } else if (settings !== null && typeof settings === 'object') {
    const masked: any = {};
    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        if (isSensitiveKey(key)) {
          // If the value is present and not empty, return a masked string
          masked[key] = settings[key] ? '***' : '';
        } else {
          masked[key] = maskSettings(settings[key]);
        }
      }
    }
    return masked;
  }
  return settings;
}

export function safeMergeSettings(target: any, source: any): any {
  if (source === null || typeof source !== 'object') {
    return source;
  }

  // Handle arrays by replacement (or specific merge logic if needed, but usually replacement is safer for lists)
  if (Array.isArray(source)) {
     return source.map(item => safeMergeSettings({}, item)); // Deep copy array items
  }

  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];

      // If source value is exactly '***', do NOT update target (preserve secret)
      if (typeof sourceValue === 'string' && sourceValue === '***' && isSensitiveKey(key)) {
          continue;
      }

      // If both are objects, recurse
      if (sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = safeMergeSettings(result[key], sourceValue);
      } else {
        // Otherwise, overwrite
        result[key] = sourceValue;
      }
    }
  }
  return result;
}

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  // Note: 'token' might match non-sensitive fields like 'max_tokens'.
  // This is acceptable for security (better safe than sorry), but may mask UI values.
  return lowerKey.includes('apikey') ||
         lowerKey.includes('secret') ||
         lowerKey.includes('password') ||
         lowerKey.includes('token') ||
         lowerKey.includes('privatekey') ||
         lowerKey.includes('accesskey');
}
