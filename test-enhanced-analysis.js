#!/usr/bin/env node
/**
 * CannaAI Enhanced Analysis Test Script
 * 
 * Tests the enhanced structured analysis prompt and parser
 * by making real API calls and validating response quality.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.CANNAI_URL || 'http://localhost:3000';
const TEST_IMAGE_PATH = process.env.TEST_IMAGE || null;

// Test cases
const testCases = [
  {
    name: 'Nutrient Deficiency (Text Only)',
    data: {
      strain: 'Grand Daddy Purple',
      leafSymptoms: 'Yellowing between veins on lower leaves, green veins remaining, some rusty brown spots on leaf margins',
      growthStage: 'flowering',
      temperature: 75,
      humidity: 45,
      phLevel: 6.5,
      medium: 'soil',
      urgency: 'medium'
    },
    expectations: {
      diagnosis: /deficiency/i,
      urgency: 'medium',
      minUrgencyReasons: 2,
      minEvidenceObservations: 3,
      minUncertainties: 2,
      healthScoreRange: [40, 90]
    }
  },
  {
    name: 'Pest Infestation (High Urgency)',
    data: {
      strain: 'Blue Dream',
      leafSymptoms: 'Tiny white spots on leaves, fine webbing visible under fan leaves, leaves turning bronze',
      growthStage: 'vegetative',
      temperature: 78,
      humidity: 55,
      urgency: 'high'
    },
    expectations: {
      diagnosis: /(spider mite|pest)/i,
      urgency: 'high',
      minUrgencyReasons: 3,
      minEvidenceObservations: 3,
      minUncertainties: 2,
      healthScoreRange: [30, 70]
    }
  },
  {
    name: 'Healthy Plant Check (Low Urgency)',
    data: {
      strain: 'Girl Scout Cookies',
      leafSymptoms: 'Plant looks healthy, vibrant green growth, asking for optimization tips',
      growthStage: 'vegetative',
      temperature: 72,
      humidity: 50,
      phLevel: 6.3,
      urgency: 'low'
    },
    expectations: {
      urgency: 'low',
      minUrgencyReasons: 2,
      healthScoreRange: [80, 100]
    }
  }
];

// Validation functions
function validateStructure(response) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!response.analysis) {
    errors.push('Missing analysis object in response');
    return { errors, warnings, valid: false };
  }

  const analysis = response.analysis;

  // Required keys
  const requiredKeys = [
    'diagnosis', 'summary', 'urgency', 'urgencyReasons',
    'healthScore', 'healthScoreBreakdown', 'likelyCauses',
    'evidenceObservations', 'uncertainties', 'recommendations'
  ];

  for (const key of requiredKeys) {
    if (!(key in analysis)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  // Validate urgencyReasons
  if (!Array.isArray(analysis.urgencyReasons)) {
    errors.push('urgencyReasons is not an array');
  } else if (analysis.urgencyReasons.length < 2) {
    errors.push(`urgencyReasons has only ${analysis.urgencyReasons.length} entries (minimum 2 required)`);
  }

  // Validate healthScoreBreakdown
  if (!analysis.healthScoreBreakdown || typeof analysis.healthScoreBreakdown !== 'object') {
    errors.push('healthScoreBreakdown is missing or not an object');
  } else {
    const breakdownCategories = ['vigor', 'leafCondition', 'pestFree', 'environmentOptimal', 'growthStageAppropriate', 'rootHealth'];
    for (const category of breakdownCategories) {
      if (!analysis.healthScoreBreakdown[category]) {
        errors.push(`Missing healthScoreBreakdown category: ${category}`);
      } else {
        const catData = analysis.healthScoreBreakdown[category];
        if (typeof catData.score !== 'number') {
          errors.push(`healthScoreBreakdown.${category}.score is not a number`);
        }
        if (!catData.rationale || typeof catData.rationale !== 'string') {
          warnings.push(`healthScoreBreakdown.${category}.rationale is missing or not a string`);
        }
      }
    }
  }

  // Validate likelyCauses
  if (!Array.isArray(analysis.likelyCauses)) {
    errors.push('likelyCauses is not an array');
  } else if (analysis.likelyCauses.length < 2) {
    warnings.push(`likelyCauses has only ${analysis.likelyCauses.length} entries (recommended: 2+)`);
  }

  // Validate evidenceObservations
  if (!Array.isArray(analysis.evidenceObservations)) {
    errors.push('evidenceObservations is not an array');
  } else if (analysis.evidenceObservations.length < 3) {
    warnings.push(`evidenceObservations has only ${analysis.evidenceObservations.length} entries (recommended: 3+)`);
  }

  // Validate uncertainties
  if (!Array.isArray(analysis.uncertainties)) {
    errors.push('uncertainties is not an array');
  } else if (analysis.uncertainties.length < 2) {
    warnings.push(`uncertainties has only ${analysis.uncertainties.length} entries (recommended: 2+)`);
  }

  // Validate healthScore
  if (typeof analysis.healthScore !== 'number') {
    errors.push('healthScore is not a number');
  } else if (analysis.healthScore < 0 || analysis.healthScore > 100) {
    errors.push('healthScore is outside valid range 0-100');
  }

  // Validate urgency value
  const validUrgencies = ['low', 'medium', 'high', 'critical'];
  if (!validUrgencies.includes(analysis.urgency)) {
    errors.push(`Invalid urgency value: ${analysis.urgency}`);
  }

  // Check for explainability fields (report-v2 contract)
  const explainabilityFields = [
    'detectedIssues', 'environmentRiskAssessment', 'prioritizedActionPlan'
  ];
  for (const field of explainabilityFields) {
    if (!(field in analysis)) {
      warnings.push(`Missing explainability field: ${field} (report-v2 enhancement)`);
    }
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0
  };
}

function validateExpectations(analysis, expectations) {
  const failures = [];

  if (expectations.diagnosis && !expectations.diagnosis.test(analysis.diagnosis)) {
    failures.push(`Diagnosis "${analysis.diagnosis}" does not match expected pattern ${expectations.diagnosis}`);
  }

  if (expectations.urgency && analysis.urgency !== expectations.urgency) {
    failures.push(`Urgency is "${analysis.urgency}", expected "${expectations.urgency}"`);
  }

  if (expectations.minUrgencyReasons && analysis.urgencyReasons.length < expectations.minUrgencyReasons) {
    failures.push(`urgencyReasons has ${analysis.urgencyReasons.length} entries, expected minimum ${expectations.minUrgencyReasons}`);
  }

  if (expectations.minEvidenceObservations && analysis.evidenceObservations.length < expectations.minEvidenceObservations) {
    failures.push(`evidenceObservations has ${analysis.evidenceObservations.length} entries, expected minimum ${expectations.minEvidenceObservations}`);
  }

  if (expectations.minUncertainties && analysis.uncertainties.length < expectations.minUncertainties) {
    failures.push(`uncertainties has ${analysis.uncertainties.length} entries, expected minimum ${expectations.minUncertainties}`);
  }

  if (expectations.healthScoreRange) {
    const [min, max] = expectations.healthScoreRange;
    if (analysis.healthScore < min || analysis.healthScore > max) {
      failures.push(`healthScore ${analysis.healthScore} is outside expected range [${min}, ${max}]`);
    }
  }

  return failures;
}

function scoreRationaleQuality(analysis) {
  let score = 0;
  let maxScore = 0;

  // Score urgencyReasons specificity (0-2 points per reason)
  if (Array.isArray(analysis.urgencyReasons)) {
    maxScore += analysis.urgencyReasons.length * 2;
    for (const reason of analysis.urgencyReasons) {
      if (reason.length > 30) score += 1;
      if (reason.length > 60) score += 1;
    }
  }

  // Score healthScoreBreakdown rationale quality (0-2 points per category)
  if (analysis.healthScoreBreakdown) {
    const categories = Object.values(analysis.healthScoreBreakdown);
    maxScore += categories.length * 2;
    for (const cat of categories) {
      if (cat.rationale && cat.rationale.length > 30) score += 1;
      if (cat.rationale && cat.rationale.length > 60) score += 1;
    }
  }

  // Score likelyCauses evidence (0-2 points per cause)
  if (Array.isArray(analysis.likelyCauses)) {
    maxScore += analysis.likelyCauses.length * 2;
    for (const cause of analysis.likelyCauses) {
      if (cause.evidence && cause.evidence.length > 30) score += 1;
      if (cause.evidence && cause.evidence.length > 60) score += 1;
    }
  }

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  };
}

// Main test runner
async function runTests() {
  console.log('🧪 CannaAI Enhanced Analysis Test Suite\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Cases: ${testCases.length}\n`);

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('─'.repeat(60));

    try {
      // Make API call
      const startTime = Date.now();
      const apiResponse = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.data)
      });

      const responseTime = Date.now() - startTime;

      if (!apiResponse.ok) {
        throw new Error(`API returned ${apiResponse.status}: ${apiResponse.statusText}`);
      }

      const response = await apiResponse.json();

      // Validate structure
      const structureValidation = validateStructure(response);

      // Validate expectations
      const expectationFailures = validateExpectations(response.analysis, testCase.expectations);

      // Score rationale quality
      const rationaleScore = scoreRationaleQuality(response.analysis);

      // Compile results
      const testResult = {
        name: testCase.name,
        success: structureValidation.valid && expectationFailures.length === 0,
        responseTime,
        structureErrors: structureValidation.errors,
        structureWarnings: structureValidation.warnings,
        expectationFailures,
        rationaleQuality: rationaleScore,
        analysis: response.analysis
      };

      results.push(testResult);

      // Print results
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`✅ Structure Valid: ${structureValidation.valid}`);
      
      if (structureValidation.errors.length > 0) {
        console.log(`❌ Structure Errors (${structureValidation.errors.length}):`);
        structureValidation.errors.forEach(err => console.log(`   - ${err}`));
      }

      if (structureValidation.warnings.length > 0) {
        console.log(`⚠️  Warnings (${structureValidation.warnings.length}):`);
        structureValidation.warnings.forEach(warn => console.log(`   - ${warn}`));
      }

      if (expectationFailures.length > 0) {
        console.log(`❌ Expectation Failures (${expectationFailures.length}):`);
        expectationFailures.forEach(fail => console.log(`   - ${fail}`));
      }

      console.log(`📊 Rationale Quality Score: ${rationaleScore.percentage}% (${rationaleScore.score}/${rationaleScore.maxScore})`);
      console.log(`🎯 Overall: ${testResult.success ? '✅ PASS' : '❌ FAIL'}`);

    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      results.push({
        name: testCase.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const passRate = Math.round((passed / total) * 100);

  console.log(`\nPassed: ${passed}/${total} (${passRate}%)`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! Enhanced analysis is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
  }

  // Save detailed results
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { passed, total, passRate },
    results: results.map(r => ({
      name: r.name,
      success: r.success,
      responseTime: r.responseTime,
      structureErrors: r.structureErrors?.length || 0,
      structureWarnings: r.structureWarnings?.length || 0,
      expectationFailures: r.expectationFailures?.length || 0,
      rationaleQuality: r.rationaleQuality?.percentage || 0,
      error: r.error
    }))
  }, null, 2));

  console.log(`\n📄 Detailed results saved to: ${resultsPath}`);

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
