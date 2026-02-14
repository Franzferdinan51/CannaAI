import { maskSettings, safeMergeSettings } from '../../src/lib/settings-security';

console.log('🛡️ Verifying Settings Security...');

// Test 1: Masking
console.log('\nTest 1: Masking Secrets');
const settings = {
  appName: 'CannaAI',
  gemini: {
    apiKey: 'sk-1234567890abcdef',
    model: 'gemini-pro'
  },
  openRouter: {
    apiKey: 'short', // Too short to mask partially
    baseUrl: 'https://openrouter.ai'
  },
  deeply: {
    nested: {
      secret: 'supersecretvalue'
    }
  }
};

const masked = maskSettings(settings);

if (masked.gemini.apiKey === 'sk-***cdef' &&
    masked.openRouter.apiKey === '********' &&
    masked.deeply.nested.secret === 'sup***alue' &&
    masked.appName === 'CannaAI' &&
    masked.gemini.model === 'gemini-pro') {
  console.log('✅ Masking working correctly');
} else {
  console.error('❌ Masking failed:', JSON.stringify(masked, null, 2));
  process.exit(1);
}

// Test 2: Safe Merging (Preserving secrets)
console.log('\nTest 2: Safe Merging (Preserving Secrets)');
const original = {
  gemini: {
    apiKey: 'sk-original-key-12345',
    model: 'gemini-pro',
    baseUrl: 'https://original.url'
  }
};

const updateWithMask = {
  gemini: {
    apiKey: 'sk-***2345', // Masked value from frontend
    model: 'gemini-ultra', // Changed value
  }
};

const merged1 = safeMergeSettings(original.gemini, updateWithMask.gemini);

if (merged1.apiKey === 'sk-original-key-12345' &&
    merged1.model === 'gemini-ultra' &&
    merged1.baseUrl === 'https://original.url') {
  console.log('✅ Safe merging preserved secret and updated other fields');
} else {
  console.error('❌ Safe merging failed (preserve):', merged1);
  process.exit(1);
}

// Test 3: Safe Merging (Updating secrets)
console.log('\nTest 3: Safe Merging (Updating Secrets)');
const updateWithNewKey = {
  gemini: {
    apiKey: 'sk-new-key-67890', // New real key
    model: 'gemini-ultra'
  }
};

const merged2 = safeMergeSettings(original.gemini, updateWithNewKey.gemini);

if (merged2.apiKey === 'sk-new-key-67890') {
  console.log('✅ Safe merging updated new secret');
} else {
  console.error('❌ Safe merging failed (update):', merged2);
  process.exit(1);
}

console.log('\n🎉 All security tests passed!');
