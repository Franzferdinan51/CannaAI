import { z } from 'zod';
import type {
  DetectedIssue,
  EnvironmentRiskAssessment,
  EnvironmentRiskFactor,
  HealthScoreBreakdownEntry,
  LegacyPlantAnalysisRecommendations,
  PlantAnalysisApiResult,
  PlantAnalysisLikelyCause,
  PlantAnalysisSeverity,
  PlantAnalysisUrgency,
  PrioritizedActionItem,
  PrioritizedActionPlan
} from '@/types/plant-analysis';

type AnalysisRecord = Record<string, any>;

const REPORT_SCHEMA_VERSION = '2.0.0';
const ANALYSIS_VERSION = '4.1.0-Explainable-ReportV2';
const HEALTH_SCORE_CATEGORIES = [
  'vigor',
  'leafCondition',
  'pestFree',
  'environmentOptimal',
  'growthStageAppropriate',
  'rootHealth'
] as const;
const GENERIC_TEXT_PATTERNS = [
  /^ai analysis complete$/,
  /^ai powered analysis completed$/,
  /^ai powered analysis$/,
  /^plant health analysis$/,
  /^analysis based on ai model evaluation$/,
  /^analysis provided by .* ai model$/,
  /^ai evaluation$/,
  /^follow ai recommendations(?: above)?$/,
  /^follow the detailed recommendations provided by the ai$/,
  /^review complete ai analysis$/,
  /^implement ai recommendations$/,
  /^fallback text review required$/,
  /^dependent on following ai recommendations$/,
  /^ai analysis required for detailed assessment$/,
  /^ai analysis required for detailed purple coloration assessment$/,
  /^positive outcome with proper care$/,
  /^varies by treatment type$/,
  /^prevention is more cost effective than treatment$/
] as const;
const GENERIC_ACTION_PATTERNS = [
  /^continue monitoring$/,
  /^monitor plant health$/,
  /^maintain optimal growing conditions$/,
  /^follow ai recommendations(?: above)?$/,
  /^review complete ai analysis$/,
  /^implement ai recommendations$/
] as const;

export interface AnalysisEnhancementMetadata {
  inputParameters?: Record<string, unknown>;
  imageAnalysis?: boolean;
  processingTime?: number;
  provider: string;
}

export const HealthScoreBreakdownEntrySchema = z.object({
  category: z.string().min(1),
  score: z.number().min(0).max(100),
  reason: z.string().min(1)
});

export const DetectedIssueSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  severity: z.string().min(1),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string())
});

export const EnvironmentRiskFactorSchema = z.object({
  factor: z.string().min(1),
  currentValue: z.string().optional(),
  optimalRange: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().min(1)
});

export const EnvironmentRiskAssessmentSchema = z.object({
  overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
  summary: z.string().min(1),
  contributingFactors: z.array(EnvironmentRiskFactorSchema),
  monitoringPriorities: z.array(z.string())
});

export const PrioritizedActionItemSchema = z.object({
  priority: z.number().int().min(1),
  action: z.string().min(1),
  reason: z.string().min(1),
  relatedIssue: z.string().optional()
});

export const PrioritizedActionPlanSchema = z.object({
  immediate: z.array(PrioritizedActionItemSchema),
  within24Hours: z.array(PrioritizedActionItemSchema),
  within7Days: z.array(PrioritizedActionItemSchema)
});

export const PlantAnalysisExplainabilitySchema = z.object({
  urgencyReasons: z.array(z.string()),
  healthScoreBreakdown: z.array(HealthScoreBreakdownEntrySchema),
  detectedIssues: z.array(DetectedIssueSchema),
  environmentRiskAssessment: EnvironmentRiskAssessmentSchema,
  prioritizedActionPlan: PrioritizedActionPlanSchema,
  likelyCauses: z.array(
    z.object({
      cause: z.string().min(1),
      confidence: z.number().min(0).max(100),
      evidence: z.string().min(1)
    })
  ),
  evidenceObservations: z.array(z.string()),
  uncertainties: z.array(z.string()),
  rawResponseText: z.string().optional(),
  rawFallbackText: z.string().optional(),
  reportVersion: z.literal('report-v2'),
  reportSchemaVersion: z.string().min(1)
});

export function normalizePlantAnalysisResult(
  rawResult: unknown,
  metadata: AnalysisEnhancementMetadata
): PlantAnalysisApiResult {
  const parsedResult = parseAnalysisPayload(rawResult, metadata.provider);
  const enhanced = isRecord(parsedResult.structuredResult)
    ? { ...parsedResult.structuredResult }
    : {};
  const rawNarrative = parsedResult.rawFallbackText;

  enhanced.confidence = clampScore(enhanced.confidence, 75);
  enhanced.severity = normalizeSeverity(enhanced.severity, 'moderate');
  enhanced.healthScore = clampScore(enhanced.healthScore, enhanced.confidence);
  enhanced.urgency = normalizeUrgency(enhanced.urgency, 'medium');

  enhanced.symptomsMatched = normalizeMeaningfulStringArray(
    enhanced.symptomsMatched,
    deriveReportedSymptoms(metadata.inputParameters)
  );
  enhanced.evidenceObservations = normalizeEvidenceObservations(
    enhanced,
    metadata.inputParameters,
    rawNarrative
  );
  enhanced.likelyCauses = normalizeLikelyCauses(enhanced, metadata.inputParameters, rawNarrative);
  enhanced.causes = normalizeMeaningfulStringArray(
    enhanced.causes,
    enhanced.likelyCauses.map(item => item.cause)
  );
  enhanced.diagnosis = deriveMeaningfulDiagnosis(enhanced, metadata.inputParameters, rawNarrative);
  enhanced.treatment = normalizeMeaningfulStringArray(enhanced.treatment, []);
  enhanced.preventativeMeasures = normalizeMeaningfulStringArray(
    enhanced.preventativeMeasures,
    []
  );
  enhanced.uncertainties = normalizeUncertainties(enhanced, parsedResult.parsedFromStructuredJson);

  if (!enhanced.purpleAnalysis || !isRecord(enhanced.purpleAnalysis)) {
    enhanced.purpleAnalysis = {
      isGenetic: Boolean(enhanced.isPurpleStrain),
      isDeficiency: false,
      analysis: enhanced.isPurpleStrain
        ? 'Genetic purple strain characteristics detected'
        : 'AI analysis required for detailed assessment',
      anthocyaninLevel: 'medium',
      recommendedActions: ['Continue monitoring purple coloration patterns']
    };
  }

  if (!Array.isArray(enhanced.pestsDetected)) enhanced.pestsDetected = [];
  if (!Array.isArray(enhanced.diseasesDetected)) enhanced.diseasesDetected = [];
  if (!Array.isArray(enhanced.nutrientDeficiencies)) enhanced.nutrientDeficiencies = [];
  if (!Array.isArray(enhanced.nutrientToxicities)) enhanced.nutrientToxicities = [];
  if (!Array.isArray(enhanced.environmentalFactors)) enhanced.environmentalFactors = [];

  const detectedIssues = normalizeDetectedIssues(
    enhanced,
    rawNarrative,
    metadata.inputParameters
  );
  const urgencyReasons = normalizeUrgencyReasons(enhanced, detectedIssues);
  const healthScoreBreakdown = normalizeHealthScoreBreakdown(
    enhanced,
    metadata.inputParameters,
    detectedIssues
  );
  const environmentRiskAssessment = normalizeEnvironmentRiskAssessment(
    enhanced,
    metadata.inputParameters,
    detectedIssues
  );
  const prioritizedActionPlan = normalizePrioritizedActionPlan(
    enhanced,
    urgencyReasons,
    detectedIssues
  );
  const recommendations = normalizeLegacyRecommendations(enhanced, prioritizedActionPlan);

  enhanced.urgencyReasons = urgencyReasons;
  enhanced.healthScoreBreakdown = healthScoreBreakdown;
  enhanced.detectedIssues = detectedIssues;
  enhanced.environmentRiskAssessment = environmentRiskAssessment;
  enhanced.prioritizedActionPlan = prioritizedActionPlan;
  enhanced.recommendations = recommendations;
  enhanced.treatment = normalizeMeaningfulStringArray(
    enhanced.treatment,
    uniqStrings([
      ...prioritizedActionPlan.immediate.map(item => item.action),
      ...prioritizedActionPlan.within24Hours.map(item => item.action)
    ])
  );
  enhanced.preventativeMeasures = normalizeMeaningfulStringArray(
    enhanced.preventativeMeasures,
    recommendations.longTerm
  );
  enhanced.priorityActions = normalizeMeaningfulStringArray(
    enhanced.priorityActions,
    prioritizedActionPlan.immediate.map(item => item.action)
  );
  if (enhanced.priorityActions.length === 0) {
    enhanced.priorityActions = prioritizedActionPlan.immediate.map(item => item.action);
  }

  if (!enhanced.trichomeAnalysis || !isRecord(enhanced.trichomeAnalysis)) {
    enhanced.trichomeAnalysis = {
      isVisible: metadata.imageAnalysis || false,
      density: 'medium',
      maturity: {
        clear: 0,
        cloudy: 0,
        amber: 0
      },
      overallStage: 'mixed',
      health: {
        intact: 100,
        degraded: 0,
        collapsed: 0
      },
      harvestReadiness: {
        ready: false,
        daysUntilOptimal: 14,
        recommendation: 'Monitor trichome development',
        effects: 'Effects will depend on trichome maturity'
      },
      confidence: 0
    };
  }

  if (!enhanced.morphologicalAnalysis || !isRecord(enhanced.morphologicalAnalysis)) {
    enhanced.morphologicalAnalysis = {
      overallVigor: enhanced.healthScore || 75,
      growthPattern: 'normal',
      symmetry: 'symmetrical',
      leafDevelopment: {
        size: 'normal',
        color: 'normal',
        shape: 'normal',
        spots: false,
        lesions: false
      },
      stemHealth: {
        color: 'normal',
        strength: 'strong',
        signsOfStress: false,
        pestDamage: false
      }
    };
  }

  if (!enhanced.visualChanges || !isRecord(enhanced.visualChanges)) {
    enhanced.visualChanges = {
      hasPreviousData: false,
      changeDetected: false,
      changeType: 'stable',
      progressionRate: 'slow',
      changes: [],
      predictions: [],
      urgencyAdjustment: 'none'
    };
  }

  if (!enhanced.imageAnalysis || !isRecord(enhanced.imageAnalysis)) {
    enhanced.imageAnalysis = {
      hasImage: metadata.imageAnalysis || false,
      visualFindings: enhanced.evidenceObservations.slice(0, 3),
      overallConfidence: enhanced.confidence,
      imageQuality: {
        resolution: 'good',
        focus: 'adequate',
        lighting: 'adequate',
        magnification: 'appropriate'
      },
      factorsAffectingAnalysis: [],
      recommendationsForFuture: []
    };
  }
  enhanced.imageAnalysis.visualFindings = normalizeMeaningfulStringArray(
    enhanced.imageAnalysis.visualFindings,
    metadata.imageAnalysis
      ? enhanced.evidenceObservations.slice(0, 3)
      : ['No image was provided, so the assessment relies on reported symptoms and environment data.']
  );
  enhanced.imageAnalysis.factorsAffectingAnalysis = normalizeMeaningfulStringArray(
    enhanced.imageAnalysis.factorsAffectingAnalysis,
    metadata.imageAnalysis ? [] : ['No image was provided for direct visual confirmation.']
  );

  if (!enhanced.followUpSchedule || !isRecord(enhanced.followUpSchedule)) {
    enhanced.followUpSchedule = {
      checkAfterDays: 7,
      whatToMonitor: ['Overall plant health', 'Symptom progression'],
      successIndicators: ['Improved leaf color', 'New healthy growth'],
      escalationTriggers: ['Symptoms worsen rapidly', 'No improvement after treatment']
    };
  }

  if (!enhanced.prognosis || !isRecord(enhanced.prognosis)) {
    enhanced.prognosis = {
      expectedOutcome: 'Positive outcome with proper care',
      timeframe: '1-2 weeks',
      factorsAffectingOutcome: ['Environmental conditions', 'Treatment compliance'],
      fullRecoveryExpected: true
    };
  }

  if (!enhanced.costEstimates || !isRecord(enhanced.costEstimates)) {
    enhanced.costEstimates = {
      treatmentCost: 'Varies by treatment type',
      preventiveSavings: 'Prevention is more cost-effective than treatment'
    };
  }

  enhanced.rawResponseText = parsedResult.rawResponseText;
  if (parsedResult.rawFallbackText) {
    enhanced.rawFallbackText = parsedResult.rawFallbackText;
  }
  if (parsedResult.rawResponseText && !enhanced.aiResponse) {
    enhanced.aiResponse = parsedResult.rawResponseText;
  }

  const existingMetadata = isRecord(enhanced.analysisMetadata) ? enhanced.analysisMetadata : {};
  enhanced.analysisMetadata = {
    ...existingMetadata,
    ...metadata,
    enhancedAt: new Date().toISOString(),
    version: ANALYSIS_VERSION,
    reportSchemaVersion: REPORT_SCHEMA_VERSION,
    parsedFromStructuredJson: parsedResult.parsedFromStructuredJson,
    rawResponsePreserved: Boolean(parsedResult.rawResponseText),
    rawFallbackTextPreserved: Boolean(parsedResult.rawFallbackText)
  };

  enhanced.reportVersion = 'report-v2';
  enhanced.reportSchemaVersion = REPORT_SCHEMA_VERSION;
  enhanced.contractId = existingMetadata.contractId || 'cannaai.analysis.agent.v1';
  enhanced.contractVersion = existingMetadata.contractVersion || '1.0.0';
  enhanced.enhancedMultiModalAnalysis = true;
  enhanced.requiresAIProvider = true;
  enhanced.comprehensiveAnalysis = true;

  const explainabilityValidation = PlantAnalysisExplainabilitySchema.safeParse({
    urgencyReasons: enhanced.urgencyReasons,
    healthScoreBreakdown: enhanced.healthScoreBreakdown,
    detectedIssues: enhanced.detectedIssues,
    environmentRiskAssessment: enhanced.environmentRiskAssessment,
    prioritizedActionPlan: enhanced.prioritizedActionPlan,
    likelyCauses: enhanced.likelyCauses,
    evidenceObservations: enhanced.evidenceObservations,
    uncertainties: enhanced.uncertainties,
    rawResponseText: enhanced.rawResponseText,
    rawFallbackText: enhanced.rawFallbackText,
    reportVersion: enhanced.reportVersion,
    reportSchemaVersion: enhanced.reportSchemaVersion
  });

  if (!explainabilityValidation.success) {
    throw new Error(
      `Normalized analysis failed report-v2 validation: ${explainabilityValidation.error.message}`
    );
  }

  const reportQualityErrors = validateExplainabilityContent(enhanced);
  if (reportQualityErrors.length > 0) {
    throw new Error(
      `Normalized analysis failed report-quality validation: ${reportQualityErrors.join('; ')}`
    );
  }

  return enhanced as PlantAnalysisApiResult;
}

function parseAnalysisPayload(rawResult: unknown, provider: string): {
  structuredResult: AnalysisRecord;
  rawResponseText?: string;
  rawFallbackText?: string;
  parsedFromStructuredJson: boolean;
} {
  if (isRecord(rawResult)) {
    return {
      structuredResult: rawResult,
      parsedFromStructuredJson: true
    };
  }

  const rawText = normalizeString(rawResult, '').trim();
  if (!rawText) {
    return {
      structuredResult: createFallbackAnalysisFromText(
        'No response content was returned by the AI provider.',
        provider
      ),
      rawResponseText: '',
      rawFallbackText: '',
      parsedFromStructuredJson: false
    };
  }

  const structuredJson = extractStructuredJson(rawText);
  if (structuredJson) {
    return {
      structuredResult: structuredJson,
      rawResponseText: rawText,
      parsedFromStructuredJson: true
    };
  }

  return {
    structuredResult: createFallbackAnalysisFromText(rawText, provider),
    rawResponseText: rawText,
    rawFallbackText: rawText,
    parsedFromStructuredJson: false
  };
}

function createFallbackAnalysisFromText(textResponse: string, provider: string): AnalysisRecord {
  const excerpt = textResponse.trim().slice(0, 280);
  const narrativeSummary = summarizeNarrative(textResponse);

  return {
    diagnosis:
      narrativeSummary ||
      `Follow-up review required because ${provider} returned unstructured analysis text`,
    confidence: 72,
    severity: 'moderate',
    symptomsMatched: narrativeSummary ? [narrativeSummary] : ['Review the provider narrative for the primary symptom pattern'],
    causes: [
      narrativeSummary
        ? `Provider narrative indicated: ${narrativeSummary}`
        : 'The provider returned an unstructured response instead of the requested JSON contract'
    ],
    treatment: ['Review the preserved fallback text and confirm the recommended intervention'],
    healthScore: 70,
    strainSpecificAdvice: 'Refer to the preserved raw fallback text for provider-specific context.',
    reasoning: [
      {
        step: 'Fallback normalization',
        explanation: `The ${provider} response was not machine-parseable JSON and required best-effort normalization.`,
        weight: 100,
        evidence: excerpt || 'Unstructured AI response'
      }
    ],
    likelyCauses: [
      {
        cause: 'The provider returned an unstructured response instead of the requested JSON contract',
        confidence: 70,
        evidence: `Provider ${provider} returned text that could not be parsed as JSON.`
      }
    ],
    evidenceObservations: [
      `Provider ${provider} returned fallback text instead of structured JSON.`,
      excerpt || 'No response excerpt available.'
    ],
    uncertainties: [
      'Specific issue extraction is best-effort because the provider did not return valid JSON.'
    ],
    urgency: 'medium',
    urgencyReasons: [
      'The provider returned unstructured output that needs manual review.',
      'Detailed issue severity could not be parsed confidently from the response.'
    ],
    healthScoreBreakdown: [
      {
        category: 'vigor',
        score: 70,
        reason: 'Overall vigor was estimated from fallback text instead of structured signals.'
      },
      {
        category: 'leafCondition',
        score: 68,
        reason: 'Leaf condition details were not returned in a structured format.'
      },
      {
        category: 'pestFree',
        score: 75,
        reason: 'No structured pest finding was returned, so pest status remains uncertain.'
      },
      {
        category: 'environmentOptimal',
        score: 70,
        reason: 'Environmental risks could not be fully parsed from the raw response.'
      },
      {
        category: 'growthStageAppropriate',
        score: 72,
        reason: 'Growth-stage suitability was inferred conservatively from limited structured evidence.'
      },
      {
        category: 'rootHealth',
        score: 70,
        reason: 'Root-zone details were not returned in a structured format.'
      }
    ],
    detectedIssues: [
      {
        type: 'analysis_response',
        name: 'Unstructured AI response',
        severity: 'moderate',
        confidence: 70,
        evidence: [
          `The ${provider} response was not valid JSON.`,
          excerpt || 'No response excerpt available.'
        ]
      }
    ],
    environmentRiskAssessment: {
      overallRisk: 'medium',
      summary: 'Environmental risk could not be fully scored because the provider returned unstructured text.',
      contributingFactors: [
        {
          factor: 'response_structure',
          riskLevel: 'medium',
          reason: 'Manual review is required because the provider did not return the requested JSON schema.'
        }
      ],
      monitoringPriorities: [
        'Review the preserved raw fallback text before acting.',
        'Re-run the analysis with a tighter JSON-only prompt if needed.'
      ]
    },
    prioritizedActionPlan: {
      immediate: [
        {
          priority: 1,
          action: 'Review the preserved raw fallback text.',
          reason: 'The provider returned unstructured output.',
          relatedIssue: 'Unstructured AI response'
        }
      ],
      within24Hours: [
        {
          priority: 1,
          action: 'Validate the diagnosis with another image or follow-up analysis.',
          reason: 'The fallback response may have omitted structured evidence.',
          relatedIssue: 'Unstructured AI response'
        }
      ],
      within7Days: [
        {
          priority: 1,
          action: 'Confirm whether symptoms improve after the first corrective action.',
          reason: 'Fallback parsing reduces certainty and requires follow-up verification.',
          relatedIssue: 'Unstructured AI response'
        }
      ]
    },
    priorityActions: [
      'Review the preserved raw fallback text',
      'Validate the diagnosis with a follow-up analysis',
      'Monitor symptom progression closely'
    ],
    preventativeMeasures: [
      'Use the JSON-only response contract for future analyses.',
      'Capture clearer multi-angle images to improve structured detection quality.'
    ],
    imageAnalysis: {
      hasImage: false,
      visualFindings: ['Fallback text review required'],
      overallConfidence: 72,
      imageQuality: {
        resolution: 'unknown',
        focus: 'unknown',
        lighting: 'unknown',
        magnification: 'unknown'
      },
      factorsAffectingAnalysis: ['The provider did not return a structured image assessment.'],
      recommendationsForFuture: ['Capture clearer images and retry if the diagnosis remains uncertain.']
    },
    recommendations: {
      immediate: ['Review the preserved raw fallback text'],
      shortTerm: ['Validate the diagnosis with a follow-up analysis'],
      longTerm: ['Use providers and prompts that consistently return valid JSON']
    },
    followUpSchedule: {
      checkAfterDays: 2,
      whatToMonitor: ['Symptom spread', 'Leaf color changes', 'Environmental stability'],
      successIndicators: ['Symptoms stop worsening', 'New growth remains stable'],
      escalationTriggers: ['Symptoms accelerate', 'A second analysis returns a more severe diagnosis']
    },
    prognosis: {
      expectedOutcome: 'Outcome depends on manual review of the preserved raw response.',
      timeframe: '24-72 hours for reassessment',
      factorsAffectingOutcome: ['Response quality', 'Environmental stability', 'Speed of intervention'],
      fullRecoveryExpected: true
    },
    costEstimates: {
      treatmentCost: 'Unknown until the fallback text is reviewed',
      preventiveSavings: 'Higher schema compliance reduces re-analysis time'
    },
    aiResponse: textResponse
  };
}

/**
 * Enhanced JSON extraction with recovery strategies
 * Attempts multiple extraction methods with progressively looser parsing
 */
function extractStructuredJson(rawText: string): AnalysisRecord | null {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const candidates = collectJsonCandidates(rawText);

  // Strategy 1: Direct JSON parse (strict)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed) && hasRequiredKeys(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Strategy 2: Repair and parse (tolerant)
  for (const candidate of candidates) {
    try {
      const repaired = repairPartialJson(candidate);
      if (repaired) {
        const parsed = JSON.parse(repaired);
        if (isRecord(parsed) && hasRequiredKeys(parsed)) {
          console.log('✅ JSON extracted with repair strategy');
          return parsed;
        }
      }
    } catch {
      continue;
    }
  }

  // Strategy 3: Extract largest valid object (fallback)
  const largestValid = extractLargestValidObject(rawText);
  if (largestValid && hasRequiredKeys(largestValid)) {
    console.log('✅ JSON extracted with largest-object strategy');
    return largestValid;
  }

  console.log('❌ All JSON extraction strategies failed');
  return null;
}

/**
 * Check if parsed object has minimum required keys for plant analysis
 */
function hasRequiredKeys(obj: AnalysisRecord): boolean {
  const requiredKeys = ['diagnosis', 'urgency', 'healthScore', 'recommendations'];
  const optionalButExpected = ['likelyCauses', 'evidenceObservations', 'uncertainties'];
  
  const hasRequired = requiredKeys.every(key => key in obj);
  const hasSomeExpected = optionalButExpected.some(key => key in obj);
  
  return hasRequired && (hasSomeExpected || Object.keys(obj).length >= 6);
}

/**
 * Attempt to repair common JSON syntax errors
 */
function repairPartialJson(jsonStr: string): string | null {
  if (!jsonStr || typeof jsonStr !== 'string') {
    return null;
  }

  let repaired = jsonStr.trim();

  // Remove markdown code blocks if present
  repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  // Fix trailing commas before } or ]
  repaired = repaired.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  // Fix unquoted keys (simple cases)
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Fix single quotes to double quotes (simple cases, not in content)
  // repaired = repaired.replace(/'/g, '"'); // Too aggressive, skip for now

  // Add missing closing braces (count and balance)
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces);
  }

  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets);
  }

  // Fix unclosed strings (find last unclosed quote and close it)
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) {
    // Odd number of quotes - add closing quote
    const lastQuoteIndex = repaired.lastIndexOf('"');
    if (lastQuoteIndex !== -1 && lastQuoteIndex < repaired.length - 1) {
      // Check if there's content after the last quote that needs to be closed
      const afterLastQuote = repaired.slice(lastQuoteIndex + 1);
      if (!afterLastQuote.trim().startsWith(',') && !afterLastQuote.trim().startsWith('}')) {
        repaired = repaired.slice(0, lastQuoteIndex + 1) + '" ' + afterLastQuote;
      }
    } else {
      repaired += '"';
    }
  }

  // Only return if significantly different and looks like valid JSON start
  if (repaired !== jsonStr && repaired.startsWith('{')) {
    return repaired;
  }

  return null;
}

/**
 * Extract the largest balanced JSON object from text
 */
function extractLargestValidObject(rawText: string): AnalysisRecord | null {
  const objects = extractBalancedObjects(rawText);
  
  if (objects.length === 0) {
    return null;
  }

  // Sort by size (largest first) and try to parse
  objects.sort((a, b) => b.length - a.length);

  for (const objStr of objects) {
    try {
      const parsed = JSON.parse(objStr);
      if (isRecord(parsed) && Object.keys(parsed).length >= 4) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function collectJsonCandidates(rawText: string): string[] {
  const candidates: string[] = [];
  const trimmed = rawText.trim();

  const pushCandidate = (value?: string) => {
    const candidate = value?.trim();
    if (!candidate || candidates.includes(candidate)) {
      return;
    }
    candidates.push(candidate);
  };

  pushCandidate(trimmed);

  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    pushCandidate(match[1]);
  }

  for (const candidate of extractBalancedObjects(trimmed)) {
    pushCandidate(candidate);
  }

  return candidates;
}

function extractBalancedObjects(rawText: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString && char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(rawText.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
}

function normalizeLikelyCauses(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  rawNarrative?: string
): PlantAnalysisLikelyCause[] {
  const directCauses = Array.isArray(result.likelyCauses) ? result.likelyCauses : [];
  const normalizedDirect = directCauses
    .map(item => {
      if (!isRecord(item)) {
        return null;
      }

      const cause = normalizeMeaningfulString(item.cause || item.name, '');
      if (!cause) {
        return null;
      }

      return {
        cause,
        confidence: clampScore(item.confidence, clampScore(result.confidence, 75)),
        evidence: normalizeMeaningfulString(
          item.evidence,
          normalizeEvidenceObservations(result, inputParameters, rawNarrative)[0] ||
            'Derived from model diagnosis.'
        )
      };
    })
    .filter(Boolean) as PlantAnalysisLikelyCause[];

  if (normalizedDirect.length > 0) {
    return normalizedDirect;
  }

  const causes = normalizeMeaningfulStringArray(result.causes, []);
  const evidence = normalizeEvidenceObservations(result, inputParameters, rawNarrative);
  if (causes.length === 0) {
    const narrativeSummary = summarizeNarrative(rawNarrative);
    if (narrativeSummary) {
      return [
        {
          cause: narrativeSummary,
          confidence: clampScore(result.confidence, 70),
          evidence:
            evidence[0] || 'Derived from the unstructured provider narrative when JSON parsing failed.'
        }
      ];
    }

    const inputDerivedCauses = deriveInputDrivenCauses(inputParameters);
    if (inputDerivedCauses.length > 0) {
      return inputDerivedCauses.map((cause, index) => ({
        cause,
        confidence: clampScore(result.confidence, 70) - Math.min(index * 5, 10),
        evidence:
          evidence[index] ||
          evidence[0] ||
          'Derived from the reported symptoms and environmental readings.'
      }));
    }

    return [
      {
        cause: 'Plant condition requires follow-up review',
        confidence: clampScore(result.confidence, 70),
        evidence:
          evidence[0] || 'The model returned a diagnosis without a structured likelyCauses array.'
      }
    ];
  }

  return causes.slice(0, 3).map((cause, index) => ({
    cause,
    confidence: clampScore(result.confidence, 75) - Math.min(index * 5, 15),
    evidence: evidence[index] || evidence[0] || 'Derived from the returned diagnosis and symptoms.'
  }));
}

function normalizeEvidenceObservations(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  rawNarrative?: string
): string[] {
  const observations = filterMeaningfulStrings(
    uniqStrings([
      ...normalizeMeaningfulStringArray(result.evidenceObservations, []),
      ...normalizeMeaningfulStringArray(result.symptomsMatched, []),
      ...normalizeMeaningfulStringArray(result.imageAnalysis?.visualFindings, []),
      ...filterMeaningfulStrings(collectStringValues(result.reasoning).slice(0, 6)),
      ...deriveInputObservations(inputParameters)
    ])
  );

  if (observations.length > 0) {
    return observations;
  }

  const narrativeSummary = summarizeNarrative(rawNarrative);
  if (narrativeSummary) {
    return [narrativeSummary];
  }

  return ['No structured evidence was returned, so the assessment relies on reported symptoms and conservative fallbacks.'];
}

function normalizeUncertainties(
  result: AnalysisRecord,
  parsedFromStructuredJson: boolean
): string[] {
  const uncertainties = normalizeStringArray(result.uncertainties, []);
  if (uncertainties.length > 0) {
    return uncertainties;
  }

  const derived: string[] = [];
  if (!parsedFromStructuredJson) {
    derived.push('The provider did not return valid JSON, so some fields were derived heuristically.');
  }
  if (clampScore(result.confidence, 75) < 80) {
    derived.push('Model confidence is below 80, so confirm the diagnosis with follow-up observations.');
  }
  if (!result.imageAnalysis?.hasImage) {
    derived.push('No structured image evidence was available, which limits visual certainty.');
  }

  return derived.length > 0
    ? uniqStrings(derived)
    : ['No major uncertainties were explicitly returned by the AI provider.'];
}

function normalizeDetectedIssues(
  result: AnalysisRecord,
  rawNarrative?: string,
  inputParameters?: Record<string, unknown>
): DetectedIssue[] {
  const directIssues = Array.isArray(result.detectedIssues) ? result.detectedIssues : [];
  const fallbackEvidence = normalizeEvidenceObservations(result, inputParameters, rawNarrative);
  const normalizedDirect = directIssues
    .map(issue => normalizeIssue(issue, fallbackEvidence))
    .filter(Boolean) as DetectedIssue[];

  if (normalizedDirect.length > 0) {
    return dedupeIssues(normalizedDirect);
  }

  const derivedIssues: DetectedIssue[] = [];

  const pushIssue = (issue: DetectedIssue | null) => {
    if (issue) {
      derivedIssues.push(issue);
    }
  };

  (result.nutrientDeficiencies || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    pushIssue({
      type: 'nutrient_deficiency',
      name: normalizeMeaningfulString(item.nutrient, 'Unknown nutrient issue'),
      severity: normalizeSeverity(item.severity, result.severity || 'moderate'),
      confidence: clampScore(item.confidence, result.confidence || 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(item.deficiencyPattern, []),
          ...normalizeMeaningfulStringArray(item.affectedPlantParts, [])
        ],
        fallbackEvidence,
        'Structured nutrient deficiency details were limited.'
      )
    });
  });

  (result.nutrientToxicities || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    pushIssue({
      type: 'nutrient_toxicity',
      name: normalizeMeaningfulString(item.nutrient, 'Unknown nutrient toxicity'),
      severity: normalizeSeverity(item.severity, result.severity || 'moderate'),
      confidence: clampScore(item.confidence, result.confidence || 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(item.symptoms, []),
          ...normalizeMeaningfulStringArray(item.excessLevel, [])
        ],
        fallbackEvidence,
        'Structured nutrient toxicity details were limited.'
      )
    });
  });

  (result.pestsDetected || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    pushIssue({
      type: 'pest',
      name: normalizeMeaningfulString(item.name, 'Unknown pest'),
      severity: normalizeSeverity(item.severity, 'moderate'),
      confidence: clampScore(item.confidence, result.confidence || 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(item.damageType, []),
          ...filterMeaningfulStrings(collectStringValues(item.treatment).slice(0, 2))
        ],
        fallbackEvidence,
        'Structured pest evidence was limited.'
      )
    });
  });

  (result.diseasesDetected || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    pushIssue({
      type: 'disease',
      name: normalizeMeaningfulString(item.name, 'Unknown disease'),
      severity: normalizeSeverity(item.severity, 'moderate'),
      confidence: clampScore(item.confidence, result.confidence || 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(item.symptoms, []),
          ...normalizeMeaningfulStringArray(item.pathogen, [])
        ],
        fallbackEvidence,
        'Structured disease evidence was limited.'
      )
    });
  });

  (result.environmentalFactors || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    pushIssue({
      type: 'environmental',
      name: normalizeMeaningfulString(item.factor, 'Environmental stress'),
      severity: normalizeSeverity(item.severity, 'moderate'),
      confidence: clampScore(item.confidence, result.confidence || 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(item.currentValue, []),
          ...normalizeMeaningfulStringArray(item.optimalRange, []),
          ...normalizeMeaningfulStringArray(item.correction, [])
        ],
        fallbackEvidence,
        'Environmental readings or corrections were limited.'
      )
    });
  });

  if (derivedIssues.length === 0) {
    pushIssue({
      type: rawNarrative ? 'analysis_response' : 'diagnosis',
      name: deriveMeaningfulDiagnosis(result, inputParameters, rawNarrative),
      severity: normalizeSeverity(result.severity, 'moderate'),
      confidence: clampScore(result.confidence, 75),
      evidence: buildIssueEvidence(
        [
          ...normalizeMeaningfulStringArray(result.symptomsMatched, []),
          ...normalizeMeaningfulStringArray(result.causes, []),
          summarizeNarrative(rawNarrative) || ''
        ],
        fallbackEvidence,
        'The diagnosis was derived from limited structured evidence.'
      )
    });
  }

  return dedupeIssues(derivedIssues);
}

function normalizeUrgencyReasons(
  result: AnalysisRecord,
  detectedIssues: DetectedIssue[]
): string[] {
  const directReasons = normalizeMeaningfulStringArray(result.urgencyReasons, []);
  if (directReasons.length > 0) {
    return directReasons;
  }

  // Deduplicate and filter reasons
  const reasons = filterMeaningfulStrings(uniqStrings([
    ...detectedIssues.slice(0, 3).map(issue => {
      const evidence = issue.evidence[0];
      if (evidence) {
        return `${issue.name}: ${evidence}`;
      }
      return `${issue.name} is contributing to the ${result.urgency} urgency rating.`;
    }),
    ...normalizeMeaningfulStringArray(result.evidenceObservations, []).slice(0, 2),
    ...normalizeMeaningfulStringArray(result.causes, []).slice(0, 2)
  ]));

  if (reasons.length > 0) {
    return reasons;
  }

  // DETERMINISTIC FALLBACK: Guaranteed non-empty urgency reasons
  if (normalizeUrgency(result.urgency, 'medium') === 'low') {
    return ['No acute drivers were identified in the returned analysis.'];
  }

  // Always return at least one meaningful reason
  const diagnosis = normalizeMeaningfulString(result.diagnosis, 'Plant condition');
  return [`${diagnosis} requires active monitoring and follow-up assessment.`];
}

function normalizeHealthScoreBreakdown(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  detectedIssues: DetectedIssue[] = []
): HealthScoreBreakdownEntry[] {
  if (Array.isArray(result.healthScoreBreakdown)) {
    const normalizedArray = result.healthScoreBreakdown
      .map((item: unknown, index: number) =>
        normalizeHealthBreakdownItem(item, result, inputParameters, detectedIssues, index)
      )
      .filter(Boolean) as HealthScoreBreakdownEntry[];

    if (normalizedArray.length > 0) {
      return normalizedArray;
    }
  }

  if (isRecord(result.healthScoreBreakdown)) {
    const normalizedObject = HEALTH_SCORE_CATEGORIES
      .map((category, index) =>
        normalizeHealthBreakdownItem(
          {
            category,
            score: result.healthScoreBreakdown[category],
            reason: result.healthScoreBreakdownReasons?.[category]
          },
          result,
          inputParameters,
          detectedIssues,
          index
        )
      )
      .filter(Boolean) as HealthScoreBreakdownEntry[];

    if (normalizedObject.length > 0) {
      return normalizedObject;
    }
  }

  return HEALTH_SCORE_CATEGORIES.map((category, index) =>
    buildDerivedHealthBreakdownItem(category, result, inputParameters, detectedIssues, index)
  );
}

function normalizeHealthBreakdownItem(
  value: unknown,
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  detectedIssues: DetectedIssue[] = [],
  index = 0
): HealthScoreBreakdownEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const category = normalizeString(value.category, HEALTH_SCORE_CATEGORIES[index] || `factor_${index + 1}`);
  const fallback = buildDerivedHealthBreakdownItem(category, result, inputParameters, detectedIssues, index);
  const normalized: HealthScoreBreakdownEntry = {
    category,
    score: clampScore(value.score, fallback.score),
    reason: normalizeMeaningfulString(value.reason, fallback.reason)
  };

  const parsed = HealthScoreBreakdownEntrySchema.safeParse(normalized);
  return parsed.success ? parsed.data : fallback;
}

function buildDerivedHealthBreakdownItem(
  category: string,
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  detectedIssues: DetectedIssue[] = [],
  index = 0
): HealthScoreBreakdownEntry {
  const overallHealth = clampScore(result.healthScore, 75);
  const normalizedCategory = category.toLowerCase();
  const topIssue = detectedIssues[0];

  if (normalizedCategory === 'vigor') {
    return {
      category,
      score: clampScore(result.morphologicalAnalysis?.overallVigor, overallHealth),
      reason: topIssue
        ? `Overall vigor score reflects the impact of ${topIssue.name.toLowerCase()}.`
        : 'Overall vigor was estimated from the returned diagnosis and symptom set.'
    };
  }

  if (normalizedCategory === 'leafcondition') {
    const symptoms = normalizeMeaningfulStringArray(result.symptomsMatched, []);
    return {
      category,
      score: clampScore(overallHealth - (symptoms.length > 0 ? 5 : 0), overallHealth),
      reason: symptoms[0]
        ? `Leaf condition score reflects ${symptoms[0].toLowerCase()}.`
        : 'Leaf condition was estimated from the returned diagnosis.'
    };
  }

  if (normalizedCategory === 'pestfree') {
    const pests = Array.isArray(result.pestsDetected) ? result.pestsDetected.length : 0;
    return {
      category,
      score: pests > 0 ? Math.max(25, 90 - pests * 20) : 90,
      reason:
        pests > 0
          ? `${pests} pest finding(s) reduced the pest-free score.`
          : 'No explicit pest findings were returned by the model.'
    };
  }

  if (normalizedCategory === 'environmentoptimal') {
    const environmentalIssues = Array.isArray(result.environmentalFactors)
      ? result.environmentalFactors.length
      : 0;
    const inputSignals = countPresentEnvironmentalInputs(inputParameters);
    return {
      category,
      score:
        environmentalIssues > 0
          ? Math.max(30, overallHealth - environmentalIssues * 10)
          : inputSignals > 0
            ? overallHealth
            : 75,
      reason:
        environmentalIssues > 0
          ? 'Structured environmental findings reduced the environment score.'
          : inputSignals > 0
            ? 'Available environmental readings did not indicate an acute issue.'
            : 'Environmental inputs were limited, so the score is conservative.'
    };
  }

  if (normalizedCategory === 'growthstageappropriate') {
    const growthStage = normalizeString(inputParameters?.growthStage, '');
    return {
      category,
      score: growthStage ? clampScore(overallHealth + 5, overallHealth) : overallHealth,
      reason: growthStage
        ? `Assessment considered the ${growthStage.toLowerCase()} growth stage context.`
        : 'Growth-stage context was limited in the request.'
    };
  }

  if (normalizedCategory === 'roothealth') {
    const rootIssue = detectedIssues.find(issue => issue.name.toLowerCase().includes('root'));
    return {
      category,
      score: rootIssue ? Math.max(25, overallHealth - 20) : overallHealth,
      reason: rootIssue
        ? `Root health was reduced because ${rootIssue.name.toLowerCase()} was flagged.`
        : 'No direct root-zone issue was identified in the returned analysis.'
    };
  }

  return {
    category,
    score: clampScore(overallHealth - Math.min(index * 2, 10), overallHealth),
    reason: 'Score derived from the overall plant health assessment.'
  };
}

function normalizeEnvironmentRiskAssessment(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  detectedIssues: DetectedIssue[] = []
): EnvironmentRiskAssessment {
  if (isRecord(result.environmentRiskAssessment)) {
    const normalizedDirect = {
      overallRisk: normalizeUrgency(
        result.environmentRiskAssessment.overallRisk || result.environmentRiskAssessment.riskLevel,
        normalizeUrgency(result.urgency, 'medium')
      ),
      summary: normalizeMeaningfulString(
        result.environmentRiskAssessment.summary,
        'Environmental risk was assessed from the returned model output.'
      ),
      contributingFactors: normalizeEnvironmentRiskFactors(
        result.environmentRiskAssessment.contributingFactors ||
          result.environmentRiskAssessment.factors,
        result
      ),
      monitoringPriorities: normalizeMeaningfulStringArray(
        result.environmentRiskAssessment.monitoringPriorities ||
          result.environmentRiskAssessment.monitoringPriority,
        []
      )
    };

    if (normalizedDirect.contributingFactors.length === 0) {
      normalizedDirect.contributingFactors = deriveEnvironmentRiskFactors(result, inputParameters);
    }

    if (normalizedDirect.monitoringPriorities.length === 0) {
      normalizedDirect.monitoringPriorities = deriveEnvironmentMonitoringPriorities(
        normalizedDirect.contributingFactors,
        detectedIssues
      );
    }

    const parsed = EnvironmentRiskAssessmentSchema.safeParse(normalizedDirect);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const contributingFactors = deriveEnvironmentRiskFactors(result, inputParameters);
  const overallRisk = contributingFactors.reduce<PlantAnalysisUrgency>((highest, factor) => {
    return urgencyRank(factor.riskLevel) > urgencyRank(highest) ? factor.riskLevel : highest;
  }, normalizeUrgency(result.urgency, 'medium'));

  return {
    overallRisk,
    summary:
      contributingFactors.length > 0
        ? `${contributingFactors.length} environmental factor(s) are contributing to plant risk.`
        : 'No acute environmental risk factors were explicitly identified.',
    contributingFactors,
    monitoringPriorities: deriveEnvironmentMonitoringPriorities(contributingFactors, detectedIssues)
  };
}

function normalizeEnvironmentRiskFactors(
  value: unknown,
  result: AnalysisRecord
): EnvironmentRiskFactor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      if (!isRecord(item)) {
        return null;
      }

      const factor: EnvironmentRiskFactor = {
        factor: normalizeMeaningfulString(item.factor || item.name, 'Environmental factor'),
        currentValue: normalizeOptionalString(item.currentValue),
        optimalRange: normalizeOptionalString(item.optimalRange),
        riskLevel: normalizeUrgency(item.riskLevel || item.severity, normalizeUrgency(result.urgency, 'medium')),
        reason: normalizeMeaningfulString(
          item.reason || item.correction || item.summary,
          'Environmental correction or monitoring is recommended.'
        )
      };

      const parsed = EnvironmentRiskFactorSchema.safeParse(factor);
      return parsed.success ? parsed.data : null;
    })
    .filter(Boolean) as EnvironmentRiskFactor[];
}

function deriveEnvironmentRiskFactors(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>
): EnvironmentRiskFactor[] {
  const factors: EnvironmentRiskFactor[] = [];

  (result.environmentalFactors || []).forEach((item: unknown) => {
    if (!isRecord(item)) {
      return;
    }

    const factor: EnvironmentRiskFactor = {
      factor: normalizeMeaningfulString(item.factor, 'Environmental factor'),
      currentValue: normalizeOptionalString(item.currentValue),
      optimalRange: normalizeOptionalString(item.optimalRange),
      riskLevel: normalizeUrgency(item.severity, 'medium'),
      reason: normalizeMeaningfulString(
        item.correction || item.reason,
        'Corrective environmental action is recommended.'
      )
    };

    const parsed = EnvironmentRiskFactorSchema.safeParse(factor);
    if (parsed.success) {
      factors.push(parsed.data);
    }
  });

  const derivedInputs = deriveEnvironmentRiskFactorsFromInputs(inputParameters);
  factors.push(...derivedInputs);

  if (factors.length > 0) {
    return dedupeEnvironmentFactors(factors);
  }

  return [
    {
      factor: 'general_environment',
      riskLevel: normalizeUrgency(result.urgency, 'medium'),
      reason: 'The model did not return explicit environmental factors, so continue monitoring key readings.'
    }
  ];
}

function deriveEnvironmentRiskFactorsFromInputs(
  inputParameters?: Record<string, unknown>
): EnvironmentRiskFactor[] {
  if (!inputParameters) {
    return [];
  }

  const factors: EnvironmentRiskFactor[] = [];
  const phLevel = parseNumber(inputParameters.phLevel);
  const humidity = parseNumber(inputParameters.humidity);
  const temperatureCelsius = parseTemperatureCelsius(inputParameters);

  if (phLevel !== null && (phLevel < 6 || phLevel > 7)) {
    factors.push({
      factor: 'ph',
      currentValue: `${phLevel}`,
      optimalRange: '6.0-7.0',
      riskLevel: phLevel < 5.8 || phLevel > 7.2 ? 'high' : 'medium',
      reason: 'The reported pH is outside the preferred cannabis uptake range.'
    });
  }

  if (humidity !== null && (humidity < 40 || humidity > 60)) {
    factors.push({
      factor: 'humidity',
      currentValue: `${humidity}%`,
      optimalRange: '40-60%',
      riskLevel: humidity < 35 || humidity > 70 ? 'high' : 'medium',
      reason: 'The reported humidity is outside the target range and can amplify stress or disease pressure.'
    });
  }

  if (temperatureCelsius !== null && (temperatureCelsius < 20 || temperatureCelsius > 26)) {
    factors.push({
      factor: 'temperature',
      currentValue: `${temperatureCelsius}C`,
      optimalRange: '20-26C',
      riskLevel: temperatureCelsius < 18 || temperatureCelsius > 29 ? 'high' : 'medium',
      reason: 'The reported temperature is outside the preferred growth range.'
    });
  }

  return factors;
}

function deriveEnvironmentMonitoringPriorities(
  factors: EnvironmentRiskFactor[],
  detectedIssues: DetectedIssue[]
): string[] {
  const priorities = filterMeaningfulStrings(uniqStrings([
    ...factors.slice(0, 3).map(factor => `Recheck ${factor.factor} against ${factor.optimalRange || 'the target range'}.`),
    ...detectedIssues
      .filter(issue => issue.type === 'environmental')
      .slice(0, 2)
      .map(issue => `Watch for worsening signs linked to ${issue.name.toLowerCase()}.`)
  ]));

  return priorities.length > 0
    ? priorities
    : ['Continue monitoring temperature, humidity, and pH for change.'];
}

function normalizePrioritizedActionPlan(
  result: AnalysisRecord,
  urgencyReasons: string[],
  detectedIssues: DetectedIssue[]
): PrioritizedActionPlan {
  const rawPlan = isRecord(result.prioritizedActionPlan) ? result.prioritizedActionPlan : {};
  const usedActions = new Set<string>();
  const derivedFallbacks = deriveFallbackActionGroups(detectedIssues, result);

  const immediateFallback = filterMeaningfulStrings(uniqStrings([
    ...normalizeMeaningfulStringArray(result.recommendations?.immediate, []),
    ...normalizeMeaningfulStringArray(result.priorityActions, []),
    ...normalizeMeaningfulStringArray(result.treatment, []).slice(0, 3),
    ...derivedFallbacks.immediate.map(item => item.action)
  ]));
  const within24Fallback = filterMeaningfulStrings(uniqStrings([
    ...normalizeMeaningfulStringArray(rawPlan.within24Hours || rawPlan.next24Hours || rawPlan['24h'], []),
    ...normalizeMeaningfulStringArray(result.priorityActions, []),
    ...normalizeMeaningfulStringArray(result.treatment, []),
    ...normalizeMeaningfulStringArray(result.recommendations?.shortTerm, []),
    ...derivedFallbacks.within24Hours.map(item => item.action)
  ])).filter(action => !includesAction(usedActions, action));
  const within7Fallback = filterMeaningfulStrings(uniqStrings([
    ...normalizeMeaningfulStringArray(rawPlan.within7Days || rawPlan.next7Days || rawPlan['7d'], []),
    ...normalizeMeaningfulStringArray(result.recommendations?.shortTerm, []),
    ...normalizeMeaningfulStringArray(result.followUpSchedule?.whatToMonitor, []),
    ...normalizeMeaningfulStringArray(result.preventativeMeasures, []),
    ...derivedFallbacks.within7Days.map(item => item.action)
  ]));

  const immediate = normalizeActionGroup(
    rawPlan.immediate || result.recommendations?.immediate || result.priorityActions || result.treatment || immediateFallback,
    usedActions,
    urgencyReasons[0] || 'Immediate stabilization is recommended.',
    detectedIssues
  );
  const within24Hours = normalizeActionGroup(
    rawPlan.within24Hours || rawPlan.next24Hours || rawPlan['24h'] || within24Fallback,
    usedActions,
    urgencyReasons[1] || urgencyReasons[0] || 'Follow-up action is recommended within 24 hours.',
    detectedIssues
  );
  const within7Days = normalizeActionGroup(
    rawPlan.within7Days || rawPlan.next7Days || rawPlan['7d'] || within7Fallback,
    usedActions,
    'Track whether the plant stabilizes over the next week.',
    detectedIssues
  );

  const plan: PrioritizedActionPlan = {
    immediate:
      immediate.length > 0
        ? immediate
        : [
            {
              priority: 1,
              action:
                immediateFallback[0] ||
                'Review the diagnosis details and stabilize the most affected area.',
              reason: urgencyReasons[0] || 'Immediate stabilization is recommended.',
              relatedIssue: detectedIssues[0]?.name
            }
          ],
    within24Hours:
      within24Hours.length > 0
        ? within24Hours
        : [
            {
              priority: 1,
              action:
                within24Fallback[0] ||
                'Verify whether the initial corrective action stops further decline within 24 hours.',
              reason: urgencyReasons[1] || urgencyReasons[0] || 'A short-interval follow-up is recommended.',
              relatedIssue: detectedIssues[0]?.name
            }
          ],
    within7Days:
      within7Days.length > 0
        ? within7Days
        : [
            {
              priority: 1,
              action:
                within7Fallback[0] ||
                'Document symptom changes and reassess the plant in one week.',
              reason: 'Week-scale follow-up confirms whether the intervention worked.',
              relatedIssue: detectedIssues[0]?.name
            }
          ]
  };

  return PrioritizedActionPlanSchema.parse(plan);
}

function normalizeActionGroup(
  value: unknown,
  usedActions: Set<string>,
  fallbackReason: string,
  detectedIssues: DetectedIssue[]
): PrioritizedActionItem[] {
  const values = Array.isArray(value) ? value : normalizeMeaningfulStringArray(value, []);
  const actions: PrioritizedActionItem[] = [];

  values.forEach((item, index) => {
    const normalized = normalizeActionItem(item, index, fallbackReason, detectedIssues[index]);
    if (!normalized) {
      return;
    }

    if (includesAction(usedActions, normalized.action)) {
      return;
    }

    usedActions.add(normalized.action.toLowerCase());
    actions.push(normalized);
  });

  return actions;
}

function normalizeActionItem(
  value: unknown,
  index: number,
  fallbackReason: string,
  relatedIssue?: DetectedIssue
): PrioritizedActionItem | null {
  if (typeof value === 'string') {
    const action = normalizeMeaningfulAction(value);
    if (!action) {
      return null;
    }

    return PrioritizedActionItemSchema.parse({
      priority: index + 1,
      action,
      reason: normalizeMeaningfulString(fallbackReason, 'Targeted follow-up action is recommended.'),
      relatedIssue: relatedIssue?.name
    });
  }

  if (!isRecord(value)) {
    return null;
  }

  const action = normalizeMeaningfulAction(
    value.action || value.step || value.task || value.recommendation || value.title,
  );
  if (!action) {
    return null;
  }

  return PrioritizedActionItemSchema.parse({
    priority: normalizePriority(value.priority, index + 1),
    action,
    reason: normalizeMeaningfulString(value.reason, fallbackReason),
    relatedIssue: normalizeOptionalString(value.relatedIssue || value.issue || relatedIssue?.name)
  });
}

function normalizeLegacyRecommendations(
  result: AnalysisRecord,
  actionPlan: PrioritizedActionPlan
): LegacyPlantAnalysisRecommendations {
  const existing = isRecord(result.recommendations) ? result.recommendations : {};

  const recommendations: LegacyPlantAnalysisRecommendations = {
    immediate: normalizeMeaningfulStringArray(
      existing.immediate,
      actionPlan.immediate.map(item => item.action)
    ),
    shortTerm: normalizeMeaningfulStringArray(
      existing.shortTerm,
      uniqStrings([
        ...actionPlan.within24Hours.map(item => item.action),
        ...actionPlan.within7Days.map(item => item.action)
      ])
    ),
    longTerm: normalizeMeaningfulStringArray(
      existing.longTerm,
      normalizeMeaningfulStringArray(result.preventativeMeasures, [
        'Document plant response over time and keep environmental conditions stable.'
      ])
    )
  };

  if (recommendations.immediate.length === 0) {
    recommendations.immediate = actionPlan.immediate.map(item => item.action);
  }
  if (recommendations.shortTerm.length === 0) {
    recommendations.shortTerm = uniqStrings([
      ...actionPlan.within24Hours.map(item => item.action),
      ...actionPlan.within7Days.map(item => item.action)
    ]);
  }
  if (recommendations.longTerm.length === 0) {
    recommendations.longTerm = ['Document plant response over time and keep environmental conditions stable.'];
  }

  return recommendations;
}

function deriveReportedSymptoms(inputParameters?: Record<string, unknown>): string[] {
  const leafSymptoms = normalizeMeaningfulString(inputParameters?.leafSymptoms, '');
  if (!leafSymptoms) {
    return [];
  }

  return normalizeStringArray(leafSymptoms, []).slice(0, 4);
}

function deriveInputObservations(inputParameters?: Record<string, unknown>): string[] {
  if (!inputParameters) {
    return [];
  }

  const observations = deriveReportedSymptoms(inputParameters).map(
    symptom => `Reported symptom: ${symptom}`
  );
  const phLevel = parseNumber(inputParameters.phLevel);
  const humidity = parseNumber(inputParameters.humidity);
  const temperatureCelsius = parseTemperatureCelsius(inputParameters);
  const growthStage = normalizeMeaningfulString(inputParameters.growthStage, '');
  const medium = normalizeMeaningfulString(inputParameters.medium, '');

  if (phLevel !== null) {
    observations.push(
      phLevel < 6 || phLevel > 7
        ? `Reported pH ${phLevel} is outside the 6.0-7.0 target range.`
        : `Reported pH ${phLevel} is within the 6.0-7.0 target range.`
    );
  }

  if (humidity !== null) {
    observations.push(
      humidity < 40 || humidity > 60
        ? `Reported humidity ${humidity}% is outside the 40-60% target range.`
        : `Reported humidity ${humidity}% is within the 40-60% target range.`
    );
  }

  if (temperatureCelsius !== null) {
    observations.push(
      temperatureCelsius < 20 || temperatureCelsius > 26
        ? `Reported temperature ${temperatureCelsius}C is outside the 20-26C target range.`
        : `Reported temperature ${temperatureCelsius}C is within the 20-26C target range.`
    );
  }

  if (growthStage) {
    observations.push(`Growth stage context: ${growthStage}.`);
  }

  if (medium) {
    observations.push(`Growing medium context: ${medium}.`);
  }

  return filterMeaningfulStrings(observations).slice(0, 6);
}

function deriveInputDrivenCauses(inputParameters?: Record<string, unknown>): string[] {
  if (!inputParameters) {
    return [];
  }

  const causes: string[] = [];
  const phLevel = parseNumber(inputParameters.phLevel);
  const humidity = parseNumber(inputParameters.humidity);
  const temperatureCelsius = parseTemperatureCelsius(inputParameters);

  if (phLevel !== null && (phLevel < 6 || phLevel > 7)) {
    causes.push(`pH imbalance at ${phLevel} is likely affecting nutrient uptake`);
  }

  if (humidity !== null && (humidity < 40 || humidity > 60)) {
    causes.push(`Humidity at ${humidity}% is adding environmental stress`);
  }

  if (temperatureCelsius !== null && (temperatureCelsius < 20 || temperatureCelsius > 26)) {
    causes.push(`Temperature at ${temperatureCelsius}C is outside the preferred growth range`);
  }

  return filterMeaningfulStrings(causes);
}

function deriveMeaningfulDiagnosis(
  result: AnalysisRecord,
  inputParameters?: Record<string, unknown>,
  rawNarrative?: string
): string {
  const directDiagnosis = normalizeMeaningfulString(result.diagnosis, '');
  if (directDiagnosis) {
    return directDiagnosis;
  }

  const likelyCause = Array.isArray(result.likelyCauses)
    ? result.likelyCauses
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.cause || item.name, '') : ''))
        .find(Boolean)
    : '';
  if (likelyCause) {
    return likelyCause;
  }

  const disease = Array.isArray(result.diseasesDetected)
    ? result.diseasesDetected
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.name, '') : ''))
        .find(Boolean)
    : '';
  if (disease) {
    return disease;
  }

  const pest = Array.isArray(result.pestsDetected)
    ? result.pestsDetected
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.name, '') : ''))
        .find(Boolean)
    : '';
  if (pest) {
    return `${pest} pressure`;
  }

  const nutrientDeficiency = Array.isArray(result.nutrientDeficiencies)
    ? result.nutrientDeficiencies
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.nutrient, '') : ''))
        .find(Boolean)
    : '';
  if (nutrientDeficiency) {
    return `${nutrientDeficiency} deficiency`;
  }

  const nutrientToxicity = Array.isArray(result.nutrientToxicities)
    ? result.nutrientToxicities
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.nutrient, '') : ''))
        .find(Boolean)
    : '';
  if (nutrientToxicity) {
    return `${nutrientToxicity} toxicity`;
  }

  const environmentalFactor = Array.isArray(result.environmentalFactors)
    ? result.environmentalFactors
        .map(item => (isRecord(item) ? normalizeMeaningfulString(item.factor, '') : ''))
        .find(Boolean)
    : '';
  if (environmentalFactor) {
    return `${environmentalFactor} stress`;
  }

  const directCause = normalizeMeaningfulStringArray(result.causes, [])[0];
  if (directCause) {
    return directCause;
  }

  const narrativeSummary = summarizeNarrative(rawNarrative);
  if (narrativeSummary) {
    return narrativeSummary;
  }

  const reportedSymptom = deriveReportedSymptoms(inputParameters)[0];
  if (reportedSymptom) {
    return `Plant stress matching reported symptom: ${clipText(reportedSymptom, 110)}`;
  }

  const inputCause = deriveInputDrivenCauses(inputParameters)[0];
  if (inputCause) {
    return inputCause;
  }

  // DETERMINISTIC FALLBACK: Use input context for specific diagnosis
  const strain = normalizeMeaningfulString(inputParameters?.strain, '');
  const stage = normalizeMeaningfulString(inputParameters?.growthStage, '');
  const symptoms = normalizeMeaningfulString(inputParameters?.leafSymptoms, '');
  
  if (strain || stage || symptoms) {
    const parts = [];
    if (strain) parts.push(strain);
    if (stage) parts.push(`${stage} stage`);
    parts.push('requires assessment');
    return parts.join(' ');
  }
  
  return 'Plant condition requires follow-up review';
}

function deriveFallbackActionGroups(
  detectedIssues: DetectedIssue[],
  result: AnalysisRecord
): PrioritizedActionPlan {
  const topIssues = detectedIssues.slice(0, 3);
  const immediate = topIssues.map((issue, index) => ({
    priority: index + 1,
    action: buildIssueAction(issue, 'immediate'),
    reason: issue.evidence[0] || `Address ${issue.name.toLowerCase()} promptly.`,
    relatedIssue: issue.name
  }));
  const within24Hours = topIssues.map((issue, index) => ({
    priority: index + 1,
    action: buildIssueAction(issue, '24h'),
    reason: issue.evidence[1] || issue.evidence[0] || `Recheck ${issue.name.toLowerCase()} within 24 hours.`,
    relatedIssue: issue.name
  }));
  const within7Days = topIssues.map((issue, index) => ({
    priority: index + 1,
    action: buildIssueAction(issue, '7d'),
    reason: `Week-scale follow-up confirms whether ${issue.name.toLowerCase()} is improving.`,
    relatedIssue: issue.name
  }));

  return {
    immediate: immediate.length > 0 ? immediate : [
      {
        priority: 1,
        action: 'Review the preserved analysis details and stabilize the most affected area.',
        reason: 'No structured action list was returned, so the response falls back to manual review.',
        relatedIssue: normalizeOptionalString(result.diagnosis)
      }
    ],
    within24Hours: within24Hours.length > 0 ? within24Hours : [
      {
        priority: 1,
        action: 'Verify that the first corrective step stops further decline within 24 hours.',
        reason: 'Short-interval follow-up is required when the action plan was derived heuristically.',
        relatedIssue: normalizeOptionalString(result.diagnosis)
      }
    ],
    within7Days: within7Days.length > 0 ? within7Days : [
      {
        priority: 1,
        action: 'Document symptom changes and reassess the plant over the next 7 days.',
        reason: 'Week-scale follow-up confirms whether the intervention worked.',
        relatedIssue: normalizeOptionalString(result.diagnosis)
      }
    ]
  };
}

function buildIssueAction(issue: DetectedIssue, timeframe: 'immediate' | '24h' | '7d'): string {
  const issueName = issue.name.toLowerCase();

  switch (issue.type) {
    case 'nutrient_deficiency':
      return timeframe === 'immediate'
        ? `Correct the suspected ${issueName} deficiency and document the first adjustment.`
        : timeframe === '24h'
          ? `Recheck whether ${issueName} deficiency symptoms stop spreading after the first correction.`
          : `Track new growth for one week to confirm the ${issueName} deficiency is resolving.`;
    case 'nutrient_toxicity':
      return timeframe === 'immediate'
        ? `Reduce or rebalance feed strength to relieve ${issueName} toxicity.`
        : timeframe === '24h'
          ? `Confirm that excess ${issueName} symptoms stabilize after feed correction.`
          : `Monitor the plant for one week to ensure ${issueName} toxicity symptoms fade.`;
    case 'pest':
      return timeframe === 'immediate'
        ? `Inspect and treat affected foliage for ${issueName}.`
        : timeframe === '24h'
          ? `Reinspect leaves within 24 hours to confirm ${issueName} activity is reduced.`
          : `Repeat scouting over the next week to confirm ${issueName} does not rebound.`;
    case 'disease':
      return timeframe === 'immediate'
        ? `Isolate affected tissue and apply control steps for ${issueName}.`
        : timeframe === '24h'
          ? `Check whether ${issueName} progression slows after the first treatment.`
          : `Track lesion spread and plant recovery for seven days after treating ${issueName}.`;
    case 'environmental':
      return timeframe === 'immediate'
        ? `Adjust ${issueName} toward the target range.`
        : timeframe === '24h'
          ? `Recheck ${issueName} within 24 hours to confirm the environment is stabilizing.`
          : `Log ${issueName} readings for seven days to confirm the correction holds.`;
    case 'analysis_response':
      return timeframe === 'immediate'
        ? 'Review the provider narrative before applying aggressive treatment.'
        : timeframe === '24h'
          ? 'Validate the diagnosis with a second observation set within 24 hours.'
          : 'Re-run the analysis within a week if symptoms remain unclear.';
    default:
      return timeframe === 'immediate'
        ? `Address ${issueName} based on the supporting evidence.`
        : timeframe === '24h'
          ? `Reassess ${issueName} within 24 hours to confirm the first intervention worked.`
          : `Track ${issueName} for seven days to confirm the plant is recovering.`;
  }
}

function buildIssueEvidence(
  directEvidence: string[],
  fallbackEvidence: string[],
  finalFallback: string
): string[] {
  const evidence = filterMeaningfulStrings(uniqStrings([...directEvidence, ...fallbackEvidence]));
  return evidence.length > 0 ? evidence : [finalFallback];
}

function validateExplainabilityContent(result: AnalysisRecord): string[] {
  const errors: string[] = [];

  if (!isMeaningfulText(result.diagnosis)) {
    errors.push('diagnosis is still generic');
  }

  if (normalizeUrgency(result.urgency, 'medium') !== 'low' && normalizeMeaningfulStringArray(result.urgencyReasons, []).length === 0) {
    errors.push('urgencyReasons are missing');
  }

  if (!Array.isArray(result.healthScoreBreakdown) || result.healthScoreBreakdown.length === 0) {
    errors.push('healthScoreBreakdown is missing');
  } else if (
    result.healthScoreBreakdown.some(
      (item: unknown) => !isRecord(item) || !isMeaningfulText(item.reason)
    )
  ) {
    errors.push('healthScoreBreakdown contains non-explainable entries');
  }

  if (!Array.isArray(result.detectedIssues) || result.detectedIssues.length === 0) {
    errors.push('detectedIssues are missing');
  } else if (
    result.detectedIssues.some(
      (item: unknown) =>
        !isRecord(item) ||
        !isMeaningfulText(item.name) ||
        !Array.isArray(item.evidence) ||
        filterMeaningfulStrings(item.evidence).length === 0
    )
  ) {
    errors.push('detectedIssues contain empty evidence');
  }

  const actionPlan = isRecord(result.prioritizedActionPlan) ? result.prioritizedActionPlan : {};
  const actionGroups = [
    actionPlan.immediate,
    actionPlan.within24Hours,
    actionPlan.within7Days
  ];
  if (actionGroups.some(group => !Array.isArray(group) || group.length === 0)) {
    errors.push('prioritizedActionPlan groups are incomplete');
  }

  return errors;
}

function normalizeIssue(value: unknown, fallbackEvidence: string[] = []): DetectedIssue | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = normalizeMeaningfulString(value.name || value.issue || value.title, '');
  if (!name) {
    return null;
  }

  const issue: DetectedIssue = {
    type: normalizeMeaningfulString(value.type, 'unknown'),
    name,
    severity: normalizeSeverity(value.severity, 'moderate'),
    confidence: clampScore(value.confidence, 0),
    evidence: buildIssueEvidence(
      filterMeaningfulStrings(collectStringValues(value.evidence)),
      fallbackEvidence,
      'Structured issue evidence was limited.'
    )
  };

  const parsed = DetectedIssueSchema.safeParse(issue);
  return parsed.success ? parsed.data : null;
}

function dedupeIssues(issues: DetectedIssue[]): DetectedIssue[] {
  const seen = new Set<string>();
  const deduped: DetectedIssue[] = [];

  issues.forEach(issue => {
    const key = `${issue.type}:${issue.name}`.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push({
      ...issue,
      evidence: uniqStrings(issue.evidence)
    });
  });

  return deduped;
}

function dedupeEnvironmentFactors(factors: EnvironmentRiskFactor[]): EnvironmentRiskFactor[] {
  const seen = new Set<string>();
  return factors.filter(factor => {
    const key = factor.factor.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function includesAction(usedActions: Set<string>, action: string): boolean {
  return usedActions.has(action.toLowerCase());
}

function countPresentEnvironmentalInputs(inputParameters?: Record<string, unknown>): number {
  if (!inputParameters) {
    return 0;
  }

  return ['phLevel', 'humidity', 'temperature', 'temperatureCelsius']
    .map(key => inputParameters[key])
    .filter(value => value !== undefined && value !== null && `${value}`.trim() !== '').length;
}

function parseTemperatureCelsius(inputParameters?: Record<string, unknown>): number | null {
  if (!inputParameters) {
    return null;
  }

  const directCelsius = parseNumber(inputParameters.temperatureCelsius);
  if (directCelsius !== null) {
    return directCelsius;
  }

  const temperature = parseNumber(inputParameters.temperature);
  if (temperature === null) {
    return null;
  }

  const unit = normalizeString(inputParameters.temperatureUnit, 'F').toUpperCase();
  if (unit === 'C') {
    return temperature;
  }

  return Math.round((((temperature - 32) * 5) / 9) * 10) / 10;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizePriority(value: unknown, fallback: number): number {
  const numeric = parseNumber(value);
  if (numeric === null) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
}

function normalizeUrgency(
  value: unknown,
  fallback: PlantAnalysisUrgency = 'medium'
): PlantAnalysisUrgency {
  const normalized = normalizeString(value, fallback).toLowerCase();

  if (normalized === 'critical') return 'critical';
  if (normalized === 'high' || normalized === 'severe') return 'high';
  if (normalized === 'low' || normalized === 'mild') return 'low';
  return 'medium';
}

function normalizeSeverity(
  value: unknown,
  fallback: PlantAnalysisSeverity = 'moderate'
): PlantAnalysisSeverity {
  const normalized = normalizeString(value, fallback).toLowerCase();

  if (normalized === 'none') return 'none';
  if (normalized === 'critical') return 'critical';
  if (normalized === 'severe' || normalized === 'high') return 'severe';
  if (normalized === 'mild' || normalized === 'low') return 'mild';
  if (normalized === 'medium') return 'moderate';
  if (normalized === 'moderate') return 'moderate';
  return fallback;
}

function urgencyRank(value: PlantAnalysisUrgency): number {
  switch (value) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

function clampScore(value: unknown, fallback = 0): number {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return Math.max(0, Math.min(100, Math.round(fallback)));
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function normalizeMeaningfulString(value: unknown, fallback = ''): string {
  const normalized = normalizeString(value, '');
  return isMeaningfulText(normalized) ? normalized : fallback;
}

function normalizeMeaningfulAction(value: unknown): string {
  const normalized = normalizeMeaningfulString(value, '');
  if (!normalized) {
    return '';
  }

  const comparison = toComparisonKey(normalized);
  return GENERIC_ACTION_PATTERNS.some(pattern => pattern.test(comparison)) ? '' : normalized;
}

function normalizeMeaningfulStringArray(value: unknown, fallback: string[] = []): string[] {
  const primary = filterMeaningfulStrings(normalizeStringArray(value, []));
  if (primary.length > 0) {
    return primary;
  }

  return filterMeaningfulStrings(fallback);
}

function isMeaningfulText(value: unknown): boolean {
  const normalized = normalizeString(value, '');
  if (!normalized) {
    return false;
  }

  const comparison = toComparisonKey(normalized);
  if (!comparison) {
    return false;
  }

  return !GENERIC_TEXT_PATTERNS.some(pattern => pattern.test(comparison));
}

function filterMeaningfulStrings(values: string[]): string[] {
  return uniqStrings(values.filter(value => isMeaningfulText(value)));
}

function summarizeNarrative(value?: string): string {
  if (!value) {
    return '';
  }

  const normalized = value
    .replace(/```(?:json)?/gi, ' ')
    .replace(/`/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const candidates = normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map(item => item.trim())
    .filter(Boolean);
  const summary = candidates.find(item => item.length >= 24 && !item.startsWith('{')) || normalized;
  return clipText(summary, 160);
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function toComparisonKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeMeaningfulString(value, '');
  return normalized || undefined;
}

function normalizeStringArray(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    return uniqStrings(value.flatMap(item => collectStringValues(item)));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return uniqStrings(fallback);
    }

    const delimiter = trimmed.includes('\n') ? /\n+/ : /\s*(?:;|\|)\s*/;
    const splitValues = trimmed.split(delimiter).map(item => item.trim()).filter(Boolean);
    return uniqStrings(splitValues.length > 1 ? splitValues : [trimmed]);
  }

  return uniqStrings(fallback);
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(item => collectStringValues(item));
  }

  if (isRecord(value)) {
    return Object.values(value).flatMap(item => collectStringValues(item));
  }

  return [];
}

function uniqStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  values.forEach(value => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      return;
    }
    seen.add(key);
    results.push(normalized);
  });

  return results;
}

function isRecord(value: unknown): value is AnalysisRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
