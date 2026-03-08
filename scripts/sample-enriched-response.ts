/**
 * Sample output demonstrating the enriched report structure
 *
 * This shows what the enhanced /api/analyze response looks like with the
 * production-quality enrichment pass applied.
 */

const sampleEnrichedResponse = {
  // === CORE DIAGNOSIS (existing fields) ===
  diagnosis: "Magnesium (Mg) Deficiency",
  summary: "The plant is exhibiting classic interveinal chlorosis on older leaves, consistent with magnesium deficiency. This is a mobile nutrient issue that can be corrected with supplementation.",
  confidence: 85,
  severity: "moderate",
  urgency: "high",
  healthScore: 64,

  // === EXPLAINABILITY FIELDS (existing v2) ===
  urgencyReasons: [
    "Magnesium deficiency needs attention within 24-48 hours",
    "Severity moderate with escalation potential",
    "Early treatment prevents spread to new growth"
  ],

  healthScoreBreakdown: [
    { category: "vigor", score: 70, reason: "Overall vigor score reflects the impact of magnesium deficiency" },
    { category: "leafCondition", score: 65, reason: "Leaf condition score reflects interveinal chlorosis on older leaves" },
    { category: "pestFree", score: 90, reason: "No explicit pest findings were returned by the model" },
    { category: "environmentOptimal", score: 70, reason: "Environmental inputs were limited, so the score is conservative" },
    { category: "growthStageAppropriate", score: 85, reason: "Assessment considered the vegetative growth stage context" },
    { category: "rootHealth", score: 75, reason: "No direct root-zone issue was identified in the returned analysis" }
  ],

  detectedIssues: [
    {
      type: "nutrient_deficiency",
      name: "Magnesium (Mg) Deficiency",
      severity: "moderate",
      confidence: 85,
      evidence: ["Interveinal chlorosis on older/lower leaves", "Green veins with yellow leaf tissue between"]
    }
  ],

  evidenceObservations: [
    "Interveinal chlorosis (yellowing between veins) clearly visible on 3-4 lower leaves",
    "Green vein retention creates 'marbling' pattern characteristic of Mg deficiency",
    "Upper/new growth appears healthy and green - confirms mobile nutrient issue"
  ],

  uncertainties: [
    "pH level not measured - cannot confirm or rule out pH-related lockout",
    "No soil test results - actual Mg levels in medium unknown"
  ],

  recommendations: {
    immediate: [
      { action: "Apply Epsom salt foliar spray", dosage: "1 teaspoon (5ml) Epsom salt per 1 gallon (3.8L) water" },
      { action: "Check and adjust pH of runoff", targetRange: "6.2-6.5 for soil, 5.8-6.2 for coco" }
    ],
    shortTerm: [
      { action: "Add cal-mag supplement to feeding schedule", dosage: "2ml/L with each watering for next 7-10 days" },
      { action: "Monitor treated leaves daily" }
    ],
    longTerm: [
      { action: "Establish consistent cal-mag supplementation", dosage: "1ml/L maintenance dose with each feeding" },
      { action: "Schedule weekly pH monitoring" }
    ]
  },

  // === ENRICHED FIELDS (NEW - Production Quality Explanations) ===

  confidenceAssessment: {
    overall: 85,
    drivers: [
      "Visual analysis performed on submitted image - direct symptom observation",
      "1 high-confidence finding(s) detected (>=80% confidence)",
      "AI model expressed high confidence in primary diagnosis",
      "Multiple symptom patterns (3) corroborate diagnosis",
      "Symptom pattern matches well-documented, classic presentation"
    ],
    limitations: [
      "pH level not provided - nutrient availability assessment is incomplete",
      "Temperature data missing - environmental stress evaluation limited"
    ]
  },

  urgencyDeepDive: {
    urgencyLevel: "high",
    primaryDrivers: [
      "Magnesium deficiency needs attention within 24-48 hours",
      "Active nutrient imbalance affecting plant function"
    ],
    contributingFactors: [
      "Severity level (moderate) indicates ongoing condition",
      "Magnesium (Mg) Deficiency (moderate) - Interveinal chlorosis on older/lower leaves"
    ],
    escalationRisk: "Prompt action needed - delay beyond 48 hours may cause significant setbacks",
    timeSensitivity: "Act within 24-48 hours",
    comparisonToBaseline: "Moderate risk - early intervention will prevent progression"
  },

  healthScoreAnalysis: {
    overallScore: 64,
    scoreInterpretation: "Plant is experiencing moderate stress affecting performance",
    categoryAnalysis: [
      {
        category: "vigor",
        score: 70,
        interpretation: "Overall Vigor shows moderate issues requiring scheduled attention",
        contributingFactors: ["Overall vigor score reflects the impact of magnesium deficiency"],
        improvementSuggestions: ["Review feeding schedule and environmental conditions", "Consider root zone health assessment"]
      },
      {
        category: "leafCondition",
        score: 65,
        interpretation: "Leaf Health shows moderate issues requiring scheduled attention",
        contributingFactors: ["Leaf condition score reflects interveinal chlorosis on older leaves"],
        improvementSuggestions: ["Inspect leaves daily for symptom progression", "Review nutrient regimen for deficiencies or toxicities"]
      },
      {
        category: "pestFree",
        score: 90,
        interpretation: "Pest-Free Status is within optimal range - no action needed",
        contributingFactors: ["No explicit pest findings were returned by the model"],
        improvementSuggestions: ["Maintain preventive pest management practices"]
      }
    ],
    biggestStrengths: [
      "Pest-Free Status is strong (90/100)",
      "Growth Stage Alignment is strong (85/100)"
    ],
    areasNeedingAttention: [
      "Leaf Health requires attention (65/100)",
      "Overall Vigor requires attention (70/100)"
    ],
    scoreDrivers: [
      {
        factor: "Pest-Free Status",
        impactOnScore: "positive",
        magnitude: "medium",
        explanation: "Pest-Free score of 90 positively impacts overall health"
      },
      {
        factor: "Leaf Health",
        impactOnScore: "negative",
        magnitude: "medium",
        explanation: "Leaf Condition score of 65 is reducing overall health assessment"
      },
      {
        factor: "Primary Diagnosis",
        impactOnScore: "negative",
        magnitude: "medium",
        explanation: "Diagnosis of \"Magnesium (Mg) Deficiency\" indicates health challenges requiring attention"
      }
    ]
  },

  evidenceNarrative: {
    keyFindings: [
      "Primary diagnosis: Magnesium (Mg) Deficiency",
      "Magnesium (Mg) Deficiency (moderate) - Interveinal chlorosis on older/lower leaves"
    ],
    supportingObservations: [
      "Interveinal chlorosis (yellowing between veins) clearly visible on 3-4 lower leaves",
      "Green vein retention creates 'marbling' pattern characteristic of Mg deficiency",
      "Upper/new growth appears healthy and green - confirms mobile nutrient issue",
      "Observed symptom: Lower fan leaves yellowing from the petiole outward"
    ],
    conflictingSignals: [],
    evidenceQuality: {
      overallQuality: "high",
      imageContribution: "Image analysis enabled direct visual symptom verification",
      dataCompleteness: "Some environmental parameters missing, assessment partially complete",
      reliabilityFactors: [
        "Visual confirmation of symptoms via image analysis",
        "High model confidence supports reliability"
      ]
    }
  },

  uncertaintyAnalysis: {
    knownUnknowns: [
      "pH level not measured - cannot confirm or rule out pH-related lockout",
      "No soil test results - actual Mg levels in medium unknown"
    ],
    dataGaps: [
      "pH level not measured - nutrient availability uncertain",
      "Temperature data not provided",
      "Humidity data not provided"
    ],
    diagnosticLimitations: [
      "Remote analysis cannot assess root health directly",
      "Cannot verify pest presence without visual inspection",
      "Symptom progression timeline unknown without historical data"
    ],
    confidenceReducingFactors: [
      "No significant confidence-reducing factors"
    ],
    additionalDataNeeded: [
      "pH of water input and runoff",
      "Current ambient and root zone temperature",
      "Relative humidity measurement"
    ]
  },

  followUpSchedule: {
    checkAfterDays: 1,
    whatToMonitor: [
      "Treatment response",
      "Symptom spread rate",
      "Overall plant demeanor",
      "New leaf coloration",
      "Treatment uptake signs"
    ],
    successIndicators: [
      "New growth shows normal coloration",
      "Treatment halts progression",
      "Plant shows improved vigor"
    ],
    escalationTriggers: [
      "Symptoms spread to upper/new growth",
      "Rapid symptom spread",
      "Plant shows signs of systemic decline"
    ]
  },

  prognosis: {
    expectedOutcome: "Full recovery expected once nutrient balance is restored; existing damage will not reverse",
    timeframe: "3-5 days to halt progression, 2-3 weeks for new healthy growth",
    factorsAffectingOutcome: [
      "pH management will affect nutrient availability",
      "Treatment adherence and timing",
      "Overall plant vigor and genetics"
    ],
    fullRecoveryExpected: true
  },

  recommendationRationale: {
    immediate: [
      {
        action: "Apply Epsom salt foliar spray",
        rationale: "Magnesium is a mobile nutrient; foliar application provides fastest correction for deficiency symptoms",
        scientificBasis: "Magnesium is the central atom in chlorophyll molecules; deficiency directly impairs photosynthesis",
        alternativeApproaches: [
          "Calcium-magnesium (Cal-Mag) supplement as soil drench",
          "Magnesium sulfate foliar spray at 2% solution"
        ],
        successMetrics: [
          "Treatment applied correctly and completely",
          "No adverse reaction within 24 hours"
        ]
      },
      {
        action: "Check and adjust pH of runoff",
        rationale: "pH directly affects nutrient availability; correction is prerequisite to addressing deficiencies",
        scientificBasis: "Based on established plant physiology and pathology principles",
        alternativeApproaches: [
          "pH-adjusted water at 2-3x container volume",
          "Enzyme flush treatment for root zone reset"
        ],
        successMetrics: [
          "Treatment applied correctly and completely",
          "No adverse reaction within 24 hours"
        ]
      }
    ],
    shortTerm: [
      {
        action: "Add cal-mag supplement to feeding schedule",
        rationale: "Consistent supplementation maintains therapeutic nutrient levels during recovery",
        scientificBasis: "Based on established plant physiology and pathology principles",
        alternativeApproaches: ["Consult cultivation guide for alternative approaches"],
        successMetrics: [
          "Symptom progression halts",
          "New growth appears healthy",
          "Environmental parameters stable"
        ]
      }
    ],
    longTerm: [
      {
        action: "Establish consistent cal-mag supplementation",
        rationale: "Establishing consistent routines prevents recurrence and enables early problem detection",
        scientificBasis: "Based on established plant physiology and pathology principles",
        alternativeApproaches: ["Consult cultivation guide for alternative approaches"],
        successMetrics: [
          "Full recovery with healthy new growth",
          "No recurrence of symptoms",
          "Plant vigor restored"
        ]
      }
    ],
    prioritizationLogic: "Prompt action prioritized to prevent irreversible damage within 48-hour window. Nutrient issues addressed through supplementation after ruling out lockout.",
    expectedOutcomes: [
      "Stabilization of current symptoms within 3-5 days",
      "Visible improvement in new growth within 7-10 days",
      "Existing damaged tissue will not recover but will not spread",
      "New growth will display normal coloration after treatment"
    ]
  },

  // === METADATA ===
  analysisMetadata: {
    provider: "openclaw",
    model: "qwen3.5-plus",
    processingTime: 2847,
    imageAnalysis: true,
    schemaVersion: "2.0.0",
    enrichedAt: "2026-03-07T22:54:00.000Z",
    version: "4.1.0-Explainable-ReportV2",
    reportSchemaVersion: "2.0.0",
    parsedFromStructuredJson: true,
    enrichmentApplied: true
  },

  reportVersion: "report-v2",
  reportSchemaVersion: "2.0.0"
};

console.log("Sample Enriched Report Output");
console.log("==============================\n");
console.log(JSON.stringify(sampleEnrichedResponse, null, 2));

export { sampleEnrichedResponse };
