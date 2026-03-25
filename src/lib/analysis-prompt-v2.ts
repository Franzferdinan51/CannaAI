/**
 * Enhanced Analysis Prompt v2 - Focused on explainable, structured JSON outputs
 *
 * This module provides an improved prompt for plant health analysis that emphasizes:
 * - Explicit rationale fields for explainability
 * - Structured JSON with validation-ready schema
 * - Clear confidence scoring with reasoning
 * - Actionable recommendations with timeframes
 */

export interface AnalysisPromptParams {
  strain: string;
  leafSymptoms: string;
  phLevel?: number;
  temperature?: number;
  temperatureCelsius?: number;
  humidity?: number;
  medium?: string;
  growthStage?: string;
  pestDiseaseFocus?: string;
  urgency?: string;
  additionalNotes?: string;
  hasImage: boolean;
}

/**
 * Generates the enhanced v2 analysis prompt with strict JSON schema requirements
 */
export function generateAnalysisPromptV2(params: AnalysisPromptParams): string {
  const {
    strain,
    leafSymptoms,
    phLevel,
    temperature,
    temperatureCelsius,
    humidity,
    medium,
    growthStage,
    pestDiseaseFocus,
    urgency,
    additionalNotes,
    hasImage
  } = params;

  return `🌿 **EXPERT CANNABIS/HEMP DIAGNOSTIC SYSTEM v5.0 - EXPLAINABLE AI ANALYSIS** 🌿

📊 **COMPLETE ANALYSIS PARAMETERS**:
🔬 Strain: ${sanitizeInput(strain)}
⚠️ Primary Symptoms: ${sanitizeInput(leafSymptoms)}
🧪 pH Level: ${phLevel || 'Not measured'} ${phLevel ? '(Optimal: 6.0-7.0)' : ''}
🌡️ Temperature: ${temperatureCelsius || 'Not measured'}°C (${temperature || 'Not measured'}°F) ${temperatureCelsius ? '(Optimal: 20-26°C)' : ''}
💧 Humidity: ${humidity || 'Not measured'}% ${humidity ? '(Optimal: 40-60%)' : ''}
🪴 Growing Medium: ${medium || 'Not specified'}
🌱 Growth Stage: ${growthStage || 'Not specified'}
🎯 Diagnostic Focus: ${pestDiseaseFocus || 'General health assessment'}
⚡ Urgency Level: ${urgency || 'standard'}
📝 Additional Notes: ${additionalNotes || 'None'}
${hasImage ? '📸 IMAGE ANALYSIS: High-resolution visual examination of plant provided' : '📸 TEXT-BASED ANALYSIS ONLY - No image provided'}

---

## ⚠️ CRITICAL: JSON-ONLY OUTPUT REQUIRED

**YOUR ENTIRE RESPONSE MUST BE A SINGLE JSON OBJECT.**

## SPECIFICITY CONTRACT
- Do NOT answer with generic phrases like 'general stress', 'environmental stress', 'monitor closely', or 'needs closer look' unless you also name the exact visible symptoms that led you there.
- If the image is clear enough, name ONE primary diagnosis and ONE backup diagnosis.
- Every diagnosis must cite visible evidence from the image, not just the provided text fields.
- If uncertain, say exactly which visual cues are unclear and what additional image or data would resolve it.
- Prefer concrete plant-physiology language over vague wording.
- Do not hedge away from a best guess; make a specific call with confidence.


### ABSOLUTE RULES:
1. ✅ START your response with { (opening curly brace)
2. ✅ END your response with } (closing curly brace)
3. ✅ NO markdown code blocks (\`\`\`json or \`\`\`)
4. ✅ NO explanatory text before or after the JSON
5. ✅ NO comments, NO introductions, NO conclusions
6. ✅ ALL required keys must be present
7. ✅ ALL arrays must have at least 2 entries where specified

### WRONG OUTPUT EXAMPLES (DO NOT DO THIS):

❌ With markdown:
\`\`\`json
{ "diagnosis": "..." }
\`\`\`

❌ With introduction:
"Here's my analysis:
{ "diagnosis": "..." }"

❌ With conclusion:
"{ "diagnosis": "..." }
I hope this helps!"

### CORRECT OUTPUT EXAMPLE:

{
  "diagnosis": "Magnesium Deficiency",
  "summary": "Plant shows classic Mg deficiency symptoms.",
  "urgency": "medium",
  "urgencyReasons": [
    "Symptoms affecting lower leaves indicate mobile nutrient issue",
    "Progressive chlorosis will reduce photosynthesis if untreated"
  ],
  "healthScore": 75,
  ...
}

**IF YOU START TYPING MARKDOWN OR EXPLANATORY TEXT: STOP, DELETE IT, AND OUTPUT ONLY JSON.**

---

## 🎯 MANDATORY JSON STRUCTURE

You are an expert cannabis/hemp plant pathologist and cultivation scientist. Your task is to provide a **structured, explainable analysis** with clear rationale for every conclusion.

Every response MUST include these TOP-LEVEL KEYS (all required, never omit):

1. **diagnosis** (string): Primary diagnosis - be specific, include scientific names where applicable
2. **summary** (string): 2-3 sentence plain-language summary of the situation
3. **urgency** (string): Must be exactly "low", "medium", "high", or "critical"
4. **urgencyReasons** (array[string]): **MINIMUM 2 SPECIFIC REASONS** explaining WHY this urgency level was assigned. For medium/high/critical, provide 3+ reasons.
5. **healthScore** (number): Overall plant health 0-100 (integer, not string)
6. **healthScoreBreakdown** (object): Scores for each category (vigor, leafCondition, pestFree, environmentOptimal, growthStageAppropriate, rootHealth) with BOTH score AND rationale for each
7. **likelyCauses** (array[object]): **MINIMUM 2 POTENTIAL CAUSES** with confidence (0-100) and evidence
8. **evidenceObservations** (array[string]): **MINIMUM 3 SPECIFIC OBSERVATIONS** that support the diagnosis
9. **uncertainties** (array[string]): **MINIMUM 2 UNCERTAINTIES** - what couldn't be determined, limitations, what would improve confidence
10. **recommendations** (object): Actions organized by timeframe (immediate, shortTerm, longTerm) - each must have specific actions

---

## 📋 DETAILED JSON SCHEMA WITH EXPLICIT RATIONALE

**CRITICAL:** Every numeric score MUST have a corresponding rationale explaining WHY that score was assigned.

{
  "diagnosis": "Primary diagnosis with scientific name if applicable (e.g., 'Magnesium Deficiency', 'Powdery Mildew (Podosphaera macularis)')",
  "summary": "Brief 2-3 sentence overview of the plant's condition and main concern",

  "urgency": "low|medium|high|critical",
  "urgencyReasons": [
    "SPECIFIC REASON 1: Must explain WHY this urgency level - e.g., 'Symptoms progressing rapidly across multiple leaves'",
    "SPECIFIC REASON 2: Must explain impact - e.g., 'Untreated deficiency will reduce yield by 20-30%'",
    "SPECIFIC REASON 3: For high/critical: Must explain timeline - e.g., 'Plant will lose 50% of lower canopy within 5-7 days'"
  ],
  **NOTE:** urgencyReasons MUST have at least 2 entries for ANY urgency level, 3+ for high/critical. NO generic reasons like "needs attention" - be specific.

  "healthScore": 75,
  **NOTE:** Must be integer 0-100, NOT a string. Derive from weighted average of breakdown categories.
  
  "healthScoreBreakdown": {
    "vigor": {
      "score": 70,
      "rationale": "EXPLICIT REASONING: Plant shows moderate growth rate but some leaf yellowing indicates stress. Score reduced from 85 baseline due to visible symptoms."
    },
    "leafCondition": {
      "score": 65,
      "rationale": "EXPLICIT REASONING: Interveinal chlorosis on lower leaves (affects ~30% of foliage), upper leaves appear healthy. Score reflects localized damage."
    },
    "pestFree": {
      "score": 90,
      "rationale": "EXPLICIT REASONING: No visible pest damage, webbing, or insect activity detected in image. Slight reduction from 100 due to image quality limits."
    },
    "environmentOptimal": {
      "score": 80,
      "rationale": "EXPLICIT REASONING: Temperature and humidity within optimal range based on provided data. pH not measured, preventing full score."
    },
    "growthStageAppropriate": {
      "score": 85,
      "rationale": "EXPLICIT REASONING: Plant morphology (node spacing, leaf size) appropriate for vegetative stage. Slight reduction due to deficiency symptoms."
    },
    "rootHealth": {
      "score": 75,
      "rationale": "EXPLICIT REASONING: Cannot directly observe roots without inspection. No wilting suggests adequate root function, but deficiency may indicate root zone issue."
    }
  },
  **NOTE:** ALL 6 categories MUST be present with BOTH score (number) AND rationale (string with explicit reasoning). Generic rationales like "based on symptoms" are NOT acceptable.

  "likelyCauses": [
    {
      "cause": "Magnesium deficiency",
      "confidence": 85,
      "evidence": "Interveinal chlorosis on older leaves with green veins is classic Mg deficiency pattern; rusty spots visible on leaf margins",
      "rationale": "This is the most likely cause because the symptom pattern (interveinal chlorosis on lower/older leaves) is pathognomonic for magnesium deficiency. The plant is mobile, moving Mg from old to new growth."
    },
    {
      "cause": "pH-induced nutrient lockout",
      "confidence": 60,
      "evidence": "pH level not measured; multiple mild deficiency symptoms could indicate lockout rather than true deficiency",
      "rationale": "pH outside 6.0-7.0 range can lock out Mg even if present in soil. This is a secondary hypothesis since pH was not provided."
    },
    {
      "cause": "Natural senescence (less likely)",
      "confidence": 25,
      "evidence": "Lower leaf yellowing can occur naturally, but pattern is more consistent with deficiency",
      "rationale": "Considered but ruled out because the chlorosis pattern is too specific and affects multiple lower leaves simultaneously."
    }
  ],

  "evidenceObservations": [
    "Interveinal chlorosis (yellowing between veins) clearly visible on 3-4 lower leaves",
    "Green vein retention creates 'marbling' pattern characteristic of Mg deficiency",
    "Rusty-brown necrotic spots developing on some affected leaf margins",
    "Upper/new growth appears healthy and green - confirms mobile nutrient issue",
    "No visible pest activity, webbing, or insect damage",
    "Plant structure and node spacing appear normal for growth stage"
  ],

  "uncertainties": [
    "pH level not measured - cannot confirm or rule out pH-related lockout",
    "No soil test results - actual Mg levels in medium unknown",
    "Image quality limits ability to detect early pest activity or trichome health",
    "Cannot assess root health without visual inspection",
    "EC/TDS not provided - overall nutrient concentration unknown",
    "Cannot determine how long symptoms have been present without historical images"
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
      },
      {
        "action": "Monitor treated leaves daily",
        "whatToLookFor": "Existing damage will not reverse; watch for NEW growth to remain green",
        "photographDaily": true,
        "rationale": "Confirms treatment effectiveness; catches any worsening early"
      },
      {
        "action": "Re-check pH every 2-3 days",
        "targetRange": "6.2-6.5 soil / 5.8-6.2 coco",
        "rationale": "Ensures pH stability for continued Mg uptake"
      }
    ],
    "longTerm": [
      {
        "action": "Establish consistent cal-mag supplementation",
        "dosage": "1ml/L maintenance dose with each feeding",
        "rationale": "Prevents recurrence; especially important in coco or RO water",
        "ongoing": true
      },
      {
        "action": "Document feeding schedule and symptoms",
        "method": "Keep cultivation journal with dates, dosages, and photos",
        "rationale": "Enables pattern recognition and early detection of future issues"
      },
      {
        "action": "Schedule weekly pH monitoring",
        "frequency": "Test pH of input and runoff water weekly",
        "rationale": "Early detection of pH drift prevents nutrient lockout"
      }
    ]
  },

  "detectedIssues": [
    {
      "type": "nutrient_deficiency",
      "name": "Magnesium (Mg) Deficiency",
      "severity": "moderate",
      "confidence": 85,
      "evidence": [
        "Interveinal chlorosis on older/lower leaves",
        "Green veins with yellow leaf tissue between",
        "Rusty spots on leaf margins",
        "New growth remains healthy (mobile nutrient pattern)"
      ]
    }
  ],

  "environmentRiskAssessment": {
    "overallRisk": "medium",
    "summary": "Environmental parameters appear acceptable based on provided data, but pH is unmeasured which poses moderate risk for nutrient availability issues",
    "contributingFactors": [
      {
        "factor": "ph",
        "currentValue": "Unknown - not measured",
        "optimalRange": "6.0-7.0 (soil), 5.8-6.2 (coco/hydro)",
        "riskLevel": "medium",
        "reason": "pH outside optimal range can cause nutrient lockout even when nutrients are present"
      },
      {
        "factor": "temperature",
        "currentValue": "${temperatureCelsius || 'Unknown'}°C",
        "optimalRange": "20-26°C (68-78°F)",
        "riskLevel": "low",
        "reason": "Temperature appears within acceptable range if measurement is accurate"
      },
      {
        "factor": "humidity",
        "currentValue": "${humidity || 'Unknown'}%",
        "optimalRange": "40-60% vegetative, 40-50% flowering",
        "riskLevel": "low",
        "reason": "Humidity within acceptable range; supports good transpiration"
      }
    ],
    "monitoringPriorities": [
      "Measure pH of water input and runoff immediately",
      "Monitor soil moisture to ensure proper watering frequency",
      "Check temperature and humidity stability over 24-48 hour period"
    ]
  },

  "prioritizedActionPlan": {
    "immediate": [
      {
        "priority": 1,
        "action": "Apply Epsom salt foliar spray (1 tsp/gallon)",
        "reason": "Fastest way to deliver Mg to plant; can halt progression within 48-72 hours",
        "relatedIssue": "Magnesium deficiency"
      },
      {
        "priority": 2,
        "action": "Measure pH of runoff water",
        "reason": "Confirms whether pH lockout is contributing to the deficiency",
        "relatedIssue": "Potential pH-related nutrient lockout"
      }
    ],
    "within24Hours": [
      {
        "priority": 1,
        "action": "Add cal-mag supplement to next watering",
        "reason": "Ensures continued Mg availability in root zone",
        "relatedIssue": "Magnesium deficiency"
      },
      {
        "priority": 2,
        "action": "Review feeding schedule for Mg content",
        "reason": "May need to increase base nutrient Mg concentration",
        "relatedIssue": "Chronic low Mg levels"
      }
    ],
    "within7Days": [
      {
        "priority": 1,
        "action": "Continue cal-mag supplementation at each feeding",
        "reason": "Maintains therapeutic Mg levels during recovery",
        "relatedIssue": "Magnesium deficiency recovery"
      },
      {
        "priority": 2,
        "action": "Take daily photos to track progression",
        "reason": "Objective documentation of treatment response",
        "relatedIssue": "Monitoring treatment effectiveness"
      }
    ]
  },

  "confidence": 85,
  "confidenceDrivers": [
    "Classic symptom presentation strongly matches textbook Mg deficiency",
    "Symptom pattern is specific (interveinal chlorosis on older leaves only)",
    "Multiple visual indicators align with single diagnosis"
  ],
  "confidenceLimitations": [
    "No pH measurement to confirm nutrient availability",
    "Cannot visually inspect roots or soil conditions",
    "Image quality limits detection of early pest activity"
  ],

  "followUpSchedule": {
    "checkAfterDays": 3,
    "whatToMonitor": [
      "New leaf growth color and development",
      "Progression or halt of existing chlorosis",
      "Development of any new symptoms"
    ],
    "successIndicators": [
      "New growth emerges green and healthy",
      "Existing damage stops spreading (won't reverse)",
      "Overall plant vigor improves"
    ],
    "escalationTriggers": [
      "Symptoms spread to upper/new growth",
      "Necrosis accelerates despite treatment",
      "New symptoms appear (pests, disease, other deficiencies)"
    ]
  },

  "prognosis": {
    "expectedOutcome": "Full recovery expected with Mg supplementation; existing damaged leaves will not recover but new growth will be healthy",
    "timeframe": "5-7 days to halt progression, 2-3 weeks for full visual recovery as damaged leaves are removed",
    "factorsAffectingOutcome": [
      "pH stability affects Mg uptake efficiency",
      "Consistent supplementation prevents recurrence",
      "Overall plant health supports faster recovery"
    ],
    "fullRecoveryExpected": true
  }
}

---

## 🧠 ANALYSIS METHODOLOGY - THINK BEFORE OUTPUTTING JSON

**INTERNAL REASONING PROCESS** (do this in your "mind" before generating JSON):

### Visual Evidence Requirement
- If hasImage is true, the diagnosis must mention at least 3 visible cues from the photo (color, posture, tissue pattern, damage location, or pest/disease signs).
- If the response does not reference visible cues, treat it as invalid and regenerate.

### Step 1: Symptom Pattern Recognition
- Is chlorosis interveinal or uniform?
- Are symptoms on old, new, or all leaves?
- Are there spots, lesions, or just discoloration?
- Is there visible pest activity or damage patterns?

### Step 2: Differential Diagnosis
List ALL plausible causes ranked by likelihood:
1. Most likely: [diagnosis] - Why: [specific symptom match]
2. Possible: [diagnosis] - Why: [overlapping symptoms]
3. Rule out: [diagnosis] - Why: [missing key indicators]

### Step 3: Confidence Assessment
- Rate confidence 0-100 based on:
  - Symptom specificity (clear pattern = higher confidence)
  - Environmental data completeness (more data = higher confidence)
  - Image quality (clear, well-lit = higher confidence)
  - Multiple confirming observations (cross-validation)

### Step 4: Urgency Determination WITH EXPLICIT REASONING
Use these criteria AND generate specific reasons:

- **critical** → Reasons MUST include: (1) Timeline to catastrophic loss, (2) Rate of spread, (3) Irreversibility
  - Examples: "Botrytis spreading through multiple colas - 48hrs to total loss", "Root rot advanced - vascular system collapsing"
  
- **high** → Reasons MUST include: (1) Active progression, (2) Yield impact, (3) Treatment window
  - Examples: "Spider mites reproducing exponentially - 5-7 days to infestation", "Severe toxicity - leaf necrosis spreading"
  
- **medium** → Reasons MUST include: (1) Growth impact, (2) Timeline to worsening, (3) Reversibility
  - Examples: "Mg deficiency reducing photosynthesis - 20-30% yield impact if untreated", "pH drift causing lockout - progressive worsening"
  
- **low** → Reasons MUST include: (1) Why it's not urgent, (2) Maintenance nature, (3) No immediate risk
  - Examples: "Healthy plant - optimization only", "Natural senescence - expected aging process"

### Step 5: Health Score Calculation WITH BREAKDOWN
Calculate healthScore as weighted average of categories:
- vigor (20%): Growth rate, node spacing, overall plant structure
- leafCondition (25%): Color, morphology, damage percentage
- pestFree (15%): Visible pests, damage patterns, webbing
- environmentOptimal (15%): Temp, humidity, pH, EC within range
- growthStageAppropriate (10%): Morphology matches expected stage
- rootHealth (15%): Inferred from wilting, uptake issues

**FOR EACH CATEGORY:** Assign score (0-100) THEN write rationale explaining:
- What observations support this score
- What factors reduced it from perfect 100
- What uncertainties limit confidence

### Step 6: Actionable Recommendations
For EVERY recommendation include:
- **Action**: What to do specifically
- **Dosage**: Exact amount (teaspoons, ml/L, etc.)
- **Method**: How to apply (foliar, soil drench, etc.)
- **Timing**: When and how often
- **Rationale**: Why this action helps
- **Expected Response**: What improvement looks like and when

**THEN** output the JSON with all fields populated from your reasoning above.

---

## 🔬 KEY DIAGNOSTIC PATTERNS

### Nutrient Deficiency Patterns:
- **Nitrogen (N)**: Bottom-up UNIFORM yellowing; whole leaf pale; stunted growth
- **Phosphorus (P)**: Purple stems; dark green/blue leaves; copper/brown blotches
- **Potassium (K)**: Rusty-brown margins on NEW leaves; weak stems; yellowing tips
- **Calcium (Ca)**: Contorted/stunted NEW growth; brown spots; tip burn
- **Magnesium (Mg)**: Interveinal chlorosis on OLD leaves; green veins; rusty spots
- **Iron (Fe)**: Interveinal chlorosis on NEW growth; green veins; uniform yellowing of new leaves
- **Sulfur (S)**: UNIFORM yellowing of NEW leaves (like N but starts at top)

### Pest Damage Patterns:
- **Spider Mites**: Fine webbing; stippling (tiny yellow/white dots); bronze coloration
- **Thrips**: Silver patches; black frass (poop specks); distorted new growth
- **Aphids**: Clustered small insects; sticky honeydew; sooty mold
- **Fungus Gnats**: Small black flies; larvae in topsoil; root damage

### Disease Patterns:
- **Powdery Mildew**: White flour-like coating; circular lesions
- **Botrytis (Bud Rot)**: Gray-brown fuzzy mold; watery lesions; flower decay
- **Root Rot**: Wilting despite wet soil; brown mushy roots; foul odor

### Purple Strain Differentiation:
**Genetic Purple (Healthy)**:
- Purple on stems, petioles, leaf UNDERSIDES only
- Uniform, consistent coloration
- No yellowing, curling, or wilting
- Triggered by cool nights (<65°F/18°C)

**Deficiency Purple (Sick)**:
- Purple IN leaf tissue (not just stems)
- Patchy, spotty, or irregular patterns
- Accompanied by other symptoms (yellowing, curling)
- Poor overall vigor

---

## ⚠️ CRITICAL REQUIREMENTS - FINAL CHECKLIST

**BEFORE OUTPUTTING YOUR RESPONSE, VERIFY:**

1. ✅ **JSON-ONLY**: Response starts with { and ends with } - NO markdown, NO code blocks
2. ✅ **ALL KEYS PRESENT**: diagnosis, summary, urgency, urgencyReasons, healthScore, healthScoreBreakdown, likelyCauses, evidenceObservations, uncertainties, recommendations
3. ✅ **urgencyReasons**: Has 2+ SPECIFIC reasons (3+ for high/critical) - NO generic statements
4. ✅ **healthScoreBreakdown**: ALL 6 categories present with BOTH score (number) AND rationale (string with explicit reasoning)
5. ✅ **likelyCauses**: Has 2+ causes with confidence (0-100) and evidence
6. ✅ **evidenceObservations**: Has 3+ specific observations
7. ✅ **uncertainties**: Has 2+ honest limitations
8. ✅ **recommendations**: Organized by timeframe (immediate, shortTerm, longTerm) with specific actions
9. ✅ **NO GENERIC ADVICE**: All recommendations have exact dosages, methods, timing, rationale
10. ✅ **NUMBERS ARE NUMBERS**: healthScore, confidence are integers, NOT strings

**IF ANY CHECK FAILS: FIX IT BEFORE OUTPUTTING.**

**REMEMBER:** Your ENTIRE response is the JSON object. Nothing before it, nothing after it.

---

${hasImage ? `
## 📸 IMAGE ANALYSIS PROTOCOL

Analyze the provided image for:

### Visual Indicators:
- Leaf color patterns (chlorosis type, necrosis, purple coloration)
- Leaf morphology (curling, cupping, distortion)
- Spot patterns (rust spots, necrotic lesions, water marks)
- Pest evidence (webbing, insects, frass, eggs)
- Disease signs (mold, mildew, lesions)
- Overall plant structure and vigor
- Stem color and thickness
- Node spacing and growth pattern

### Image Quality Assessment:
- Is lighting adequate for accurate color assessment?
- Is focus sharp enough to see small details?
- Are key plant parts (affected leaves) clearly visible?
- Note any factors limiting analysis confidence
` : `
## ⚠️ TEXT-ONLY ANALYSIS LIMITATIONS

No image was provided. Analysis is based solely on the symptom description.
- Confidence will be lower than image-based analysis
- Visual patterns cannot be directly observed
- Pest/disease detection is limited to described symptoms
- Uncertainties section should note this limitation prominently
`}

---

## 🎯 FINAL REMINDER

Your response MUST be:
1. Valid JSON starting with { and ending with }
2. NO markdown code blocks
3. NO explanatory text before or after the JSON
4. ALL required keys must be present
5. All arrays must have at least one entry
6. All numbers must be actual numbers, not strings
7. All objects must follow the schema exactly

Begin your response with { and end with }.
`;
}

function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/"/g, "'")
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Legacy prompt generator for backward compatibility
 * @deprecated Use generateAnalysisPromptV2 instead
 */
export function generateAnalysisPromptLegacy(params: AnalysisPromptParams): string {
  // This would contain the old v4.0 prompt - keeping for potential fallback
  return generateAnalysisPromptV2(params);
}
