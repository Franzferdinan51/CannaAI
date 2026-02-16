async function verifyHeaders() {
  const port = 3000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Verifying security headers at ${baseUrl}...`);

  try {
    const response = await fetch(`${baseUrl}/`);
    console.log(`Response status: ${response.status}`);

    const headers = response.headers;
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      // 'content-security-policy', // Might vary by env
    ];

    let passed = true;

    for (const header of requiredHeaders) {
      if (headers.has(header)) {
        console.log(`✅ ${header}: ${headers.get(header)}`);
      } else {
        console.error(`❌ Missing header: ${header}`);
        passed = false;
      }
    }

    if (!passed) {
      console.error('Security headers check FAILED');
      process.exit(1);
    } else {
      console.log('Security headers check PASSED');
    }

  } catch (error) {
    console.error('Error fetching URL:', error);
    console.log('Make sure the server is running on port 3000');
    process.exit(1);
  }
}

verifyHeaders();
