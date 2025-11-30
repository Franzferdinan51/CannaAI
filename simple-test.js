#!/usr/bin/env node

const http = require('http');

console.log('🧪 Simple API Test - Checking if server responds...');

// Test data
const testData = {
  strain: 'Test Strain',
  leafSymptoms: '',
  phLevel: '',
  temperature: '',
  humidity: '',
  medium: '',
  growthStage: ''
};

function makeSimpleRequest() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testData);

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    });

    req.on('response', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`✅ Response received:`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);

        // Try to parse JSON
        try {
          const jsonData = JSON.parse(data);
          console.log(`   JSON Response:`, JSON.stringify(jsonData, null, 2));

          if (jsonData.success) {
            console.log(`🎉 SUCCESS: API is working correctly!`);
          } else {
            console.log(`⚠️  API returned error:`, jsonData.error);
          }
        } catch (e) {
          console.log(`   Raw Response (length ${data.length}):`, data.substring(0, 200) + '...');
          if (data.includes('refreshing') || data.includes('check()')) {
            console.log(`🔄 Server is still building...`);
          } else {
            console.log(`❌ Response is not valid JSON`);
          }
        }

        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request failed: ${err.message}`);
      if (err.code === 'ECONNREFUSED') {
        console.log(`   Server is not running on port 3000`);
        console.log(`   Please start the dev server with: npm run dev`);
      }
      reject(err);
    });

    req.on('timeout', () => {
      console.log(`⏰ Request timed out`);
      req.destroy();
      reject(new Error('timeout'));
    });

    console.log(`📤 Sending POST request with data:`, JSON.stringify(testData, null, 2));
    req.write(postData);
    req.end();
  });
}

makeSimpleRequest()
  .then(() => {
    console.log('\n🏁 Test completed');
  })
  .catch((err) => {
    console.log('\n💥 Test failed:', err.message);
    process.exit(1);
  });