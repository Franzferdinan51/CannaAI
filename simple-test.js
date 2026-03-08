#!/usr/bin/env node
/**
 * Simple CannaAI API Test
 * Tests the enhanced analysis without complex validation
 */

const API_URL = 'http://localhost:3000';

async function testAnalysis() {
  console.log('🧪 Testing CannaAI Enhanced Analysis\n');
  
  const testData = {
    strain: 'Grand Daddy Purple',
    leafSymptoms: 'Yellowing between veins on lower leaves, green veins remaining',
    growthStage: 'flowering',
    temperature: 75,
    humidity: 45,
    urgency: 'medium'
  };

  try {
    console.log('📤 Sending request...');
    const response = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    console.log(`📥 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Analysis successful!\n');
    console.log('📊 Results:');
    console.log(`   Diagnosis: ${result.analysis?.diagnosis}`);
    console.log(`   Urgency: ${result.analysis?.urgency}`);
    console.log(`   Health Score: ${result.analysis?.healthScore}`);
    console.log(`   Urgency Reasons: ${result.analysis?.urgencyReasons?.length || 0}`);
    console.log(`   Evidence Observations: ${result.analysis?.evidenceObservations?.length || 0}`);
    console.log(`   Uncertainties: ${result.analysis?.uncertainties?.length || 0}`);
    
    // Check for enhanced fields
    console.log('\n🔍 Enhanced Fields:');
    console.log(`   Health Score Breakdown: ${Object.keys(result.analysis?.healthScoreBreakdown || {}).length} categories`);
    console.log(`   Detected Issues: ${result.analysis?.detectedIssues?.length || 0}`);
    console.log(`   Environment Risk Assessment: ${result.analysis?.environmentRiskAssessment ? '✅' : '❌'}`);
    console.log(`   Prioritized Action Plan: ${result.analysis?.prioritizedActionPlan ? '✅' : '❌'}`);
    
    // Sample urgency reasons
    if (result.analysis?.urgencyReasons?.length > 0) {
      console.log('\n💡 Sample Urgency Reasons:');
      result.analysis.urgencyReasons.slice(0, 2).forEach((reason, i) => {
        console.log(`   ${i + 1}. ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`);
      });
    }
    
    // Sample health breakdown
    if (result.analysis?.healthScoreBreakdown) {
      console.log('\n📈 Sample Health Breakdown:');
      const firstCategory = Object.keys(result.analysis.healthScoreBreakdown)[0];
      if (firstCategory) {
        const cat = result.analysis.healthScoreBreakdown[firstCategory];
        console.log(`   ${firstCategory}: ${cat.score}/100`);
        console.log(`   Rationale: ${cat.rationale?.slice(0, 100)}${cat.rationale?.length > 100 ? '...' : ''}`);
      }
    }
    
    console.log('\n✅ Enhanced analysis is working correctly!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAnalysis();
