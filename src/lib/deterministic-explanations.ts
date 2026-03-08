/**
 * Deterministic Explanation Rules for Plant Health Analysis
 *
 * Provides rule-based fallback explanations for urgency levels and health scores
 * to ensure responses always include explicit 'why' details even when AI model
 * output is vague or missing required fields.
 *
 * This module acts as a post-processing safety net that maintains backward
 * compatibility while guaranteeing explainability.
 */

import type {
  PlantAnalysisUrgency,
  PlantAnalysisSeverity,
  DetectedIssue,
  EnvironmentRiskFactor,
  HealthScoreBreakdownEntry
} from '../types/plant-analysis';

/**
 * Input context for generating deterministic explanations
 */
export interface ExplanationContext {
  // Core analysis fields
  diagnosis?: string;
  confidence?: number;
  severity?: PlantAnalysisSeverity;
  healthScore?: number;
  urgency?: PlantAnalysisUrgency;

  // Detected issues
  detectedIssues?: DetectedIssue[];
  likelyCauses?: Array<{ cause: string; confidence: number; evidence?: string }>;

  // Environmental factors
  environmentalFactors?: EnvironmentRiskFactor[];

  // Existing explanations (may be empty/vague)
  urgencyReasons?: string[];
  healthScoreBreakdown?: HealthScoreBreakdownEntry[] | Record<string, number>;
  evidenceObservations?: string[];
  uncertainties?: string[];

  // Metadata
  hasImage?: boolean;
  provider?: string;
  inputParameters?: Record<string, unknown>;
}

/**
 * Generated deterministic explanations
 */
export interface DeterministicExplanations {
  urgencyReasons: string[];
  healthScoreBreakdown: HealthScoreBreakdownEntry[];
  evidenceObservations: string[];
  uncertainties: string[];
  appliedRules: string[];
}

/**
 * Urgency explanation rules - maps urgency levels to deterministic reasons
 */
const URGENCY_RULES: Record<PlantAnalysisUrgency, {
  baseReasons: string[];
  severityModifiers: Record<NonNullable<PlantAnalysisSeverity>, string[]>;
  issueTypeRules: Record<string, string>;
}> = {
  low: {
    baseReasons: [
      'No acute stressors or threats detected in the analysis',
      'Plant appears to be within acceptable health parameters',
      'Standard maintenance schedule is sufficient'
    ],
    severityModifiers: {
      none: ['No significant issues requiring attention'],
      mild: ['Minor issues present but not urgent - address at next maintenance'],
      moderate: ['Moderate issues detected but stable - monitor for changes'],
      severe: ['Severe rating noted but urgency assessed as low based on overall context'],
      critical: ['Critical rating detected - urgency upgraded from low assessment']
    },
    issueTypeRules: {
      pest: 'Low pest pressure or no pests detected',
      disease: 'No active disease progression observed',
      nutrient_deficiency: 'Minor nutrient imbalance not requiring immediate intervention',
      nutrient_toxicity: 'Nutrient levels elevated but not at toxic thresholds',
      environmental: 'Environmental parameters within acceptable ranges'
    }
  },
  medium: {
    baseReasons: [
      'One or more issues require attention within the week',
      'Conditions may worsen if left unaddressed',
      'Proactive intervention will prevent escalation'
    ],
    severityModifiers: {
      none: ['Preventive monitoring recommended despite no critical issues'],
      mild: ['Mild symptoms present - early intervention recommended'],
      moderate: ['Moderate severity issues need scheduled attention'],
      severe: ['Severe issues present - prioritize within weekly maintenance'],
      critical: ['Critical elements detected - ensure weekly attention minimum']
    },
    issueTypeRules: {
      pest: 'Early-stage pest activity detected - treatment recommended this week',
      disease: 'Disease indicators present - monitoring and possible treatment needed',
      nutrient_deficiency: 'Nutrient deficiency affecting plant performance - supplement soon',
      nutrient_toxicity: 'Nutrient buildup detected - flushing recommended within the week',
      environmental: 'Environmental stress factors present - adjustment needed'
    }
  },
  high: {
    baseReasons: [
      'Active issue(s) requiring intervention within 24-48 hours',
      'Delay may result in noticeable plant damage or stress',
      'Multiple concerning indicators present simultaneously'
    ],
    severityModifiers: {
      none: ['High urgency driven by risk factors despite no severity rating'],
      mild: ['Mild symptoms but high-risk context requires prompt action'],
      moderate: ['Moderate severity with concerning progression indicators'],
      severe: ['Severe issues demand rapid response to limit damage'],
      critical: ['Critical elements present - immediate attention required']
    },
    issueTypeRules: {
      pest: 'Active pest infestation - treatment needed within 48 hours',
      disease: 'Disease progression risk - intervention needed promptly',
      nutrient_deficiency: 'Significant deficiency impacting plant health - correct immediately',
      nutrient_toxicity: 'Toxic nutrient levels causing damage - flush and adjust urgently',
      environmental: 'Environmental conditions hostile - immediate correction needed'
    }
  },
  critical: {
    baseReasons: [
      'IMMEDIATE intervention required to prevent plant loss',
      'Rapidly escalating condition threatens plant survival',
      'Multiple critical failure indicators detected'
    ],
    severityModifiers: {
      none: ['Critical urgency despite missing severity rating - act immediately'],
      mild: ['Critical urgency overrides mild severity - do not delay'],
      moderate: ['Critical urgency with moderate severity - escalation risk is high'],
      severe: ['Critical urgency with severe issues - maximum response needed'],
      critical: ['Critical severity confirmed - emergency intervention required']
    },
    issueTypeRules: {
      pest: 'CRITICAL: Severe pest damage or rapid infestation - act NOW',
      disease: 'CRITICAL: Advanced disease or pathogen spread imminent - emergency treatment',
      nutrient_deficiency: 'CRITICAL: Severe deficiency causing irreversible damage risk',
      nutrient_toxicity: 'CRITICAL: Toxic overdose causing system failure - flush immediately',
      environmental: 'CRITICAL: Environmental conditions lethal - correct immediately'
    }
  }
};

/**
 * Health score category rules - deterministic scoring logic
 */
const HEALTH_CATEGORIES = [
  { key: 'vigor', label: 'Overall Vigor', baseWeight: 1.0 },
  { key: 'leafCondition', label: 'Leaf Condition', baseWeight: 1.2 },
  { key: 'pestFree', label: 'Pest-Free Status', baseWeight: 1.0 },
  { key: 'environmentOptimal', label: 'Environment Optimization', baseWeight: 0.9 },
  { key: 'growthStageAppropriate', label: 'Growth Stage Appropriateness', baseWeight: 0.8 },
  { key: 'rootHealth', label: 'Root Health', baseWeight: 1.1 }
] as const;

/**
 * Applies deterministic explanation rules as a fallback/augmentation layer.
 *
 * This function ensures that urgency reasons and health score breakdown
 * always contain meaningful, explicit 'why' explanations even when the
 * AI model output is vague, incomplete, or missing these fields.
 *
 * @param context - The analysis context including parsed AI results and inputs
 * @returns Deterministic explanations with applied rules
 */
export function applyDeterministicExplanations(
  context: ExplanationContext
): DeterministicExplanations {
  const appliedRules: string[] = [];

  // Generate urgency reasons using rule-based system
  const urgencyReasons = generateUrgencyReasons(context, appliedRules);

  // Generate health score breakdown using deterministic rules
  const healthScoreBreakdown = generateHealthScoreBreakdown(context, appliedRules);

  // Generate evidence observations from available data
  const evidenceObservations = generateEvidenceObservations(context, appliedRules);

  // Generate uncertainties based on missing/vague data
  const uncertainties = generateUncertainties(context, appliedRules);

  return {
    urgencyReasons,
    healthScoreBreakdown,
    evidenceObservations,
    uncertainties,
    appliedRules
  };
}

/**
 * Generates urgency reasons using deterministic rules.
 * Combines base rules with issue-specific and severity-modified explanations.
 */
function generateUrgencyReasons(
  context: ExplanationContext,
  appliedRules: string[]
): string[] {
  const urgency = context.urgency || 'medium';
  const severity = context.severity || 'moderate';
  const rules = URGENCY_RULES[urgency];
  const reasons: string[] = [];

  // Rule 1: Always include base reasons for the urgency level
  reasons.push(...rules.baseReasons);
  appliedRules.push(`urgency-base-${urgency}`);

  // Rule 2: Add severity modifier if severity is provided
  const severityMod = rules.severityModifiers[severity as keyof typeof rules.severityModifiers];
  if (severityMod) {
    reasons.push(...severityMod);
    appliedRules.push(`urgency-severity-${urgency}-${severity}`);
  }

  // Rule 3: Add issue-type-specific reasons for detected issues
  const issues = context.detectedIssues || [];
  const issueTypeReasons: string[] = [];

  for (const issue of issues.slice(0, 3)) {
    const ruleKey = issue.type;
    if (rules.issueTypeRules[ruleKey]) {
      issueTypeReasons.push(rules.issueTypeRules[ruleKey]);
      appliedRules.push(`urgency-issue-${ruleKey}`);
    } else if (issue.name && issue.severity !== 'none') {
      // Generic rule for unknown issue types
      issueTypeReasons.push(
        `${issue.name} (${issue.severity}) contributes to ${urgency} urgency level`
      );
      appliedRules.push(`urgency-issue-generic`);
    }
  }

  if (issueTypeReasons.length > 0) {
    reasons.push(...uniq(issueTypeReasons));
  }

  // Rule 4: If confidence is low, add uncertainty-based urgency reason
  const confidence = context.confidence ?? 75;
  if (confidence < 70 && urgency !== 'low') {
    reasons.push(
      `Lower confidence (${confidence}%) increases urgency to ensure issues are not overlooked`
    );
    appliedRules.push('urgency-confidence-adjustment');
  }

  // Rule 5: If existing urgency reasons are vague, replace with deterministic ones
  const existingReasons = context.urgencyReasons || [];
  const hasVagueExisting = existingReasons.some(
    r => r.length < 20 || r.toLowerCase().includes('ai') || r.toLowerCase().includes('model')
  );

  if (hasVagueExisting && reasons.length < existingReasons.length) {
    // Keep specific existing reasons, supplement with deterministic
    const specificExisting = existingReasons.filter(
      r => r.length >= 20 && !r.toLowerCase().includes('ai') && !r.toLowerCase().includes('model')
    );
    reasons.unshift(...specificExisting.slice(0, 2));
    appliedRules.push('urgency-merge-existing');
  }

  return uniq(reasons).slice(0, 6);
}

/**
 * Generates health score breakdown using deterministic rules based on
 * overall health score, detected issues, and environmental factors.
 */
function generateHealthScoreBreakdown(
  context: ExplanationContext,
  appliedRules: string[]
): HealthScoreBreakdownEntry[] {
  const overallScore = context.healthScore ?? 75;
  const issues = context.detectedIssues || [];
  const envFactors = context.environmentalFactors || [];
  const breakdown: HealthScoreBreakdownEntry[] = [];

  // Rule 1: Base score derivation from overall health score
  for (const category of HEALTH_CATEGORIES) {
    let score = Math.round(overallScore * category.baseWeight);
    let reason = `Derived from overall health score (${overallScore}) with ${category.key} weighting`;
    const modifiers: string[] = [];

    // Rule 2: Apply issue-based penalties
    const relevantIssues = issues.filter(issue => {
      const typeKey = issue.type.toLowerCase();
      const nameKey = issue.name.toLowerCase();

      switch (category.key) {
        case 'vigor':
          return true; // All issues affect vigor
        case 'leafCondition':
          return typeKey.includes('nutrient') || nameKey.includes('leaf') || nameKey.includes('spot');
        case 'pestFree':
          return typeKey.includes('pest');
        case 'environmentOptimal':
          return typeKey.includes('environmental') || typeKey.includes('disease');
        case 'growthStageAppropriate':
          return false; // Not directly affected by issues
        case 'rootHealth':
          return nameKey.includes('root') || typeKey.includes('nutrient');
        default:
          return false;
      }
    });

    if (relevantIssues.length > 0) {
      const penalty = Math.min(30, relevantIssues.length * 10);
      score -= penalty;
      modifiers.push(`${relevantIssues.length} ${category.key}-related issue(s) detected`);
      appliedRules.push(`health-${category.key}-issue-penalty`);
    }

    // Rule 3: Apply environmental factor penalties
    if (category.key === 'environmentOptimal' && envFactors.length > 0) {
      const envPenalty = Math.min(25, envFactors.length * 8);
      score -= envPenalty;
      modifiers.push(`${envFactors.length} suboptimal environmental factor(s)`);
      appliedRules.push('health-environment-factor-penalty');
    }

    // Rule 4: Clamp score to valid range
    score = Math.max(0, Math.min(100, score));

    // Rule 5: Generate explanatory reason
    const baseReason = category.key === 'pestFree'
      ? (relevantIssues.length > 0
          ? `Pest findings detected, reducing score from ${overallScore} to ${score}`
          : 'No pest issues detected, score reflects overall plant health')
      : modifiers.length > 0
        ? `${modifiers.join('; ')}, adjusted score: ${score}`
        : reason;

    breakdown.push({
      category: category.key,
      score,
      reason: baseReason
    });

    appliedRules.push(`health-${category.key}-base`);
  }

  // Rule 6: If input parameters suggest specific issues, add targeted adjustments
  const inputs = context.inputParameters || {};
  if (inputs.phLevel) {
    const ph = Number(inputs.phLevel);
    if (ph < 6 || ph > 7) {
      const envEntry = breakdown.find(b => b.category === 'environmentOptimal');
      if (envEntry) {
        envEntry.score = Math.max(0, envEntry.score - 10);
        envEntry.reason += `; pH level (${ph}) outside optimal range (6.0-7.0)`;
        appliedRules.push('health-ph-adjustment');
      }
    }
  }

  return breakdown;
}

/**
 * Generates evidence observations from available analysis data.
 */
function generateEvidenceObservations(
  context: ExplanationContext,
  appliedRules: string[]
): string[] {
  const observations: string[] = [];

  // Rule 1: Use existing observations if specific and meaningful
  const existing = context.evidenceObservations || [];
  const specificExisting = existing.filter(
    obs => obs.length > 15 && !obs.toLowerCase().includes('ai provider')
  );

  if (specificExisting.length > 0) {
    observations.push(...specificExisting.slice(0, 4));
    appliedRules.push('evidence-use-specific-existing');
  }

  // Rule 2: Generate observations from diagnosis
  if (context.diagnosis) {
    observations.push(`Primary assessment: ${context.diagnosis}`);
    appliedRules.push('evidence-from-diagnosis');
  }

  // Rule 3: Generate observations from detected issues
  const issues = context.detectedIssues || [];
  for (const issue of issues.slice(0, 3)) {
    const evidence = issue.evidence?.[0];
    if (evidence) {
      observations.push(`${issue.name}: ${evidence}`);
      appliedRules.push('evidence-from-issue');
    } else {
      observations.push(`${issue.name} (${issue.severity}) identified in analysis`);
      appliedRules.push('evidence-from-issue-brief');
    }
  }

  // Rule 4: Generate observations from likely causes
  const causes = context.likelyCauses || [];
  for (const cause of causes.slice(0, 2)) {
    observations.push(`Possible cause: ${cause.cause} (${cause.confidence}% confidence)`);
    appliedRules.push('evidence-from-likely-cause');
  }

  // Rule 5: Note image availability
  if (context.hasImage) {
    observations.push('Visual analysis performed on submitted image');
    appliedRules.push('evidence-image-available');
  } else {
    observations.push('Analysis based on text description only (no image provided)');
    appliedRules.push('evidence-no-image');
  }

  // Rule 6: Add confidence-based observation
  const confidence = context.confidence ?? 75;
  if (confidence >= 85) {
    observations.push(`High confidence analysis (${confidence}%) - symptoms clearly match known patterns`);
    appliedRules.push('evidence-high-confidence');
  } else if (confidence < 70) {
    observations.push(`Moderate confidence (${confidence}%) - some symptom overlap with other conditions possible`);
    appliedRules.push('evidence-moderate-confidence');
  }

  return uniq(observations).slice(0, 8);
}

/**
 * Generates uncertainties based on missing or incomplete data.
 */
function generateUncertainties(
  context: ExplanationContext,
  appliedRules: string[]
): string[] {
  const uncertainties: string[] = [];

  // Rule 1: Note if no image was provided
  if (!context.hasImage) {
    uncertainties.push('Analysis did not include image verification - visual symptoms based on description only');
    appliedRules.push('uncertainty-no-image');
  }

  // Rule 2: Note low confidence
  const confidence = context.confidence ?? 75;
  if (confidence < 75) {
    uncertainties.push(`Analysis confidence is ${confidence}% - consider follow-up observation to confirm`);
    appliedRules.push('uncertainty-low-confidence');
  }

  // Rule 3: Note missing environmental data
  const inputs = context.inputParameters || {};
  if (!inputs.phLevel) {
    uncertainties.push('pH level not provided - nutrient availability assessment is incomplete');
    appliedRules.push('uncertainty-no-ph');
  }
  if (!inputs.temperature && !inputs.temperatureCelsius) {
    uncertainties.push('Temperature data not provided - environmental stress assessment is limited');
    appliedRules.push('uncertainty-no-temperature');
  }
  if (!inputs.humidity) {
    uncertainties.push('Humidity data not provided - disease pressure assessment is incomplete');
    appliedRules.push('uncertainty-no-humidity');
  }

  // Rule 4: Note conflicting signals
  const issues = context.detectedIssues || [];
  const highConfidenceIssues = issues.filter(i => (i.confidence ?? 0) >= 80);
  const lowConfidenceIssues = issues.filter(i => (i.confidence ?? 0) < 60);

  if (highConfidenceIssues.length > 0 && lowConfidenceIssues.length > 0) {
    uncertainties.push(
      'Mixed confidence levels across detected issues - some findings more certain than others'
    );
    appliedRules.push('uncertainty-mixed-confidence');
  }

  // Rule 5: Note if using fallback explanations
  if (context.urgencyReasons?.length === 0 || context.healthScoreBreakdown?.length === 0) {
    uncertainties.push('Some explanations were generated using deterministic rules due to incomplete AI output');
    appliedRules.push('uncertainty-fallback-applied');
  }

  // Rule 6: Add generic uncertainty if none generated
  if (uncertainties.length === 0) {
    uncertainties.push('Analysis complete - standard diagnostic confidence applies');
    appliedRules.push('uncertainty-default');
  }

  return uniq(uncertainties).slice(0, 6);
}

/**
 * Merges deterministic explanations with existing AI-generated explanations,
 * preferring AI content when specific and meaningful, falling back to
 * deterministic rules when AI output is vague or missing.
 *
 * @param aiExplanations - Existing AI-generated explanations (may be empty/vague)
 * @param deterministic - Deterministic fallback explanations
 * @returns Merged explanations prioritizing specific AI content with deterministic fallback
 */
export function mergeExplanations(
  aiExplanations: Partial<DeterministicExplanations>,
  deterministic: DeterministicExplanations
): DeterministicExplanations {
  const mergeArray = (
    ai: string[] | undefined,
    det: string[],
    specificityThreshold: number = 20
  ): string[] => {
    if (!ai || ai.length === 0) return det;

    // Filter AI reasons to keep only specific ones
    const specificAi = ai.filter(
      r => r.length >= specificityThreshold &&
           !r.toLowerCase().includes('ai model') &&
           !r.toLowerCase().includes('unable to determine') &&
           !r.toLowerCase().includes('could not')
    );

    // If AI provided specific reasons, use them first, then fill with deterministic
    if (specificAi.length > 0) {
      const remainingDet = det.filter(d => !specificAi.some(s => d.includes(s) || s.includes(d)));
      return [...specificAi, ...remainingDet].slice(0, 8);
    }

    // AI reasons were vague, use deterministic
    return det;
  };

  return {
    urgencyReasons: mergeArray(aiExplanations.urgencyReasons, deterministic.urgencyReasons),
    healthScoreBreakdown: aiExplanations.healthScoreBreakdown?.length
      ? aiExplanations.healthScoreBreakdown
      : deterministic.healthScoreBreakdown,
    evidenceObservations: mergeArray(aiExplanations.evidenceObservations, deterministic.evidenceObservations),
    uncertainties: mergeArray(aiExplanations.uncertainties, deterministic.uncertainties),
    appliedRules: deterministic.appliedRules
  };
}

/**
 * Validates that explanations meet minimum quality thresholds.
 * Returns validation result with any issues found.
 */
export function validateExplanations(explanations: DeterministicExplanations): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Validate urgency reasons
  if (explanations.urgencyReasons.length === 0) {
    issues.push('No urgency reasons provided');
  } else if (explanations.urgencyReasons.every(r => r.length < 15)) {
    issues.push('Urgency reasons are too brief');
  }

  // Validate health score breakdown
  if (explanations.healthScoreBreakdown.length === 0) {
    issues.push('No health score breakdown provided');
  } else {
    const requiredCategories = ['vigor', 'leafCondition', 'pestFree', 'environmentOptimal'];
    const presentCategories = explanations.healthScoreBreakdown.map(b => b.category);
    const missing = requiredCategories.filter(c => !presentCategories.includes(c));
    if (missing.length > 0) {
      issues.push(`Missing health score categories: ${missing.join(', ')}`);
    }
  }

  // Validate evidence observations
  if (explanations.evidenceObservations.length === 0) {
    issues.push('No evidence observations provided');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// Utility function for deduplication
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Checks if an explanation string is vague or generic.
 * Used to determine if deterministic fallback should be applied.
 */
export function isVagueExplanation(text: string | undefined): boolean {
  if (!text) return true;

  const vaguePatterns = [
    /ai model/i,
    /based on analysis/i,
    /unable to determine/i,
    /could not be parsed/i,
    /model did not return/i,
    /requires manual review/i,
    /^ok$|^yes$|^no$/i,
    /tbd|n\/a|unknown/i
  ];

  return text.length < 15 || vaguePatterns.some(pattern => pattern.test(text));
}

/**
 * Checks if an array of explanations is mostly vague.
 * Returns true if more than half the explanations are vague or if array is empty.
 */
export function areExplanationsVague(explanations: string[] | undefined): boolean {
  if (!explanations || explanations.length === 0) return true;

  const vagueCount = explanations.filter(e => isVagueExplanation(e)).length;
  return vagueCount > explanations.length / 2;
}
