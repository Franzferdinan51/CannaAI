#!/usr/bin/env node

/**
 * Debug script to get detailed error information from the analyze API
 */

async function debugAnalysisAPI() {
  const API_URL = 'http://localhost:3000/api/analyze';

  console.log('🔍 Debugging Analysis API...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strain: 'Test',
        leafSymptoms: 'Test symptoms',
        phLevel: '6.0',
        temperature: 75,
        humidity: 60,
        medium: 'Soil',
        growthStage: 'Vegetative',
        temperatureUnit: 'F',
        plantImage: null,
        pestDiseaseFocus: 'General',
        urgency: 'medium',
        additionalNotes: 'Debug test'
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response Text:', text);

    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
    }

  } catch (error) {
    console.error('Fetch Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAnalysisAPI();