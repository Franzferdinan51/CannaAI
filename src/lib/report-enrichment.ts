/**
 * Production-Quality Report Enrichment Pass
 *
 * Provides detailed explanation enrichment for medium/high urgency analyses,
 * ensuring users receive comprehensive explanations of health score causes,
 * confidence drivers, evidence observations, and uncertainties.
 *
 * This module acts as a post-processing layer that guarantees rich, actionable
 * explanations regardless of AI model output quality.
 */

import type {
  PlantAnalysisApiResult,
  PlantAnalysisUrgency,
  PlantAnalysisSeverity,
  DetectedIssue,
  EnvironmentRiskFactor,
  HealthScoreBreakdownEntry,
  ConfidenceAssessment,
  FollowUpSchedule,
  Prognosis
} from '@/types/plant-analysis';

/**
 * Context for report enrichment
 */
export interface EnrichmentContext {
  analysis: PlantAnalysisApiResult;
  inputParameters?: Record<string, unknown>;
  imageAnalysis: boolean;
  processingTime: number;
  provider: string;
}

/**
 * Enriched report sections
 */
export interface EnrichedReportSections {
  confidenceAssessment: ConfidenceAssessment;
  followUpSchedule: FollowUpSchedule;
  prognosis: Prognosis;
  urgencyDeepDive: UrgencyDeepDive;
  healthScoreAnalysis: HealthScoreAnalysis;
  evidenceNarrative: EvidenceNarrative;
  uncertaintyAnalysis: UncertaintyAnalysis;
  recommendationRationale: RecommendationRationale;
}

export interface UrgencyDeepDive {
  urgencyLevel: PlantAnalysisUrgency;
  primaryDrivers: string[];
  contributingFactors: string[];
  escalationRisk: string;
  timeSensitivity: string;
  comparisonToBaseline: string;
}

export interface HealthScoreAnalysis {
  overallScore: number;
  scoreInterpretation: string;
  categoryAnalysis: HealthCategoryDetail[];
  biggestStrengths: string[];
  areasNeedingAttention: string[];
  scoreDrivers: ScoreDriver[];
}

export interface HealthCategoryDetail {
  category: string;
  score: number;
  interpretation: string;
  contributingFactors: string[];
  improvementSuggestions: string[];
}

export interface ScoreDriver {
  factor: string;
  impactOnScore: 'positive' | 'negative' | 'neutral';
  magnitude: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface EvidenceNarrative {
  keyFindings: string[];
  supportingObservations: string[];
  conflictingSignals: ConflictingSignal[];
  evidenceQuality: EvidenceQuality;
}

export interface ConflictingSignal {
  observation1: string;
  observation2: string;
  resolution: string;
}

export interface EvidenceQuality {
  overallQuality: 'high' | 'medium' | 'low';
  imageContribution: string;
  dataCompleteness: string;
  reliabilityFactors: string[];
}

export interface UncertaintyAnalysis {
  knownUnknowns: string[];
  dataGaps: string[];
  diagnosticLimitations: string[];
  confidenceReducingFactors: string[];
  additionalDataNeeded: string[];
}

export interface RecommendationRationale {
  immediate: RecommendationDetail[];
  shortTerm: RecommendationDetail[];
  longTerm: RecommendationDetail[];
  prioritizationLogic: string;
  expectedOutcomes: string[];
}

export interface RecommendationDetail {
  action: string;
  rationale: string;
  scientificBasis: string;
  alternativeApproaches: string[];
  successMetrics: string[];
}

/**
 * Urgency interpretation rules
 */
const URGENCY_INTERPRETATIONS: Record<PlantAnalysisUrgency, {
  label: string;
  responseTimeframe: string;
  riskDescription: string;
  escalationPotential: string;
}> = {
  low: {
    label: 'Routine Maintenance',
    responseTimeframe: 'Address at next scheduled maintenance',
    riskDescription: 'No acute threats detected; plant is within acceptable health parameters',
    escalationPotential: 'Low risk of rapid escalation; standard monitoring sufficient'
  },
  medium: {
    label: 'Scheduled Attention Needed',
    responseTimeframe: 'Address within 3-7 days',
    riskDescription: 'One or more issues detected that could worsen if left unaddressed',
    escalationPotential: 'Moderate risk - early intervention will prevent progression'
  },
  high: {
    label: 'Prompt Action Required',
    responseTimeframe: 'Act within 24-48 hours',
    riskDescription: 'Active issue(s) requiring intervention to prevent noticeable damage',
    escalationPotential: 'High risk of progression - delay may result in setbacks'
  },
  critical: {
    label: 'EMERGENCY INTERVENTION',
    responseTimeframe: 'ACT IMMEDIATELY - within hours',
    riskDescription: 'Plant health or survival at immediate risk',
    escalationPotential: 'Critical - rapid escalation likely without immediate action'
  }
};

/**
 * Health score interpretation
 */
function interpretHealthScore(score: number): {
  label: string;
  description: string;
  actionGuidance: string;
} {
  if (score >= 85) {
    return {
      label: 'Excellent Health',
      description: 'Plant is thriving with optimal vigor and no significant stressors',
      actionGuidance: 'Continue current cultivation practices; maintain monitoring routine'
    };
  }
  if (score >= 70) {
    return {
      label: 'Good Health',
      description: 'Plant is healthy with minor issues that do not significantly impact growth',
      actionGuidance: 'Address minor issues at next maintenance; overall approach is sound'
    };
  }
  if (score >= 55) {
    return {
      label: 'Fair Health - Attention Needed',
      description: 'Plant is experiencing moderate stress affecting performance',
      actionGuidance: 'Schedule targeted intervention within the week to address identified issues'
    };
  }
  if (score >= 40) {
    return {
      label: 'Poor Health - Action Required',
      description: 'Plant is under significant stress with multiple concerning indicators',
      actionGuidance: 'Implement corrective measures promptly to prevent further decline'
    };
  }
  return {
    label: 'Critical Health - Emergency',
    description: 'Plant is in severe distress requiring immediate intervention',
    actionGuidance: 'Execute emergency protocol immediately; plant survival may be at risk'
  };
}

/**
 * Main enrichment function - orchestrates all enrichment passes
 */
export function enrichReport(context: EnrichmentContext): EnrichedReportSections {
  const { analysis, inputParameters, imageAnalysis, provider } = context;

  return {
    confidenceAssessment: generateConfidenceAssessment(analysis, inputParameters, imageAnalysis, provider),
    followUpSchedule: generateFollowUpSchedule(analysis, inputParameters),
    prognosis: generatePrognosis(analysis, inputParameters),
    urgencyDeepDive: generateUrgencyDeepDive(analysis, inputParameters),
    healthScoreAnalysis: generateHealthScoreAnalysis(analysis, inputParameters),
    evidenceNarrative: generateEvidenceNarrative(analysis, inputParameters, imageAnalysis),
    uncertaintyAnalysis: generateUncertaintyAnalysis(analysis, inputParameters, imageAnalysis, provider),
    recommendationRationale: generateRecommendationRationale(analysis, inputParameters)
  };
}

/**
 * Generates comprehensive confidence assessment
 */
function generateConfidenceAssessment(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>,
  imageAnalysis: boolean = false,
  provider: string = 'unknown'
): ConfidenceAssessment {
  const drivers: string[] = [];
  const limitations: string[] = [];

  // Confidence drivers
  if (imageAnalysis) {
    drivers.push('Visual analysis performed on submitted image - direct symptom observation');
  }

  if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
    const highConfidenceIssues = analysis.detectedIssues.filter(i => (i.confidence || 0) >= 80);
    if (highConfidenceIssues.length > 0) {
      drivers.push(`${highConfidenceIssues.length} high-confidence finding(s) detected (>=80% confidence)`);
    }
  }

  if (analysis.confidence && analysis.confidence >= 85) {
    drivers.push('AI model expressed high confidence in primary diagnosis');
  }

  if (analysis.symptomsMatched && analysis.symptomsMatched.length >= 2) {
    drivers.push(`Multiple symptom patterns (${analysis.symptomsMatched.length}) corroborate diagnosis`);
  }

  // Check for specific diagnostic patterns
  const diagnosis = (analysis.diagnosis || '').toLowerCase();
  const classicPatterns = ['interveinal chlorosis', 'powdery mildew', 'nitrogen deficiency', 'magnesium deficiency'];
  if (classicPatterns.some(pattern => diagnosis.includes(pattern))) {
    drivers.push('Symptom pattern matches well-documented, classic presentation');
  }

  // Limitations
  if (!imageAnalysis) {
    limitations.push('No image provided - analysis based solely on text description');
  }

  if (!inputParameters?.phLevel) {
    limitations.push('pH level not provided - nutrient availability assessment is incomplete');
  }

  if (!inputParameters?.temperature && !inputParameters?.temperatureCelsius) {
    limitations.push('Temperature data missing - environmental stress evaluation limited');
  }

  if (!inputParameters?.humidity) {
    limitations.push('Humidity data missing - disease pressure assessment incomplete');
  }

  if (analysis.confidence && analysis.confidence < 75) {
    limitations.push(`Model confidence is moderate (${analysis.confidence}%) - some symptom overlap detected`);
  }

  if (analysis.uncertainties && analysis.uncertainties.length > 3) {
    limitations.push(`Multiple uncertainties noted (${analysis.uncertainties.length}) - diagnostic clarity reduced`);
  }

  // Calculate overall confidence
  let overallConfidence = analysis.confidence || 75;
  if (imageAnalysis) overallConfidence = Math.min(100, overallConfidence + 5);
  if (drivers.length >= 4) overallConfidence = Math.min(100, overallConfidence + 5);
  if (limitations.length >= 3) overallConfidence = Math.max(0, overallConfidence - 10);

  return {
    overall: Math.round(overallConfidence),
    drivers: drivers.length > 0 ? drivers : ['Analysis complete with standard diagnostic confidence'],
    limitations: limitations.length > 0 ? limitations : ['No significant limitations identified']
  };
}

/**
 * Generates detailed urgency deep dive
 */
function generateUrgencyDeepDive(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>
): UrgencyDeepDive {
  const urgency = analysis.urgency || 'medium';
  const interpretation = URGENCY_INTERPRETATIONS[urgency];

  const primaryDrivers: string[] = [];
  const contributingFactors: string[] = [];

  // Extract primary drivers from urgency reasons
  if (analysis.urgencyReasons && analysis.urgencyReasons.length > 0) {
    for (const reason of analysis.urgencyReasons.slice(0, 3)) {
      if (reason.length > 30) {
        primaryDrivers.push(reason);
      }
    }
  }

  // Add diagnosis-based drivers
  if (analysis.diagnosis) {
    const diagLower = analysis.diagnosis.toLowerCase();
    if (diagLower.includes('mildew') || diagLower.includes('rot') || diagLower.includes('blight')) {
      primaryDrivers.push(`Active pathogen detected: ${analysis.diagnosis}`);
    }
    if (diagLower.includes('pest') || diagLower.includes('mite') || diagLower.includes('aphid')) {
      primaryDrivers.push(`Active infestation: ${analysis.diagnosis}`);
    }
    if (diagLower.includes('deficiency') || diagLower.includes('toxicity')) {
      contributingFactors.push(`Nutrient imbalance affecting plant function`);
    }
  }

  // Add severity-based factors
  const severity = analysis.severity || 'moderate';
  if (['severe', 'critical'].includes(severity)) {
    contributingFactors.push(`Severity level (${severity}) indicates advanced condition`);
  }

  // Add detected issues as contributing factors
  if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
    for (const issue of analysis.detectedIssues.slice(0, 2)) {
      if (!primaryDrivers.some(d => d.includes(issue.name))) {
        contributingFactors.push(`${issue.name} (${issue.severity}) - ${issue.evidence?.[0] || 'detected in analysis'}`);
      }
    }
  }

  // Environmental factors
  if (analysis.environmentRiskAssessment?.contributingFactors) {
    for (const factor of analysis.environmentRiskAssessment.contributingFactors) {
      if (['high', 'critical'].includes(factor.riskLevel)) {
        contributingFactors.push(`${factor.factor}: ${factor.reason}`);
      }
    }
  }

  // Escalation risk
  const escalationRisk = severity === 'critical' || urgency === 'critical'
    ? 'IMMEDIATE action required - condition may cause irreversible damage within hours'
    : urgency === 'high'
      ? 'Prompt action needed - delay beyond 48 hours may cause significant setbacks'
      : urgency === 'medium'
        ? 'Early intervention recommended - condition may progress if unaddressed'
        : 'Stable condition - no acute escalation risk identified';

  return {
    urgencyLevel: urgency,
    primaryDrivers: primaryDrivers.length > 0 ? primaryDrivers : [interpretation.riskDescription],
    contributingFactors: contributingFactors.length > 0 ? contributingFactors : ['No additional contributing factors identified'],
    escalationRisk,
    timeSensitivity: interpretation.responseTimeframe,
    comparisonToBaseline: interpretation.escalationPotential
  };
}

/**
 * Generates comprehensive health score analysis
 */
function generateHealthScoreAnalysis(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>
): HealthScoreAnalysis {
  const overallScore = analysis.healthScore || 75;
  const interpretation = interpretHealthScore(overallScore);

  const categoryAnalysis: HealthCategoryDetail[] = [];
  const biggestStrengths: string[] = [];
  const areasNeedingAttention: string[] = [];
  const scoreDrivers: ScoreDriver[] = [];

  // Process health score breakdown
  const breakdown = analysis.healthScoreBreakdown || [];
  for (const entry of breakdown) {
    const category = typeof entry === 'object' && 'category' in entry
      ? (entry as HealthScoreBreakdownEntry).category
      : 'unknown';
    const score = typeof entry === 'object' && 'score' in entry
      ? (entry as HealthScoreBreakdownEntry).score
      : (typeof entry === 'number' ? entry : 75);
    const reason = typeof entry === 'object' && 'reason' in entry
      ? (entry as HealthScoreBreakdownEntry).reason
      : '';

    const categoryDetail: HealthCategoryDetail = {
      category,
      score,
      interpretation: getCategoryInterpretation(category, score),
      contributingFactors: reason ? [reason] : ['Estimated from overall assessment'],
      improvementSuggestions: getCategorySuggestions(category, score)
    };

    categoryAnalysis.push(categoryDetail);

    // Identify strengths and weaknesses
    if (score >= 80) {
      biggestStrengths.push(`${formatCategoryName(category)} is strong (${score}/100)`);
      scoreDrivers.push({
        factor: formatCategoryName(category),
        impactOnScore: 'positive',
        magnitude: score >= 90 ? 'high' : 'medium',
        explanation: `${category} score of ${score} positively impacts overall health`
      });
    } else if (score < 60) {
      areasNeedingAttention.push(`${formatCategoryName(category)} requires attention (${score}/100)`);
      scoreDrivers.push({
        factor: formatCategoryName(category),
        impactOnScore: 'negative',
        magnitude: score < 40 ? 'high' : 'medium',
        explanation: `${category} score of ${score} is reducing overall health assessment`
      });
    }
  }

  // Add diagnosis-based score drivers
  if (analysis.diagnosis) {
    scoreDrivers.push({
      factor: 'Primary Diagnosis',
      impactOnScore: 'negative',
      magnitude: analysis.urgency === 'critical' ? 'high' : 'medium',
      explanation: `Diagnosis of "${analysis.diagnosis}" indicates health challenges requiring attention`
    });
  }

  // Add issue-based score drivers
  if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
    const highSeverityIssues = analysis.detectedIssues.filter(i =>
      ['severe', 'critical'].includes(i.severity)
    );
    if (highSeverityIssues.length > 0) {
      scoreDrivers.push({
        factor: 'High-Severity Issues',
        impactOnScore: 'negative',
        magnitude: 'high',
        explanation: `${highSeverityIssues.length} high-severity issue(s) detected, significantly impacting health score`
      });
    }
  }

  return {
    overallScore,
    scoreInterpretation: interpretation.description,
    categoryAnalysis,
    biggestStrengths: biggestStrengths.length > 0 ? biggestStrengths : ['No exceptional strengths identified'],
    areasNeedingAttention: areasNeedingAttention.length > 0 ? areasNeedingAttention : ['No critical areas requiring immediate attention'],
    scoreDrivers
  };
}

function getCategoryInterpretation(category: string, score: number): string {
  const name = formatCategoryName(category);
  if (score >= 85) return `${name} is within optimal range - no action needed`;
  if (score >= 70) return `${name} shows minor issues but is acceptable`;
  if (score >= 55) return `${name} shows moderate issues requiring scheduled attention`;
  if (score >= 40) return `${name} shows significant issues needing prompt correction`;
  return `${name} is critically compromised - immediate intervention required`;
}

function getCategorySuggestions(category: string, score: number): string[] {
  const suggestions: string[] = [];
  const catLower = category.toLowerCase();

  if (catLower.includes('vigor')) {
    if (score < 70) {
      suggestions.push('Review feeding schedule and environmental conditions');
      suggestions.push('Consider root zone health assessment');
    } else {
      suggestions.push('Maintain current cultivation approach');
    }
  }

  if (catLower.includes('leaf')) {
    if (score < 70) {
      suggestions.push('Inspect leaves daily for symptom progression');
      suggestions.push('Review nutrient regimen for deficiencies or toxicities');
    } else {
      suggestions.push('Continue regular leaf inspection routine');
    }
  }

  if (catLower.includes('pest')) {
    if (score < 70) {
      suggestions.push('Implement integrated pest management protocol');
      suggestions.push('Increase inspection frequency to daily');
    } else {
      suggestions.push('Maintain preventive pest management practices');
    }
  }

  if (catLower.includes('environment')) {
    if (score < 70) {
      suggestions.push('Calibrate environmental controls');
      suggestions.push('Review temperature, humidity, and airflow parameters');
    } else {
      suggestions.push('Continue monitoring environmental stability');
    }
  }

  if (catLower.includes('root')) {
    if (score < 70) {
      suggestions.push('Check root zone for signs of rot or pathogens');
      suggestions.push('Review watering frequency and drainage');
    } else {
      suggestions.push('Maintain current root zone management');
    }
  }

  return suggestions.length > 0 ? suggestions : ['Continue current management practices'];
}

function formatCategoryName(category: string): string {
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace('Pest Free', 'Pest-Free Status')
    .replace('Leaf Condition', 'Leaf Health')
    .replace('Environment Optimal', 'Environmental Conditions')
    .replace('Growth Stage Appropriate', 'Growth Stage Alignment');
}

/**
 * Generates evidence narrative
 */
function generateEvidenceNarrative(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>,
  imageAnalysis: boolean = false
): EvidenceNarrative {
  const keyFindings: string[] = [];
  const supportingObservations: string[] = [];
  const conflictingSignals: ConflictingSignal[] = [];

  // Key findings from diagnosis and issues
  if (analysis.diagnosis) {
    keyFindings.push(`Primary diagnosis: ${analysis.diagnosis}`);
  }

  if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
    for (const issue of analysis.detectedIssues.slice(0, 3)) {
      keyFindings.push(`${issue.name} (${issue.severity}) - ${issue.evidence?.[0] || 'detected'}`);
    }
  }

  // Supporting observations
  if (analysis.evidenceObservations) {
    supportingObservations.push(...analysis.evidenceObservations.slice(0, 4));
  }

  if (analysis.symptomsMatched) {
    for (const symptom of analysis.symptomsMatched.slice(0, 3)) {
      if (!supportingObservations.includes(symptom)) {
        supportingObservations.push(`Observed symptom: ${symptom}`);
      }
    }
  }

  // Check for conflicting signals
  const severity = analysis.severity || 'moderate';
  const urgency = analysis.urgency || 'medium';

  if (severity === 'mild' && urgency === 'high') {
    conflictingSignals.push({
      observation1: `Severity assessed as ${severity}`,
      observation2: `Urgency rated as ${urgency}`,
      resolution: 'Urgency driven by factors beyond severity (e.g., rapid progression risk, pathogen presence)'
    });
  }

  if (analysis.confidence && analysis.confidence < 60 && analysis.urgency === 'critical') {
    conflictingSignals.push({
      observation1: `Low confidence in diagnosis (${analysis.confidence}%)`,
      observation2: 'Critical urgency assessment',
      resolution: 'Critical urgency reflects worst-case scenario planning despite diagnostic uncertainty'
    });
  }

  // Evidence quality assessment
  let overallQuality: 'high' | 'medium' | 'low' = 'medium';
  const reliabilityFactors: string[] = [];

  if (imageAnalysis) {
    overallQuality = 'high';
    reliabilityFactors.push('Visual confirmation of symptoms via image analysis');
  } else {
    reliabilityFactors.push('Text-based analysis only - no visual confirmation');
  }

  if (analysis.confidence && analysis.confidence >= 85) {
    reliabilityFactors.push('High model confidence supports reliability');
  }

  if (inputParameters && Object.keys(inputParameters).length >= 4) {
    reliabilityFactors.push('Comprehensive input data provided');
  } else {
    reliabilityFactors.push('Limited input data reduces assessment completeness');
    if (overallQuality === 'high') overallQuality = 'medium';
  }

  return {
    keyFindings,
    supportingObservations,
    conflictingSignals,
    evidenceQuality: {
      overallQuality,
      imageContribution: imageAnalysis
        ? 'Image analysis enabled direct visual symptom verification'
        : 'No image provided - relied on text descriptions only',
      dataCompleteness: inputParameters && Object.keys(inputParameters).length >= 5
        ? 'Comprehensive environmental and plant data provided'
        : 'Some environmental parameters missing, assessment partially complete',
      reliabilityFactors
    }
  };
}

/**
 * Generates uncertainty analysis
 */
function generateUncertaintyAnalysis(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>,
  imageAnalysis: boolean = false,
  provider: string = 'unknown'
): UncertaintyAnalysis {
  const knownUnknowns: string[] = [];
  const dataGaps: string[] = [];
  const diagnosticLimitations: string[] = [];
  const confidenceReducingFactors: string[] = [];
  const additionalDataNeeded: string[] = [];

  // Data gaps from missing inputs
  if (!inputParameters?.phLevel) {
    dataGaps.push('pH level not measured - nutrient availability uncertain');
    additionalDataNeeded.push('pH of water input and runoff');
  }

  if (!inputParameters?.temperature && !inputParameters?.temperatureCelsius) {
    dataGaps.push('Temperature data not provided');
    additionalDataNeeded.push('Current ambient and root zone temperature');
  }

  if (!inputParameters?.humidity) {
    dataGaps.push('Humidity data not provided');
    additionalDataNeeded.push('Relative humidity measurement');
  }

  if (!imageAnalysis) {
    dataGaps.push('No image provided for visual verification');
    additionalDataNeeded.push('Clear, well-lit photographs of affected plant parts');
  }

  // Diagnostic limitations
  diagnosticLimitations.push('Remote analysis cannot assess root health directly');
  diagnosticLimitations.push('Cannot verify pest presence without visual inspection');
  diagnosticLimitations.push('Symptom progression timeline unknown without historical data');

  // Known unknowns from analysis
  if (analysis.uncertainties) {
    knownUnknowns.push(...analysis.uncertainties.slice(0, 3));
  }

  // Confidence reducing factors
  if (analysis.confidence && analysis.confidence < 75) {
    confidenceReducingFactors.push(`Model confidence is ${analysis.confidence}%`);
  }

  if (analysis.detectedIssues && analysis.detectedIssues.length > 1) {
    const confidences = analysis.detectedIssues.map(i => i.confidence || 0);
    const minConf = Math.min(...confidences);
    const maxConf = Math.max(...confidences);
    if (maxConf - minConf > 30) {
      confidenceReducingFactors.push(`Wide confidence range across findings (${minConf}%-${maxConf}%)`);
    }
  }

  return {
    knownUnknowns: knownUnknowns.length > 0 ? knownUnknowns : ['No specific uncertainties flagged by analysis'],
    dataGaps,
    diagnosticLimitations,
    confidenceReducingFactors: confidenceReducingFactors.length > 0 ? confidenceReducingFactors : ['No significant confidence-reducing factors'],
    additionalDataNeeded
  };
}

/**
 * Generates follow-up schedule
 */
function generateFollowUpSchedule(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>
): FollowUpSchedule {
  const urgency = analysis.urgency || 'medium';

  // Default schedules based on urgency
  const schedules: Record<PlantAnalysisUrgency, FollowUpSchedule> = {
    low: {
      checkAfterDays: 7,
      whatToMonitor: ['Overall plant vigor', 'New growth development', 'Environmental stability'],
      successIndicators: ['Continued healthy growth', 'No new symptoms'],
      escalationTriggers: ['New symptoms appear', 'Existing symptoms worsen noticeably']
    },
    medium: {
      checkAfterDays: 3,
      whatToMonitor: ['Symptom progression', 'Response to any interventions', 'New growth quality'],
      successIndicators: ['Symptoms stop spreading', 'New growth appears healthy'],
      escalationTriggers: ['Symptoms accelerate', 'Multiple new symptoms develop']
    },
    high: {
      checkAfterDays: 1,
      whatToMonitor: ['Treatment response', 'Symptom spread rate', 'Overall plant demeanor'],
      successIndicators: ['Treatment halts progression', 'Plant shows improved vigor'],
      escalationTriggers: ['Rapid symptom spread', 'Plant shows signs of systemic decline']
    },
    critical: {
      checkAfterDays: 0,
      whatToMonitor: ['Immediate treatment response', 'Signs of recovery or decline', 'Systemic symptoms'],
      successIndicators: ['Stabilization within 24 hours', 'Visible improvement after treatment'],
      escalationTriggers: ['No response to emergency treatment', 'Rapid decline continues']
    }
  };

  const baseSchedule = schedules[urgency];

  // Customize based on diagnosis
  const diagnosis = (analysis.diagnosis || '').toLowerCase();
  if (diagnosis.includes('mildew') || diagnosis.includes('rot') || diagnosis.includes('blight')) {
    baseSchedule.whatToMonitor.push('Pathogen spread indicators');
    baseSchedule.escalationTriggers.unshift('Visible pathogen spread');
  }

  if (diagnosis.includes('pest') || diagnosis.includes('mite')) {
    baseSchedule.whatToMonitor.push('Pest population levels', 'New damage patterns');
    baseSchedule.escalationTriggers.unshift('Pest population increases');
  }

  if (diagnosis.includes('deficiency')) {
    baseSchedule.whatToMonitor.push('New leaf coloration', 'Treatment uptake signs');
    baseSchedule.successIndicators.unshift('New growth shows normal coloration');
  }

  return baseSchedule;
}

/**
 * Generates prognosis
 */
function generatePrognosis(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>
): Prognosis {
  const healthScore = analysis.healthScore || 75;
  const urgency = analysis.urgency || 'medium';
  const diagnosis = analysis.diagnosis || 'Plant health concern';

  // Base prognosis on health score and urgency
  let expectedOutcome: string;
  let timeframe: string;
  let fullRecoveryExpected: boolean;

  if (healthScore >= 70 && urgency !== 'critical') {
    expectedOutcome = 'Full recovery expected with appropriate intervention';
    timeframe = '1-2 weeks for visible improvement, 3-4 weeks for full recovery';
    fullRecoveryExpected = true;
  } else if (healthScore >= 50) {
    expectedOutcome = 'Good recovery likely with consistent treatment adherence';
    timeframe = '2-3 weeks for noticeable improvement, 4-6 weeks for full recovery';
    fullRecoveryExpected = true;
  } else if (healthScore >= 30) {
    expectedOutcome = 'Recovery possible but will require aggressive intervention';
    timeframe = '3-4 weeks for stabilization, 6-8 weeks for significant recovery';
    fullRecoveryExpected = urgency !== 'critical';
  } else {
    expectedOutcome = 'Guarded prognosis - plant survival depends on immediate aggressive action';
    timeframe = '24-48 hours critical for stabilization';
    fullRecoveryExpected = false;
  }

  // Adjust based on diagnosis type
  const diagLower = diagnosis.toLowerCase();
  if (diagLower.includes('mildew') || diagLower.includes('rot')) {
    expectedOutcome = 'Pathogen can be managed with prompt treatment; damaged tissue will not recover';
    fullRecoveryExpected = urgency !== 'critical';
  }

  if (diagLower.includes('deficiency')) {
    expectedOutcome = 'Full recovery expected once nutrient balance is restored; existing damage will not reverse';
    timeframe = '3-5 days to halt progression, 2-3 weeks for new healthy growth';
    fullRecoveryExpected = true;
  }

  // Factors affecting outcome
  const factorsAffectingOutcome: string[] = [];

  if (inputParameters?.phLevel) {
    factorsAffectingOutcome.push('pH management will affect nutrient availability');
  }

  if (inputParameters?.temperature || inputParameters?.temperatureCelsius) {
    factorsAffectingOutcome.push('Temperature stability affects recovery rate');
  }

  factorsAffectingOutcome.push('Treatment adherence and timing');
  factorsAffectingOutcome.push('Overall plant vigor and genetics');

  if (urgency === 'critical') {
    factorsAffectingOutcome.unshift('Speed of emergency intervention is critical');
  }

  return {
    expectedOutcome,
    timeframe,
    factorsAffectingOutcome,
    fullRecoveryExpected
  };
}

/**
 * Generates recommendation rationale
 */
function generateRecommendationRationale(
  analysis: PlantAnalysisApiResult,
  inputParameters?: Record<string, unknown>
): RecommendationRationale {
  const immediate: RecommendationDetail[] = [];
  const shortTerm: RecommendationDetail[] = [];
  const longTerm: RecommendationDetail[] = [];

  // Process recommendations from analysis
  const recs = analysis.recommendations;

  if (recs?.immediate) {
    for (const rec of recs.immediate.slice(0, 3)) {
      const action = typeof rec === 'string' ? rec : rec.action || 'See details';
      immediate.push({
        action,
        rationale: getRecommendationRationale(action, 'immediate', analysis),
        scientificBasis: getScientificBasis(action, analysis),
        alternativeApproaches: getAlternativeApproaches(action),
        successMetrics: getSuccessMetrics(action, 'immediate')
      });
    }
  }

  if (recs?.shortTerm) {
    for (const rec of recs.shortTerm.slice(0, 3)) {
      const action = typeof rec === 'string' ? rec : rec.action || 'See details';
      shortTerm.push({
        action,
        rationale: getRecommendationRationale(action, 'shortTerm', analysis),
        scientificBasis: getScientificBasis(action, analysis),
        alternativeApproaches: getAlternativeApproaches(action),
        successMetrics: getSuccessMetrics(action, 'shortTerm')
      });
    }
  }

  if (recs?.longTerm) {
    for (const rec of recs.longTerm.slice(0, 3)) {
      const action = typeof rec === 'string' ? rec : rec.action || 'See details';
      longTerm.push({
        action,
        rationale: getRecommendationRationale(action, 'longTerm', analysis),
        scientificBasis: getScientificBasis(action, analysis),
        alternativeApproaches: getAlternativeApproaches(action),
        successMetrics: getSuccessMetrics(action, 'longTerm')
      });
    }
  }

  // Generate prioritization logic
  const prioritizationLogic = generatePrioritizationLogic(analysis);

  // Expected outcomes
  const expectedOutcomes = generateExpectedOutcomes(analysis);

  return {
    immediate,
    shortTerm,
    longTerm,
    prioritizationLogic,
    expectedOutcomes
  };
}

function getRecommendationRationale(action: string, timeframe: string, analysis: PlantAnalysisApiResult): string {
  const actionLower = action.toLowerCase();
  const diagnosis = (analysis.diagnosis || '').toLowerCase();

  if (timeframe === 'immediate') {
    if (actionLower.includes('epsom') || actionLower.includes('magnesium')) {
      return 'Magnesium is a mobile nutrient; foliar application provides fastest correction for deficiency symptoms';
    }
    if (actionLower.includes('flush')) {
      return 'Flushing removes excess salts and resets root zone pH, addressing potential nutrient lockout';
    }
    if (actionLower.includes('isolate') || actionLower.includes('remove')) {
      return 'Immediate isolation prevents spread of pathogens or pests to other plants';
    }
    if (actionLower.includes('ph')) {
      return 'pH directly affects nutrient availability; correction is prerequisite to addressing deficiencies';
    }
    return 'Immediate action addresses the most critical aspect of the identified issue';
  }

  if (timeframe === 'shortTerm') {
    if (actionLower.includes('monitor') || actionLower.includes('check')) {
      return 'Regular monitoring enables early detection of treatment effectiveness or need for adjustment';
    }
    if (actionLower.includes('supplement')) {
      return 'Consistent supplementation maintains therapeutic nutrient levels during recovery';
    }
    return 'Short-term actions consolidate gains from immediate interventions and prevent regression';
  }

  // Long-term
  if (actionLower.includes('schedule') || actionLower.includes('routine')) {
    return 'Establishing consistent routines prevents recurrence and enables early problem detection';
  }
  if (actionLower.includes('document') || actionLower.includes('journal')) {
    return 'Documentation enables pattern recognition and continuous improvement of cultivation practices';
  }
  return 'Long-term actions build resilience and prevent future occurrences';
}

function getScientificBasis(action: string, analysis: PlantAnalysisApiResult): string {
  const diagnosis = (analysis.diagnosis || '').toLowerCase();

  if (diagnosis.includes('magnesium')) {
    return 'Magnesium is the central atom in chlorophyll molecules; deficiency directly impairs photosynthesis';
  }
  if (diagnosis.includes('nitrogen')) {
    return 'Nitrogen is essential for amino acid and protein synthesis; mobile in plant tissue';
  }
  if (diagnosis.includes('phosphorus')) {
    return 'Phosphorus is critical for energy transfer (ATP) and root development';
  }
  if (diagnosis.includes('potassium')) {
    return 'Potassium regulates stomatal function and enzyme activation';
  }
  if (diagnosis.includes('mildew') || diagnosis.includes('fung')) {
    return 'Fungal pathogens reproduce via spores; early intervention prevents exponential spread';
  }
  if (diagnosis.includes('pest')) {
    return 'Pest populations can grow exponentially; early control prevents infestation';
  }

  return 'Based on established plant physiology and pathology principles';
}

function getAlternativeApproaches(action: string): string[] {
  const actionLower = action.toLowerCase();
  const alternatives: string[] = [];

  if (actionLower.includes('epsom')) {
    alternatives.push('Calcium-magnesium (Cal-Mag) supplement as soil drench');
    alternatives.push('Magnesium sulfate foliar spray at 2% solution');
  }

  if (actionLower.includes('flush')) {
    alternatives.push('pH-adjusted water at 2-3x container volume');
    alternatives.push('Enzyme flush treatment for root zone reset');
  }

  if (actionLower.includes('neem') || actionLower.includes('soap')) {
    alternatives.push('Insecticidal soap at 2-3% solution');
    alternatives.push('Spinosad-based treatment for resistant pests');
    alternatives.push('Predatory insect introduction (biological control)');
  }

  if (actionLower.includes('mildew') || actionLower.includes('fung')) {
    alternatives.push('Potassium bicarbonate spray');
    alternatives.push('Biological fungicide (Bacillus subtilis)');
    alternatives.push('Sulfur-based treatment (not during flowering)');
  }

  return alternatives.length > 0 ? alternatives : ['Consult cultivation guide for alternative approaches'];
}

function getSuccessMetrics(action: string, timeframe: string): string[] {
  const metrics: string[] = [];

  if (timeframe === 'immediate') {
    metrics.push('Treatment applied correctly and completely');
    metrics.push('No adverse reaction within 24 hours');
  }

  if (timeframe === 'shortTerm') {
    metrics.push('Symptom progression halts');
    metrics.push('New growth appears healthy');
    metrics.push('Environmental parameters stable');
  }

  if (timeframe === 'longTerm') {
    metrics.push('Full recovery with healthy new growth');
    metrics.push('No recurrence of symptoms');
    metrics.push('Plant vigor restored');
  }

  return metrics;
}

function generatePrioritizationLogic(analysis: PlantAnalysisApiResult): string {
  const urgency = analysis.urgency || 'medium';
  const severity = analysis.severity || 'moderate';

  const logicParts: string[] = [];

  // Urgency-based prioritization
  if (urgency === 'critical') {
    logicParts.push('Emergency protocol activated - all other priorities superseded by immediate survival needs');
  } else if (urgency === 'high') {
    logicParts.push('Prompt action prioritized to prevent irreversible damage within 48-hour window');
  } else if (urgency === 'medium') {
    logicParts.push('Scheduled intervention to prevent progression while avoiding unnecessary stress');
  }

  // Severity consideration
  if (['severe', 'critical'].includes(severity)) {
    logicParts.push(`Severity level (${severity}) indicates advanced condition requiring aggressive response`);
  }

  // Issue-based prioritization
  if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
    const pathogens = analysis.detectedIssues.filter(i => i.type === 'disease');
    const pests = analysis.detectedIssues.filter(i => i.type === 'pest');
    const deficiencies = analysis.detectedIssues.filter(i => i.type === 'nutrient_deficiency');

    if (pathogens.length > 0) {
      logicParts.push('Pathogen issues prioritized due to exponential reproduction potential');
    }
    if (pests.length > 0) {
      logicParts.push('Pest issues addressed early to prevent population explosion');
    }
    if (deficiencies.length > 0) {
      logicParts.push('Nutrient issues addressed through supplementation after ruling out lockout');
    }
  }

  return logicParts.join('. ');
}

function generateExpectedOutcomes(analysis: PlantAnalysisApiResult): string[] {
  const outcomes: string[] = [];
  const diagnosis = (analysis.diagnosis || '').toLowerCase();

  // General outcomes
  outcomes.push('Stabilization of current symptoms within 3-5 days');
  outcomes.push('Visible improvement in new growth within 7-10 days');

  // Diagnosis-specific outcomes
  if (diagnosis.includes('deficiency')) {
    outcomes.push('Existing damaged tissue will not recover but will not spread');
    outcomes.push('New growth will display normal coloration after treatment');
  }

  if (diagnosis.includes('mildew') || diagnosis.includes('fung')) {
    outcomes.push('Pathogen spread halted within 48-72 hours');
    outcomes.push('Existing lesions will not heal but will not expand');
  }

  if (diagnosis.includes('pest')) {
    outcomes.push('Pest population reduction visible within 3-5 days');
    outcomes.push('New damage prevented with consistent treatment');
  }

  return outcomes;
}

/**
 * Validates that enriched report meets quality thresholds
 */
export function validateEnrichedReport(sections: EnrichedReportSections): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Validate confidence assessment
  if (sections.confidenceAssessment.drivers.length === 0) {
    issues.push('Confidence assessment missing drivers');
  }

  // Validate urgency deep dive
  if (sections.urgencyDeepDive.primaryDrivers.length === 0) {
    issues.push('Urgency deep dive missing primary drivers');
  }

  // Validate health score analysis
  if (sections.healthScoreAnalysis.categoryAnalysis.length === 0) {
    issues.push('Health score analysis missing category breakdown');
  }

  // Validate evidence narrative
  if (sections.evidenceNarrative.keyFindings.length === 0) {
    issues.push('Evidence narrative missing key findings');
  }

  // Validate uncertainty analysis
  if (sections.uncertaintyAnalysis.dataGaps.length === 0 &&
      sections.uncertaintyAnalysis.diagnosticLimitations.length === 0) {
    issues.push('Uncertainty analysis should identify at least some limitations');
  }

  // Validate recommendation rationale
  if (sections.recommendationRationale.immediate.length === 0 &&
      sections.recommendationRationale.shortTerm.length === 0) {
    issues.push('Recommendation rationale should have at least some recommendations');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Merges enriched report sections with existing analysis
 */
export function mergeEnrichmentWithAnalysis(
  analysis: PlantAnalysisApiResult,
  enriched: EnrichedReportSections
): PlantAnalysisApiResult {
  return {
    ...analysis,
    confidenceAssessment: enriched.confidenceAssessment,
    followUpSchedule: enriched.followUpSchedule,
    prognosis: enriched.prognosis,
    urgencyDeepDive: enriched.urgencyDeepDive,
    healthScoreAnalysis: enriched.healthScoreAnalysis,
    evidenceNarrative: enriched.evidenceNarrative,
    uncertaintyAnalysis: enriched.uncertaintyAnalysis,
    recommendationRationale: enriched.recommendationRationale
  };
}
