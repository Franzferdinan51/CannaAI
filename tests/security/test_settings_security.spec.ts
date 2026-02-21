import { maskSettings, safeMergeSettings } from '../../src/lib/settings-security';
import { describe, it, expect } from 'vitest';

describe('Settings Security', () => {
  it('should mask sensitive fields', () => {
    const settings = {
      apiKey: 'secret123',
      secretKey: 'secret456',
      password: 'password789',
      normalField: 'hello',
      nested: {
        apiToken: 'token123',
        normalNested: 'world'
      }
    };

    const masked = maskSettings(settings);

    expect(masked.apiKey).toBe('***');
    expect(masked.secretKey).toBe('***');
    expect(masked.password).toBe('***');
    expect(masked.normalField).toBe('hello');
    expect(masked.nested.apiToken).toBe('***');
    expect(masked.nested.normalNested).toBe('world');
  });

  it('should safely merge settings, preserving masked secrets', () => {
    const existingSettings = {
      apiKey: 'secret123',
      other: 'value1'
    };

    const updates = {
      apiKey: '***',
      other: 'value2'
    };

    const merged = safeMergeSettings(existingSettings, updates);

    expect(merged.apiKey).toBe('secret123'); // Should be preserved
    expect(merged.other).toBe('value2'); // Should be updated
  });

  it('should update sensitive fields if a new value is provided', () => {
    const existingSettings = {
      apiKey: 'secret123'
    };

    const updates = {
      apiKey: 'newSecret'
    };

    const merged = safeMergeSettings(existingSettings, updates);

    expect(merged.apiKey).toBe('newSecret');
  });

  it('should handle deep merging correctly', () => {
    const existing = {
      nested: {
        key: 'old',
        apiSecret: 's1'
      }
    };

    const update = {
      nested: {
        key: 'new',
        apiSecret: '***'
      }
    };

    const merged = safeMergeSettings(existing, update);
    expect(merged.nested.key).toBe('new');
    expect(merged.nested.apiSecret).toBe('s1');
  });
});
