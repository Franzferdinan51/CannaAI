export interface ExplainabilityCheckResult {
  passed: boolean;
  failures: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function hasNonEmptyObjectArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every(item => item && typeof item === 'object');
}

export function getExplainabilityFailures(analysis: Record<string, any> | null | undefined): string[] {
  const failures: string[] = [];

  if (!analysis || typeof analysis !== 'object') {
    return ['analysis payload is missing or not an object'];
  }

  if (!hasNonEmptyStringArray(analysis.urgencyReasons)) {
    failures.push('urgencyReasons must be a non-empty string array');
  }

  if (!hasNonEmptyObjectArray(analysis.healthScoreBreakdown)) {
    failures.push('healthScoreBreakdown must be a non-empty array');
  } else {
    analysis.healthScoreBreakdown.forEach((entry: any, index: number) => {
      if (!isNonEmptyString(entry?.category)) {
        failures.push(`healthScoreBreakdown[${index}].category must be non-empty`);
      }
      if (typeof entry?.score !== 'number') {
        failures.push(`healthScoreBreakdown[${index}].score must be numeric`);
      }
      if (!isNonEmptyString(entry?.reason)) {
        failures.push(`healthScoreBreakdown[${index}].reason must be non-empty`);
      }
    });
  }

  if (!hasNonEmptyObjectArray(analysis.detectedIssues)) {
    failures.push('detectedIssues must be a non-empty array');
  } else {
    analysis.detectedIssues.forEach((issue: any, index: number) => {
      if (!isNonEmptyString(issue?.type)) {
        failures.push(`detectedIssues[${index}].type must be non-empty`);
      }
      if (!isNonEmptyString(issue?.name)) {
        failures.push(`detectedIssues[${index}].name must be non-empty`);
      }
      if (!hasNonEmptyStringArray(issue?.evidence)) {
        failures.push(`detectedIssues[${index}].evidence must be a non-empty string array`);
      }
    });
  }

  if (!analysis.environmentRiskAssessment || typeof analysis.environmentRiskAssessment !== 'object') {
    failures.push('environmentRiskAssessment must be present');
  } else {
    if (!isNonEmptyString(analysis.environmentRiskAssessment.summary)) {
      failures.push('environmentRiskAssessment.summary must be non-empty');
    }
    if (!hasNonEmptyObjectArray(analysis.environmentRiskAssessment.contributingFactors)) {
      failures.push('environmentRiskAssessment.contributingFactors must be a non-empty array');
    }
    if (!hasNonEmptyStringArray(analysis.environmentRiskAssessment.monitoringPriorities)) {
      failures.push('environmentRiskAssessment.monitoringPriorities must be a non-empty string array');
    }
  }

  if (!analysis.prioritizedActionPlan || typeof analysis.prioritizedActionPlan !== 'object') {
    failures.push('prioritizedActionPlan must be present');
  } else {
    (['immediate', 'within24Hours', 'within7Days'] as const).forEach(key => {
      const actions = analysis.prioritizedActionPlan[key];
      if (!hasNonEmptyObjectArray(actions)) {
        failures.push(`prioritizedActionPlan.${key} must be a non-empty array`);
        return;
      }

      actions.forEach((action: any, index: number) => {
        if (!isNonEmptyString(action?.action)) {
          failures.push(`prioritizedActionPlan.${key}[${index}].action must be non-empty`);
        }
        if (!isNonEmptyString(action?.reason)) {
          failures.push(`prioritizedActionPlan.${key}[${index}].reason must be non-empty`);
        }
      });
    });
  }

  if (!hasNonEmptyObjectArray(analysis.likelyCauses)) {
    failures.push('likelyCauses must be a non-empty array');
  } else {
    analysis.likelyCauses.forEach((cause: any, index: number) => {
      if (!isNonEmptyString(cause?.cause)) {
        failures.push(`likelyCauses[${index}].cause must be non-empty`);
      }
      if (typeof cause?.confidence !== 'number') {
        failures.push(`likelyCauses[${index}].confidence must be numeric`);
      }
      if (!isNonEmptyString(cause?.evidence)) {
        failures.push(`likelyCauses[${index}].evidence must be non-empty`);
      }
    });
  }

  if (!hasNonEmptyStringArray(analysis.evidenceObservations)) {
    failures.push('evidenceObservations must be a non-empty string array');
  }

  if (!hasNonEmptyStringArray(analysis.uncertainties)) {
    failures.push('uncertainties must be a non-empty string array');
  }

  if (!analysis.recommendations || typeof analysis.recommendations !== 'object') {
    failures.push('recommendations must be present');
  } else {
    (['immediate', 'shortTerm', 'longTerm'] as const).forEach(key => {
      if (!hasNonEmptyStringArray(analysis.recommendations[key])) {
        failures.push(`recommendations.${key} must be a non-empty string array`);
      }
    });
  }

  if (!isNonEmptyString(analysis.reportVersion)) {
    failures.push('reportVersion must be non-empty');
  }

  if (!isNonEmptyString(analysis.reportSchemaVersion)) {
    failures.push('reportSchemaVersion must be non-empty');
  }

  return failures;
}

export function validateExplainabilityContract(
  analysis: Record<string, any> | null | undefined
): ExplainabilityCheckResult {
  const failures = getExplainabilityFailures(analysis);
  return {
    passed: failures.length === 0,
    failures
  };
}

export function getImageExplainabilityFailures(analysis: Record<string, any> | null | undefined): string[] {
  const failures = getExplainabilityFailures(analysis);

  if (!analysis?.imageAnalysis || typeof analysis.imageAnalysis !== 'object') {
    failures.push('imageAnalysis must be present for image-backed checks');
    return failures;
  }

  if (analysis.imageAnalysis.hasImage !== true) {
    failures.push('imageAnalysis.hasImage must be true for image-backed checks');
  }

  if (!hasNonEmptyStringArray(analysis.imageAnalysis.visualFindings)) {
    failures.push('imageAnalysis.visualFindings must be a non-empty string array');
  }

  return failures;
}
