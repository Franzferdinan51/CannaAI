/**
 * Debug script to test the analyze API directly
 */

const http = require('http');

// Function to make raw HTTP request to see exact behavior
function makeRawRequest(data, callback) {
  const postData = JSON.stringify(data);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Debug-Script'
    }
  };

  const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      callback({
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers,
        body: body
      });
    });
  });

  req.on('error', (error) => {
    callback({ error: error.message });
  });

  req.write(postData);
  req.end();
}

// Test different payloads
console.log('🔍 Debugging Analyze API...\n');

// Test 1: Simple text-only request
console.log('1. Testing simple text-only request...');
makeRawRequest({
  strain: "Blue Dream",
  leafSymptoms: "Yellow leaves",
  phLevel: "6.2"
}, (response) => {
  if (response.error) {
    console.log('❌ Request Error:', response.error);
  } else {
    console.log('📥 Status:', response.statusCode, response.statusMessage);
    console.log('📥 Headers:', response.headers);
    try {
      const parsed = JSON.parse(response.body);
      console.log('📥 Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('📥 Raw Body:', response.body);
    }
  }
});

// Test 2: Empty request to see what happens
setTimeout(() => {
  console.log('\n2. Testing empty request...');
  makeRawRequest({}, (response) => {
    if (response.error) {
      console.log('❌ Request Error:', response.error);
    } else {
      console.log('📥 Status:', response.statusCode, response.statusMessage);
      try {
        const parsed = JSON.parse(response.body);
        console.log('📥 Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📥 Raw Body:', response.body);
      }
    }
  });
}, 1000);

// Test 3: Request with image
setTimeout(() => {
  console.log('\n3. Testing request with base64 image...');
  makeRawRequest({
    strain: "Granddaddy Purple",
    leafSymptoms: "Purple stems",
    phLevel: "6.0",
    temperature: "75",
    humidity: "55",
    medium: "soil",
    growthStage: "vegetative",
    plantImage: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==',
    pestDiseaseFocus: "general",
    urgency: "medium",
    additionalNotes: "Test with image"
  }, (response) => {
    if (response.error) {
      console.log('❌ Request Error:', response.error);
    } else {
      console.log('📥 Status:', response.statusCode, response.statusMessage);
      try {
        const parsed = JSON.parse(response.body);
        console.log('📥 Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📥 Raw Body:', response.body);
      }
    }

    console.log('\n🎯 Debug testing complete');
  });
}, 2000);