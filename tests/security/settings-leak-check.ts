
// Set environment variable BEFORE importing the route
process.env.GEMINI_API_KEY = 'TEST_SECRET_KEY_12345';

console.log('Script ENV setup:', process.env.GEMINI_API_KEY);

async function runCheck() {
  console.log('🔒 Starting Security Check: API Key Leakage');

  // Dynamic import to ensure process.env is set before module loads
  const { GET } = await import('../../src/app/api/settings/route');

  try {
    // Invoke GET handler
    const response = await GET();

    // Parse response
    const data = await response.json();

    if (!data.success) {
      console.error('❌ API returned failure:', data);
      process.exit(1);
    }

    const settings = data.settings;
    const geminiKey = settings.gemini?.apiKey;

    console.log(`Checking Gemini API Key...`);

    if (geminiKey === 'TEST_SECRET_KEY_12345') {
      console.error('❌ CRITICAL VULNERABILITY: API Key is exposed in plain text!');
      console.log('Expected: ****************');
      console.log('Received: TEST_SECRET_KEY_12345');
      process.exit(1);
    } else if (geminiKey === '****************') {
      console.log('✅ SECURE: API Key is masked.');
      process.exit(0);
    } else {
      console.error('❓ Unexpected value:', geminiKey);
      console.log('Received:', geminiKey);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error running check:', error);
    process.exit(1);
  }
}

runCheck();
