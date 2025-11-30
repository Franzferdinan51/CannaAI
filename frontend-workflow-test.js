/**
 * Frontend Photo Analysis Workflow Test
 *
 * This test simulates the exact user experience for photo analysis,
 * matching the frontend implementation in src/app/page.tsx
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const API_URL = 'http://localhost:3000/api/analyze';

// Create a minimal test image (1x1 pixel JPEG) for testing
const createTestImageBase64 = () => {
  // This is a minimal 1x1 pixel JPEG in base64
  return '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==';
};

// Exact payload structure that frontend sends (from handleFormSubmit function)
const createFrontendPayload = (imageBase64 = null) => {
  return {
    strain: "Blue Dream",
    leafSymptoms: "Yellow spots on lower leaves",
    phLevel: "6.2",
    temperature: "75",
    humidity: "55",
    medium: "soil",
    growthStage: "vegetative",
    plantImage: imageBase64, // This is the exact field name frontend uses
    pestDiseaseFocus: "general",
    urgency: "medium",
    additionalNotes: "Plant has been in veg for 3 weeks"
  };
};

// Headers that frontend sends
const getFrontendHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
};

// Test function to simulate frontend request
async function testFrontendPhotoAnalysis() {
  console.log('🚀 Testing Frontend Photo Analysis Workflow');
  console.log('==========================================\n');

  // Test 1: API Health Check
  console.log('1️⃣ Testing API Health Check...');
  try {
    const healthResponse = await fetch(API_URL, {
      method: 'GET',
      headers: getFrontendHeaders()
    });

    const healthData = await healthResponse.json();
    console.log('✅ Health Check Status:', healthResponse.status);
    console.log('✅ Health Check Response:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Text-only analysis (no image) - baseline test
  console.log('2️⃣ Testing Text-Only Analysis (Baseline)...');
  try {
    const textOnlyPayload = createFrontendPayload();
    delete textOnlyPayload.plantImage; // Remove image to test text-only

    console.log('📤 Sending payload:', JSON.stringify(textOnlyPayload, null, 2));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getFrontendHeaders(),
      body: JSON.stringify(textOnlyPayload)
    });

    console.log('📥 Response Status:', response.status, response.statusText);

    const responseData = await response.json();
    console.log('📥 Full Response:', JSON.stringify(responseData, null, 2));

    // Test if response matches frontend expectations
    if (responseData.success && responseData.analysis) {
      console.log('✅ Text-only analysis successful');
      console.log('✅ Diagnosis:', responseData.analysis.diagnosis);
      console.log('✅ Confidence:', responseData.analysis.confidence);
    } else {
      console.log('❌ Text-only analysis failed or unexpected format');
    }
  } catch (error) {
    console.log('❌ Text-only analysis error:', error.message);
    console.log('❌ Error stack:', error.stack);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Photo analysis with base64 image
  console.log('3️⃣ Testing Photo Analysis with Base64 Image...');
  try {
    const imageBase64 = createTestImageBase64();
    console.log('📷 Test image size:', imageBase64.length, 'characters');

    const photoPayload = createFrontendPayload(imageBase64);

    console.log('📤 Sending payload with image...');
    console.log('📤 Payload structure:', {
      ...photoPayload,
      plantImage: photoPayload.plantImage ? `[Base64 image data: ${photoPayload.plantImage.length} chars]` : null
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getFrontendHeaders(),
      body: JSON.stringify(photoPayload)
    });

    console.log('📥 Response Status:', response.status, response.statusText);

    const responseData = await response.json();
    console.log('📥 Full Response:', JSON.stringify(responseData, null, 2));

    // Validate response format matches frontend expectations
    console.log('\n🔍 Validating Response Format...');

    // Frontend expects: result.data || result (from createAPIResponse wrapper)
    const processedData = responseData.data || responseData;

    if (processedData.success && processedData.analysis) {
      console.log('✅ Photo analysis successful');
      console.log('✅ Diagnosis:', processedData.analysis.diagnosis);
      console.log('✅ Confidence:', processedData.analysis.confidence);
      console.log('✅ Health Score:', processedData.analysis.healthScore);
      console.log('✅ Image Analysis:', processedData.analysis.imageAnalysis);
      console.log('✅ Image Info:', processedData.imageInfo);

      // Test specific fields that frontend uses
      const requiredFields = [
        'diagnosis', 'confidence', 'healthScore', 'causes', 'treatment',
        'symptomsMatched', 'imageAnalysis', 'pestsDetected', 'diseasesDetected'
      ];

      const missingFields = requiredFields.filter(field => !(field in processedData.analysis));
      if (missingFields.length > 0) {
        console.log('⚠️  Missing fields that frontend expects:', missingFields);
      } else {
        console.log('✅ All required fields present for frontend');
      }

      // Simulate frontend processing
      console.log('\n🔄 Simulating Frontend Processing...');
      const frontendResult = {
        diagnosis: processedData.analysis.diagnosis,
        confidence: processedData.analysis.confidence,
        symptomsMatched: processedData.analysis.symptomsMatched || [],
        causes: processedData.analysis.causes || [],
        treatment: processedData.analysis.treatment || [],
        healthScore: processedData.analysis.healthScore,
        strainSpecificAdvice: processedData.analysis.strainSpecificAdvice,
        reasoning: processedData.analysis.reasoning || [],
        isPurpleStrain: processedData.analysis.isPurpleStrain || false,
        recommendations: processedData.analysis.recommendations || [],
        pestsDetected: processedData.analysis.pestsDetected || [],
        diseasesDetected: processedData.analysis.diseasesDetected || [],
        environmentalFactors: processedData.analysis.environmentalFactors || [],
        urgency: processedData.analysis.urgency || 'medium',
        preventativeMeasures: processedData.analysis.preventativeMeasures || [],
        imageAnalysis: processedData.analysis.imageAnalysis || { hasImage: false, visualFindings: [], confidence: 0 },
        detailedRecommendations: processedData.analysis.recommendations || {
          immediate: [],
          shortTerm: [],
          longTerm: []
        },
        followUpSchedule: processedData.analysis.followUpSchedule || 'Monitor regularly',
        primaryIssue: {
          name: processedData.analysis.diagnosis,
          severity: processedData.analysis.healthScore > 70 ? 'low' : processedData.analysis.healthScore > 40 ? 'medium' : 'high',
          confidence: processedData.analysis.confidence,
          urgency: processedData.analysis.urgency || 'medium'
        },
        totalIssues: (processedData.analysis.causes?.length || 0) +
                   (processedData.analysis.pestsDetected?.length || 0) +
                   (processedData.analysis.diseasesDetected?.length || 0),
        fallbackUsed: processedData.fallbackUsed || false,
        fallbackReason: processedData.fallbackReason || null,
        diagnosticCapabilities: processedData.diagnosticCapabilities || {},
        imageInfo: processedData.imageInfo || null
      };

      console.log('✅ Frontend processing simulation successful');
      console.log('✅ Final data structure keys:', Object.keys(frontendResult));
    } else {
      console.log('❌ Photo analysis failed or unexpected format');
      console.log('❌ Success field:', processedData.success);
      console.log('❌ Analysis field:', !!processedData.analysis);
    }
  } catch (error) {
    console.log('❌ Photo analysis error:', error.message);
    console.log('❌ Error stack:', error.stack);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: CORS and Headers Check
  console.log('4️⃣ Testing CORS and Request Headers...');
  try {
    const optionsRequest = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('📥 OPTIONS Status:', optionsRequest.status);
    console.log('📥 CORS Headers:', {
      'Access-Control-Allow-Origin': optionsRequest.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': optionsRequest.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': optionsRequest.headers.get('Access-Control-Allow-Headers')
    });
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Error handling simulation
  console.log('5️⃣ Testing Error Handling...');
  try {
    const invalidPayload = {
      strain: null,
      leafSymptoms: "",
      phLevel: "invalid",
      temperature: "not_a_number"
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getFrontendHeaders(),
      body: JSON.stringify(invalidPayload)
    });

    console.log('📥 Error Response Status:', response.status);
    const errorData = await response.json();
    console.log('📥 Error Response:', JSON.stringify(errorData, null, 2));

    // Frontend expects specific error format
    if (errorData.error) {
      console.log('✅ Error format matches frontend expectations');
    } else {
      console.log('⚠️  Error format might not match frontend expectations');
    }
  } catch (error) {
    console.log('❌ Error handling test error:', error.message);
  }

  console.log('\n🎯 Frontend Photo Analysis Workflow Test Complete');
  console.log('🎯 Review the results above to identify any integration issues');
}

// Run the test
if (require.main === module) {
  testFrontendPhotoAnalysis().catch(console.error);
}

module.exports = {
  testFrontendPhotoAnalysis,
  createFrontendPayload,
  createTestImageBase64,
  getFrontendHeaders
};