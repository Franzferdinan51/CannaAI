import { maskSettings, mergeProviderConfig, MASK_VALUE } from '../../src/lib/settings-security';
import assert from 'assert';

console.log('Running Settings Security Tests...');

// Test Data
const mockSettings = {
  aiProvider: 'lm-studio',
  lmStudio: { url: 'http://localhost:1234', apiKey: 'secret-lm', model: 'llama' },
  openRouter: { apiKey: 'secret-or', model: 'gpt-4' },
  openai: { apiKey: 'secret-oa', model: 'gpt-3.5' },
  notifications: { enabled: true }
};

// 1. Test maskSettings
console.log('Test 1: maskSettings should mask API keys');
const masked = maskSettings(mockSettings);

assert.strictEqual(masked.lmStudio.apiKey, MASK_VALUE, 'lmStudio apiKey should be masked');
assert.strictEqual(masked.openRouter.apiKey, MASK_VALUE, 'openRouter apiKey should be masked');
assert.strictEqual(masked.openai.apiKey, MASK_VALUE, 'openai apiKey should be masked');
assert.strictEqual(masked.lmStudio.url, 'http://localhost:1234', 'Other fields should remain');
assert.notStrictEqual(masked, mockSettings, 'Should return a copy');
assert.strictEqual(mockSettings.lmStudio.apiKey, 'secret-lm', 'Original settings should not be mutated');

console.log('✅ maskSettings passed');

// 2. Test mergeProviderConfig
console.log('Test 2: mergeProviderConfig should update values but preserve secrets on mask');

const currentConfig = { apiKey: 'real-secret', model: 'old-model' };

// Case A: Update model, apiKey is masked -> Should keep real-secret
const updateWithMask = { apiKey: MASK_VALUE, model: 'new-model' };
const merged1 = mergeProviderConfig(currentConfig, updateWithMask);
assert.strictEqual(merged1.apiKey, 'real-secret', 'Should preserve real secret when mask is passed');
assert.strictEqual(merged1.model, 'new-model', 'Should update other fields');

// Case B: Update apiKey with new value -> Should update to new value
const updateWithNewKey = { apiKey: 'new-secret', model: 'new-model' };
const merged2 = mergeProviderConfig(currentConfig, updateWithNewKey);
assert.strictEqual(merged2.apiKey, 'new-secret', 'Should update secret when new value is passed');

// Case C: New config is empty -> Should return current
const merged3 = mergeProviderConfig(currentConfig, null);
assert.strictEqual(merged3.apiKey, 'real-secret');

// Case D: Current is empty -> Should return new
const merged4 = mergeProviderConfig(null, updateWithNewKey);
assert.strictEqual(merged4.apiKey, 'new-secret');

console.log('✅ mergeProviderConfig passed');
console.log('All tests passed!');
