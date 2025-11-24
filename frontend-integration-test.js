/**
 * Complete Frontend Integration Test for Photo Analysis
 *
 * This test simulates the exact frontend workflow and provides diagnostic information
 * about the integration status and any issues found.
 */

const http = require('http');

// Test configuration
const API_URL = 'http://localhost:3000/api/analyze';

// Frontend payload structure (exact match from handleFormSubmit in page.tsx)
function createFrontendPayload(imageBase64 = null) {
  return {
    strain: "Blue Dream",
    leafSymptoms: "Yellow spots on lower leaves, some curling",
    phLevel: "6.2",
    temperature: "75",  // Fahrenheit as string
    humidity: "55",    // Percentage as string
    medium: "soil",
    growthStage: "vegetative",
    plantImage: imageBase64, // This is the key field causing issues
    pestDiseaseFocus: "general",
    urgency: "medium",
    additionalNotes: "Plant has been in veg for 3 weeks, overall looks healthy except for yellowing"
  };
}

// Make HTTP request
function makeRequest(payload, callback) {
  const postData = JSON.stringify(payload);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (compatible; FrontendIntegrationTest/1.0)',
      'Accept': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
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

// Test execution
async function runFrontendIntegrationTest() {
  console.log('🎯 Frontend Photo Analysis Integration Test');
  console.log('='.repeat(50));
  console.log('Testing exact user workflow as experienced in the browser...\n');

  const results = {
    textAnalysis: null,
    imageAnalysis: null,
    errors: [],
    recommendations: []
  };

  // Test 1: Text-only analysis (baseline)
  console.log('1️⃣ Testing Text-Only Analysis (Baseline)...');
  try {
    const textPayload = createFrontendPayload();
    delete textPayload.plantImage; // Remove image to test baseline

    const response = await new Promise((resolve) => {
      makeRequest(textPayload, resolve);
    });

    if (response.error) {
      console.log('❌ Text Analysis Error:', response.error);
      results.errors.push('Text analysis failed: ' + response.error);
    } else {
      console.log('✅ Text Analysis Status:', response.statusCode);

      try {
        const parsed = JSON.parse(response.body);

        // Handle wrapped response format (createAPIResponse wrapper)
        const data = parsed.data || parsed;

        if (data.success && data.analysis) {
          console.log('✅ Text Analysis Successful');
          console.log('   Diagnosis:', data.analysis.diagnosis);
          console.log('   Confidence:', data.analysis.confidence + '%');
          console.log('   Health Score:', data.analysis.healthScore + '/100');

          results.textAnalysis = {
            success: true,
            diagnosis: data.analysis.diagnosis,
            confidence: data.analysis.confidence,
            healthScore: data.analysis.healthScore,
            responseFormat: 'wrapped'
          };
        } else {
          console.log('❌ Text Analysis Failed - Unexpected format');
          results.errors.push('Text analysis returned unexpected format');
        }
      } catch (parseError) {
        console.log('❌ Text Analysis Parse Error:', parseError.message);
        results.errors.push('Text analysis response parse error: ' + parseError.message);
      }
    }
  } catch (error) {
    console.log('❌ Text Analysis Exception:', error.message);
    results.errors.push('Text analysis exception: ' + error.message);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: Photo analysis with base64 image
  console.log('2️⃣ Testing Photo Analysis (with base64 image)...');
  try {
    // Create a small test image (1x1 pixel JPEG in base64)
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';

    const imagePayload = createFrontendPayload(testImageBase64);
    console.log('   Image size:', testImageBase64.length, 'characters');

    const response = await new Promise((resolve) => {
      makeRequest(imagePayload, resolve);
    });

    if (response.error) {
      console.log('❌ Photo Analysis Error:', response.error);
      results.errors.push('Photo analysis failed: ' + response.error);
    } else {
      console.log('✅ Photo Analysis Status:', response.statusCode);

      try {
        const parsed = JSON.parse(response.body);

        // Handle wrapped response format
        const data = parsed.data || parsed;

        if (data.success && data.analysis) {
          console.log('✅ Photo Analysis Successful');
          console.log('   Diagnosis:', data.analysis.diagnosis);
          console.log('   Confidence:', data.analysis.confidence + '%');
          console.log('   Health Score:', data.analysis.healthScore + '/100');
          console.log('   Image Analysis:', data.analysis.imageAnalysis || 'Not available');
          console.log('   Image Info:', data.imageInfo || 'No image processing');

          results.imageAnalysis = {
            success: true,
            diagnosis: data.analysis.diagnosis,
            confidence: data.analysis.confidence,
            healthScore: data.analysis.healthScore,
            hasImageProcessing: !!(data.analysis.imageAnalysis || data.imageInfo),
            responseFormat: 'wrapped'
          };
        } else if (response.statusCode === 500) {
          console.log('❌ Photo Analysis Failed (500 Internal Server Error)');
          console.log('   Error details:', data.error || 'No error details provided');

          results.errors.push('Photo analysis returned 500 error: ' + (data.error?.message || 'Unknown error'));
          results.imageAnalysis = {
            success: false,
            error: '500 Internal Server Error',
            details: data.error
          };
        } else {
          console.log('❌ Photo Analysis Failed - Unexpected response');
          results.errors.push('Photo analysis returned unexpected status: ' + response.statusCode);
          results.imageAnalysis = {
            success: false,
            error: 'Unexpected response',
            statusCode: response.statusCode
          };
        }
      } catch (parseError) {
        console.log('❌ Photo Analysis Parse Error:', parseError.message);
        results.errors.push('Photo analysis response parse error: ' + parseError.message);
      }
    }
  } catch (error) {
    console.log('❌ Photo Analysis Exception:', error.message);
    results.errors.push('Photo analysis exception: ' + error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Integration Test Results Summary');
  console.log('='.repeat(50));

  // Overall assessment
  const textWorks = results.textAnalysis && results.textAnalysis.success;
  const imageWorks = results.imageAnalysis && results.imageAnalysis.success;

  console.log('\n🔍 Functionality Status:');
  console.log('   Text Analysis:', textWorks ? '✅ Working' : '❌ Failed');
  console.log('   Photo Analysis:', imageWorks ? '✅ Working' : '❌ Failed');
  console.log('   Response Format:', results.textAnalysis?.responseFormat || 'Unknown');

  console.log('\n🚨 Issues Found:');
  if (results.errors.length === 0) {
    console.log('   ✅ No issues detected - Frontend integration should work correctly');
  } else {
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log('\n💡 Recommendations:');
  if (!textWorks) {
    console.log('   🔧 Fix text analysis functionality first - this is the baseline');
  } else if (!imageWorks) {
    console.log('   🔧 Fix image processing - text analysis works but image processing fails');
    console.log('   💡 Check for image size limits, base64 validation, or image processing errors');
  } else {
    console.log('   ✅ All functionality working correctly - Frontend integration should be seamless');
  }

  if (textWorks && !imageWorks) {
    console.log('\n🎯 Specific Fix Needed:');
    console.log('   The API responds correctly to text requests but fails when plantImage is included.');
    console.log('   This suggests an issue in the image processing pipeline or request validation.');
    console.log('   Check server logs for detailed error information when plantImage is present.');
    console.log('   The issue is likely in the route handler that processes the plantImage field.');
  }

  console.log('\n🌐 Frontend Integration Status:');
  const overallStatus = textWorks && imageWorks ? '✅ READY' : '⚠️  NEEDS FIXES';
  console.log(`   Status: ${overallStatus}`);
  console.log(`   Text requests work: ${textWorks ? 'Yes' : 'No'}`);
  console.log(`   Photo requests work: ${imageWorks ? 'Yes' : 'No'}`);
  console.log(`   Response format matches frontend: ${results.textAnalysis?.responseFormat === 'wrapped' ? 'Yes' : 'No'}`);

  return results;
}

// Run the test
if (require.main === module) {
  runFrontendIntegrationTest()
    .then(results => {
      console.log('\n🎉 Frontend Integration Test Complete!');
      process.exit(results.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n💥 Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { runFrontendIntegrationTest, createFrontendPayload };