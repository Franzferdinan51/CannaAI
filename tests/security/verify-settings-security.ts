
import { maskSettings, safeMergeSettings } from '../../src/lib/settings-security';
import assert from 'assert';

console.log('🔒 Verifying Settings Security...');

// Test maskSettings
console.log('\n1. Testing maskSettings...');

const sensitiveData = {
  name: 'Public Name',
  apiKey: 'sk-1234567890',
  nested: {
    secret: 'super-secret',
    other: 'public'
  },
  array: [
    { password: '123' },
    { name: 'test' }
  ]
};

const masked = maskSettings(sensitiveData);

// Assertions
assert.strictEqual(masked.name, 'Public Name', 'Public name should remain unchanged');
assert.strictEqual(masked.apiKey, '***', 'API Key should be masked');
assert.strictEqual(masked.nested.secret, '***', 'Nested secret should be masked');
assert.strictEqual(masked.nested.other, 'public', 'Nested public data should remain unchanged');
assert.strictEqual(masked.array[0].password, '***', 'Array item secret should be masked');
assert.strictEqual(masked.array[1].name, 'test', 'Array item public data should remain unchanged');

console.log('✅ maskSettings passed');


// Test safeMergeSettings
console.log('\n2. Testing safeMergeSettings...');

const currentSettings = {
  apiKey: 'real-secret-key',
  model: 'gpt-4'
};

// Case 1: Incoming has masked value - should preserve current
const incomingMasked = {
  apiKey: '***',
  model: 'gpt-3.5'
};

const merged1 = safeMergeSettings(currentSettings, incomingMasked);
assert.strictEqual(merged1.apiKey, 'real-secret-key', 'Should preserve existing key when masked received');
assert.strictEqual(merged1.model, 'gpt-3.5', 'Should update non-sensitive value');

// Case 2: Incoming has new secret - should update
const incomingNew = {
  apiKey: 'new-secret-key',
  model: 'gpt-4-turbo'
};

const merged2 = safeMergeSettings(currentSettings, incomingNew);
assert.strictEqual(merged2.apiKey, 'new-secret-key', 'Should update key when new value received');
assert.strictEqual(merged2.model, 'gpt-4-turbo', 'Should update non-sensitive value');

// Case 3: Incoming has empty string - should update (user cleared key)
const incomingEmpty = {
  apiKey: '',
  model: 'gpt-4'
};

const merged3 = safeMergeSettings(currentSettings, incomingEmpty);
assert.strictEqual(merged3.apiKey, '', 'Should update to empty string');

console.log('✅ safeMergeSettings passed');

console.log('\n🎉 All Security Verification Tests Passed!');
