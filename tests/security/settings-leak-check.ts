
import { GET, POST } from '../../src/app/api/settings/route';
import { NextRequest } from 'next/server';

// Mock global fetch to capture API key usage
const originalFetch = global.fetch;
let lastAuthHeader = '';

global.fetch = async (url, options) => {
  if (options && options.headers) {
    // Check for Authorization header
    const auth = (options.headers as any)['Authorization'];
    if (auth) {
      lastAuthHeader = auth;
    }
  }
  // Return a dummy success response for connection tests
  return {
    ok: true,
    json: async () => ({ data: [] })
  } as any;
};

async function runTest() {
  console.log('🔒 Verifying Security Fix: Settings API Key Masking');

  // 1. Setup: Set a secret API key via POST
  const secretKey = 'sk-SECRET-KEY-12345';
  const MASKED_KEY = '****************'; // Matches the server constant

  console.log('1. Setting up secret key...');
  const setupReq = new NextRequest('http://localhost/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_provider',
      provider: 'openai',
      config: { apiKey: secretKey }
    })
  });

  await POST(setupReq);

  // 2. Verify GET returns masked key
  console.log('2. Verifying GET returns masked key...');
  const getReq = new NextRequest('http://localhost/api/settings');
  const getRes = await GET();
  const getData = await getRes.json();

  const leakedKey = getData.settings?.openai?.apiKey;

  if (leakedKey === MASKED_KEY) {
    console.log('✅ GET: API Key is correctly masked.');
  } else {
    console.error('❌ GET: API Key is NOT masked properly.');
    console.error(`   Expected: ${MASKED_KEY}`);
    console.error(`   Received: ${leakedKey}`);
    process.exit(1);
  }

  // 3. Verify POST with mask preserves real key
  console.log('3. Verifying POST with mask preserves real key...');

  // Update with mask
  const updateReq = new NextRequest('http://localhost/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_provider',
      provider: 'openai',
      config: { apiKey: MASKED_KEY, model: 'new-model' } // Change model to ensure update happens
    })
  });

  await POST(updateReq);

  // Now trigger test_connection to see what key is used
  console.log('4. Testing connection to check internal key state...');
  const testReq = new NextRequest('http://localhost/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      action: 'test_connection',
      provider: 'openai'
    })
  });

  lastAuthHeader = ''; // Reset capture
  await POST(testReq);

  if (lastAuthHeader === `Bearer ${secretKey}`) {
    console.log('✅ POST: Real key was preserved! Fetch called with correct secret.');
  } else if (lastAuthHeader === `Bearer ${MASKED_KEY}`) {
    console.error('❌ POST: Real key was OVERWRITTEN by mask!');
    process.exit(1);
  } else {
    console.error(`❌ POST: Unexpected Auth Header: ${lastAuthHeader}`);
    process.exit(1);
  }

  console.log('\n🎉 Security Fix Verified Successfully!');
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
