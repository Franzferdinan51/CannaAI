/**
 * Security utilities for handling settings and sensitive data
 */

export const MASK_VALUE = '****************';

/**
 * Masks sensitive fields in the settings object for client-side display
 * @param settings The raw settings object containing secrets
 * @returns A deep copy of settings with secrets masked
 */
export function maskSettings(settings: any): any {
  if (!settings) return settings;

  // Deep copy to avoid mutating the original
  const masked = JSON.parse(JSON.stringify(settings));

  // List of provider keys that contain sensitive data
  const providers = [
    'lmStudio',
    'openRouter',
    'openai',
    'gemini',
    'groq',
    'anthropic'
  ];

  providers.forEach(providerKey => {
    if (masked[providerKey] && typeof masked[providerKey] === 'object') {
      if (masked[providerKey].apiKey) {
        masked[providerKey].apiKey = MASK_VALUE;
      }
    }
  });

  return masked;
}

/**
 * Merges new configuration into existing configuration, preserving secrets
 * if the new value is the mask value.
 * @param currentConfig The current configuration object (with real secrets)
 * @param newConfig The new configuration object (potentially with masks)
 * @returns The merged configuration object
 */
export function mergeProviderConfig(currentConfig: any, newConfig: any): any {
  if (!currentConfig) return newConfig || {};
  if (!newConfig) return currentConfig;

  const merged = { ...currentConfig };

  Object.keys(newConfig).forEach(key => {
    const value = newConfig[key];

    // Check if we should preserve the existing value
    // We preserve if the new value is the mask
    if (key === 'apiKey' && value === MASK_VALUE) {
      return; // Skip update, keeping the existing value from currentConfig
    }

    merged[key] = value;
  });

  return merged;
}
