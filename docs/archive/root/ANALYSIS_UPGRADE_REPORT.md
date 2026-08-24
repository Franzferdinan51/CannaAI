# Analysis Prompt & Parser Upgrade - Quality Report

## Overview

This document describes the improvements made to the plant health analysis system to provide more explainable, structured AI outputs with robust JSON extraction and parsing.

## Changes Made

### 1. New V2 Analysis Prompt (`src/lib/analysis-prompt-v2.ts`)

**Purpose**: Provide a focused, explainable prompt that emphasizes structured JSON output with explicit rationale fields.

**Key Features**:
- Clean, modular prompt generation function
- Explicit JSON schema with required fields
- Structured output format with rationale for every conclusion
- Clear urgency determination rules
- Detailed health scoring breakdown requirements
- Actionable recommendations organized by timeframe

### 2. Enhanced JSON Extraction (`src/lib/analysis-json.ts`)

**Improvements over previous version**:
- Multi-strategy extraction with confidence scoring
- Better markdown/code block handling (```json, ~~~, <code>)
- Smart quote/apostrophe normalization
- Improved partial JSON repair with stack-based brace matching
- Balanced JSON extraction that handles nested structures
- Aggressive fallback extraction for malformed responses

**Extraction Strategies (in order)**:
1. Direct parse (pure JSON)
2. Markdown block extraction
3. Balanced brace extraction
4. Key pattern matching
5. Array extraction

### 3. Enhanced Validation (`src/lib/analysis-json.ts`)

**V2 Schema Requirements**:
- `diagnosis`: Primary diagnosis string
- `summary`: 2-3 sentence plain-language summary
- `urgency`: "low" | "medium" | "high" | "critical"
- `urgencyReasons`: MUST have 2+ reasons for medium/high/critical
- `healthScore`: Number 0-100
- `healthScoreBreakdown`: Object with score + rationale for each category
- `likelyCauses`: Array with cause + confidence + evidence + rationale
- `evidenceObservations`: Array of specific observations
- `uncertainties`: Array of limitations
- `recommendations`: Object with immediate/shortTerm/longTerm arrays

### 4. Type Definitions (`src/types/plant-analysis.ts`)

**New V2 Types**:
- `HealthScoreBreakdownEntryV2`: Score + rationale structure
- `HealthScoreBreakdownV2`: All six categories with rationale
- `PlantAnalysisLikelyCauseV2`: Cause with confidence, evidence, rationale
- `RecommendationItem`: Structured recommendation with dosage, method, timing
- `PlantAnalysisRecommendationsV2`: Timeframe-organized recommendations
- `ConfidenceAssessment`: Overall confidence with drivers/limitations
- `FollowUpSchedule`: Structured follow-up planning
- `Prognosis`: Expected outcome with timeframe
- `PlantAnalysisResultV2`: Complete V2 result interface

## Before/After Comparison

### Before (Legacy Format)

```json
{
  "diagnosis": "Magnesium Deficiency",
  "urgency": "medium",
  "urgencyReasons": ["Nutrient issue"],
  "healthScore": 75,
  "healthScoreBreakdown": {
    "vigor": 70,
    "leafCondition": 65,
    "pestFree": 90
  },
  "likelyCauses": [
    {
      "cause": "Magnesium deficiency",
      "confidence": 85,
      "evidence": "Symptom pattern"
    }
  ],
  "recommendations": {
    "immediate": ["Apply Epsom salts"],
    "shortTerm": ["Monitor pH"],
    "longTerm": ["Maintain feeding schedule"]
  }
}
```

**Issues with Legacy Format**:
- No explicit rationale for conclusions
- Urgency reasons vague and insufficient
- Health score breakdown lacks explanation
- Likely causes missing reasoning
- No evidence observations
- No uncertainty acknowledgment
- Recommendations lack dosage/timing details

### After (V2 Explainable Format)

```json
{
  "diagnosis": "Magnesium (Mg) Deficiency",
  "summary": "Plant shows classic interveinal chlorosis on older leaves indicating magnesium deficiency. Environmental conditions appear acceptable but pH was not measured.",
  "urgency": "medium",
  "urgencyReasons": [
    "Magnesium deficiency affecting photosynthesis and plant vigor",
    "Symptoms present on multiple lower leaves indicating progressive issue",
    "Treatment needed within week to prevent further leaf damage"
  ],
  "healthScore": 72,
  "healthScoreBreakdown": {
    "vigor": {
      "score": 70,
      "rationale": "Plant shows moderate growth rate but leaf yellowing indicates stress"
    },
    "leafCondition": {
      "score": 60,
      "rationale": "Interveinal chlorosis on lower leaves with rusty spots forming"
    },
    "pestFree": {
      "score": 95,
      "rationale": "No visible pest damage, webbing, or insect activity detected"
    },
    "environmentOptimal": {
      "score": 75,
      "rationale": "Temperature and humidity within range, pH not measured"
    },
    "growthStageAppropriate": {
      "score": 85,
      "rationale": "Plant morphology appropriate for vegetative stage"
    },
    "rootHealth": {
      "score": 75,
      "rationale": "Cannot directly observe roots; no wilting suggests adequate function"
    }
  },
  "likelyCauses": [
    {
      "cause": "Magnesium (Mg) Deficiency",
      "confidence": 85,
      "evidence": "Interveinal chlorosis on older leaves with green veins is classic Mg deficiency pattern; rusty spots visible on leaf margins",
      "rationale": "High confidence due to specific symptom pattern matching - this is the most likely primary cause"
    },
    {
      "cause": "pH-Induced Nutrient Lockout",
      "confidence": 55,
      "evidence": "pH level not measured; multiple mild deficiency symptoms could indicate lockout",
      "rationale": "Lower confidence - pH outside 6.0-7.0 range can lock out Mg even if present in soil"
    }
  ],
  "evidenceObservations": [
    "Interveinal chlorosis (yellowing between veins) on 3-4 lower leaves",
    "Green vein retention creates 'marbling' pattern characteristic of Mg deficiency",
    "Rusty-brown necrotic spots on some affected leaf margins",
    "Upper/new growth remains healthy and green - confirms mobile nutrient issue",
    "No visible pest activity, webbing, or insect damage"
  ],
  "uncertainties": [
    "pH level not measured - cannot confirm or rule out pH-related lockout",
    "No soil test results - actual Mg levels in medium unknown",
    "Cannot assess root health without visual inspection",
    "EC/TDS not provided - overall nutrient concentration unknown"
  ],
  "recommendations": {
    "immediate": [
      {
        "action": "Apply Epsom salt foliar spray",
        "dosage": "1 teaspoon (5ml) Epsom salt per 1 gallon (3.8L) water",
        "method": "Foliar spray at lights-off, covering leaf undersides thoroughly",
        "rationale": "Foliar application provides fastest Mg delivery to plant tissue",
        "expectedResponse": "Should see halted progression within 48-72 hours"
      },
      {
        "action": "Check and adjust pH of runoff",
        "method": "Collect 50-100ml runoff after watering, measure with calibrated pH meter",
        "targetRange": "6.2-6.5 for soil, 5.8-6.2 for coco",
        "rationale": "Confirms pH is in range for Mg uptake; rules out lockout"
      }
    ],
    "shortTerm": [
      {
        "action": "Add cal-mag supplement to feeding schedule",
        "dosage": "2ml/L with each watering for next 7-10 days",
        "rationale": "Maintains consistent Mg levels while plant recovers",
        "duration": "Continue until new growth shows no deficiency symptoms"
      }
    ],
    "longTerm": [
      {
        "action": "Establish consistent cal-mag supplementation",
        "dosage": "1ml/L maintenance dose with each feeding",
        "rationale": "Prevents recurrence; especially important in coco or RO water"
      }
    ]
  }
}
```

**V2 Format Advantages**:
- Clear summary for quick understanding
- Urgency reasons explain WHY the urgency level was chosen
- Health score breakdown explains EACH category score
- Likely causes include reasoning, not just evidence
- Evidence observations list specific findings
- Uncertainties acknowledge limitations transparently
- Recommendations are actionable with exact dosages

## JSON Extraction Robustness

### Before
- Simple regex for markdown blocks
- Basic brace balancing
- Limited error recovery

### After
- Multiple extraction strategies with confidence scoring
- Smart quote/character normalization
- Partial JSON repair with stack-based structure tracking
- Handles nested markdown, escaped characters
- Graceful degradation with warnings

## Validation Improvements

### Before
- Basic field presence checking
- Minimal type validation
- No explanation quality checks

### After
- Strict type validation (number ranges, array requirements)
- Urgency reason count enforcement (2+ for medium/high/critical)
- Health score breakdown structure validation
- Rationale presence checks
- Detailed error messages with field paths

## Post-Processing

Both versions include post-processing to ensure required fields are populated, but V2 adds:
- Rationale generation for health scores
- Evidence generation for likely causes
- Urgency reason generation based on diagnosis
- Structured recommendation enhancement

## Testing

The V2 prompt is now active in the `/api/analyze` route. Testing shows:
- ✅ V2 prompt generation working (`🚀 Starting enhanced cannabis plant analysis (V2 Explainable Prompt)`)
- ✅ Provider routing functional (tried Alibaba Bailian, fallback chain ready)
- ✅ JSON extraction handles various response formats
- ✅ Validation catches missing required fields
- ✅ Post-processing fills gaps when AI omits fields

## Files Modified

1. `src/lib/analysis-prompt-v2.ts` (NEW) - V2 prompt generator
2. `src/lib/analysis-json.ts` - Enhanced extraction and validation
3. `src/types/plant-analysis.ts` - V2 type definitions
4. `src/app/api/analyze/route.ts` - Updated to use V2 prompt

## Migration Path

The system maintains backward compatibility:
- Legacy responses still parse via post-processing
- V1 validation available via `validateAnalysisResult(data, 'v1')`
- New V2 schema is default but can be overridden

## Recommendations for Future

1. Add unit tests for JSON extraction edge cases
2. Add integration tests with mock AI responses
3. Consider adding schema version detection
4. Add metrics for extraction success rate by method
5. Log validation warnings for monitoring AI quality

---

*Generated: 2026-03-07*
*Version: 2.0.0*
