#!/usr/bin/env node

const http = require('http');
const https = require('https');

// Test data for both scenarios
const testCases = [
  {
    name: 'Empty leafSymptoms Test',
    data: {
      strain: 'Test Strain',
      leafSymptoms: '',
      phLevel: '',
      temperature: '',
      humidity: '',
      medium: '',
      growthStage: ''
    }
  },
  {
    name: 'Valid Data Test',
    data: {
      strain: 'Granddaddy Purple',
      leafSymptoms: 'Yellowing leaves on bottom',
      phLevel: '6.2',
      temperature: '75',
      humidity: '50',
      medium: 'Soil',
      growthStage: 'Flowering'
    }
  }
];

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing /api/analyze endpoint...\n');

  // Test if server is running first
  try {
    console.log('📡 Checking if server is running...');
    await makeRequest({ strain: 'test' });
    console.log('✅ Server is responding!\n');
  } catch (error) {
    console.log('❌ Server not responding. Make sure the dev server is running on port 3000');
    console.log('   Run: npm run dev\n');
    process.exit(1);
  }

  // Run test cases
  for (const testCase of testCases) {
    console.log(`🔍 ${testCase.name}:`);
    console.log('   Data:', JSON.stringify(testCase.data, null, 6));

    try {
      const startTime = Date.now();
      const result = await makeRequest(testCase.data);
      const endTime = Date.now();

      console.log(`   ✅ Status: ${result.statusCode}`);
      console.log(`   ⏱️  Response time: ${endTime - startTime}ms`);

      if (result.statusCode === 200) {
        console.log(`   🎯 Success: ${result.data.success ? 'YES' : 'NO'}`);
        if (result.data.success) {
          console.log(`   🧠 Analysis ID: ${result.data.metadata?.analysisId || 'N/A'}`);
          console.log(`   🤖 Provider: ${result.data.provider?.used || 'N/A'}`);
          console.log(`   📊 Health Score: ${result.data.analysis?.healthScore || 'N/A'}`);
        }
      } else {
        console.log(`   ❌ Error: ${result.data.error || result.data}`);
        if (result.data.details) {
          console.log(`   📝 Details: ${result.data.details}`);
        }
      }

      // Show rate limit info if available
      if (result.headers['x-ratelimit-remaining']) {
        console.log(`   🚦 Rate limit remaining: ${result.headers['x-ratelimit-remaining']}`);
      }

    } catch (error) {
      console.log(`   💥 Request failed: ${error.message}`);
    }

    console.log(''); // Add spacing between tests
  }

  console.log('🏁 Testing complete!');
}

// Run the tests
runTests().catch(console.error);