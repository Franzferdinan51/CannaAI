/**
 * Security utilities for settings management
 * Handles masking of sensitive data before sending to client
 */

/**
 * Masks an API key to show only the last 4 characters
 * Format: "sk-***1234" or "****" if short
 */
export function maskApiKey(key: string): string {
  if (!key) return '';

  // specific handling for different key formats could be added here
  // but generic masking is safer to avoid missed patterns

  if (key.length <= 8) {
    return '********';
  }

  const start = key.substring(0, 3);
  const end = key.substring(key.length - 4);
  return `${start}***${end}`;
}

/**
 * Creates a deep copy of settings with sensitive fields masked
 * Safe for sending to the client
 */
export function maskSettings(settings: any): any {
  if (!settings) return settings;

  // Deep copy to avoid mutating the original source
  const safeSettings = JSON.parse(JSON.stringify(settings));

  // List of providers that have api keys
  const providers = [
    'lmStudio',
    'openRouter',
    'openai',
    'gemini',
    'groq',
    'anthropic'
  ];

  // Mask API keys for each provider
  providers.forEach(provider => {
    if (safeSettings[provider] && typeof safeSettings[provider].apiKey === 'string') {
      safeSettings[provider].apiKey = maskApiKey(safeSettings[provider].apiKey);
    }
  });

  return safeSettings;
}
