/**
 * Robust JSON extraction and parsing for AI plant health analysis responses.
 * Handles markdown-wrapped JSON, partial JSON, and provides graceful fallbacks.
 */

/**
 * Extracts JSON from a string that may contain markdown code blocks or other wrapping.
 * Attempts multiple extraction strategies in order of preference.
 */
export function extractJSONFromResponse(response: string): {
  success: boolean;
  data?: any;
  error?: string;
  method: string;
} {
  if (!response || typeof response !== 'string') {
    return { success: false, error: 'Empty or invalid response', method: 'none' };
  }

  const trimmed = response.trim();

  // Strategy 1: Try parsing directly if it looks like JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return { success: true, data: parsed, method: 'direct-parse' };
    } catch (e) {
      // Fall through to other strategies
    }
  }

  // Strategy 2: Extract from markdown code blocks (```json or ```)
  const markdownBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  const markdownMatches = [...trimmed.matchAll(markdownBlockRegex)];

  for (const match of markdownMatches) {
    const jsonContent = match[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);
      return { success: true, data: parsed, method: 'markdown-block' };
    } catch (e) {
      // Try next match
    }
  }

  // Strategy 3: Find JSON object by balancing braces
  const jsonCandidate = extractBalancedJSON(trimmed);
  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      return { success: true, data: parsed, method: 'balanced-braces' };
    } catch (e) {
      // Fall through
    }
  }

  // Strategy 4: Try to extract JSON array
  const arrayRegex = /\[\s*\{[\s\S]*\}\s*\]/;
  const arrayMatch = trimmed.match(arrayRegex);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return { success: true, data: parsed, method: 'array-extract' };
    } catch (e) {
      // Fall through
    }
  }

  // Strategy 5: Look for common JSON start patterns
  const jsonStartRegex = /\{[\s\S]*"diagnosis"[\s\S]*"urgency"[\s\S]*\}/;
  const jsonStartMatch = trimmed.match(jsonStartRegex);
  if (jsonStartMatch) {
    try {
      const parsed = JSON.parse(jsonStartMatch[0]);
      return { success: true, data: parsed, method: 'pattern-match' };
    } catch (e) {
      // Fall through
    }
  }

  return { success: false, error: 'Could not extract valid JSON from response', method: 'none' };
}

/**
 * Extracts a balanced JSON object from text by counting braces.
 * Handles nested objects and ignores braces in strings.
 */
function extractBalancedJSON(text: string): string | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  if (endIdx === -1 || braceCount !== 0) {
    return null;
  }

  return text.substring(startIdx, endIdx);
}

/**
 * Validates that a parsed analysis result has all required keys.
 * Returns validation result with any missing fields.
 */
export function validateAnalysisResult(data: any): {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const requiredFields = [
    'diagnosis',
    'urgency',
    'urgencyReasons',
    'healthScore',
    'healthScoreBreakdown',
    'likelyCauses',
    'evidenceObservations',
    'uncertainties',
    'recommendations'
  ];

  const missingFields: string[] = [];
  const warnings: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      missingFields.push(field);
    }
  }

  // Validate urgency level
  const validUrgencyLevels = ['low', 'medium', 'high', 'critical'];
  if (data.urgency && !validUrgencyLevels.includes(data.urgency)) {
    warnings.push(`Invalid urgency level: ${data.urgency}`);
  }

  // Validate urgency reasons for medium/high/critical
  if (['medium', 'high', 'critical'].includes(data.urgency)) {
    if (!Array.isArray(data.urgencyReasons) || data.urgencyReasons.length === 0) {
      warnings.push(`Urgency "${data.urgency}" should have urgencyReasons array`);
    }
  }

  // Validate healthScore
  if (typeof data.healthScore !== 'number' || data.healthScore < 0 || data.healthScore > 100) {
    warnings.push(`Invalid healthScore: ${data.healthScore}`);
  }

  // Validate healthScoreBreakdown
  if (data.healthScoreBreakdown) {
    const breakdownFields = ['vigor', 'leafCondition', 'pestFree', 'environmentOptimal', 'growthStageAppropriate', 'rootHealth'];
    for (const field of breakdownFields) {
      if (typeof data.healthScoreBreakdown[field] !== 'number') {
        warnings.push(`Missing or invalid healthScoreBreakdown.${field}`);
      }
    }
  }

  // Validate likelyCauses is array
  if (!Array.isArray(data.likelyCauses)) {
    warnings.push('likelyCauses should be an array');
  } else if (data.likelyCauses.length === 0) {
    warnings.push('likelyCauses is empty - consider adding at least one cause');
  }

  // Validate recommendations structure
  if (data.recommendations) {
    const recTypes = ['immediate', 'shortTerm', 'longTerm'];
    for (const type of recTypes) {
      if (!Array.isArray(data.recommendations[type])) {
        warnings.push(`Missing or invalid recommendations.${type}`);
      }
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    warnings
  };
}

/**
 * Post-processes an analysis result to ensure urgency reasons and confidence drivers are populated.
 * Generates sensible defaults when AI model omits required fields.
 */
export function postProcessAnalysisResult(data: any, inputParams?: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = { ...data };

  // Ensure urgency has reasons
  if (!result.urgencyReasons || !Array.isArray(result.urgencyReasons) || result.urgencyReasons.length === 0) {
    result.urgencyReasons = generateUrgencyReasons(result.urgency, result);
  }

  // Ensure healthScoreBreakdown is populated
  if (!result.healthScoreBreakdown || typeof result.healthScoreBreakdown !== 'object') {
    result.healthScoreBreakdown = generateHealthScoreBreakdown(result.healthScore);
  } else {
    // Fill in any missing breakdown fields
    const breakdown = result.healthScoreBreakdown;
    const defaultBreakdown = generateHealthScoreBreakdown(result.healthScore);
    for (const key of Object.keys(defaultBreakdown)) {
      if (typeof breakdown[key] !== 'number') {
        breakdown[key] = defaultBreakdown[key];
      }
    }
  }

  // Ensure likelyCauses has entries with confidence
  if (!Array.isArray(result.likelyCauses) || result.likelyCauses.length === 0) {
    result.likelyCauses = generateLikelyCauses(result.diagnosis, result.severity, result.confidence);
  } else {
    // Ensure each cause has confidence
    result.likelyCauses = result.likelyCauses.map((cause: any) => {
      if (typeof cause.confidence !== 'number') {
        return { ...cause, confidence: result.confidence || 75 };
      }
      if (!cause.evidence) {
        return { ...cause, evidence: 'Based on symptom analysis' };
      }
      return cause;
    });
  }

  // Ensure evidenceObservations is populated
  if (!Array.isArray(result.evidenceObservations) || result.evidenceObservations.length === 0) {
    result.evidenceObservations = generateEvidenceObservations(result);
  }

  // Ensure uncertainties is populated
  if (!Array.isArray(result.uncertainties) || result.uncertainties.length === 0) {
    result.uncertainties = generateUncertainties(result, inputParams);
  }

  // Ensure recommendations structure
  if (!result.recommendations || typeof result.recommendations !== 'object') {
    result.recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };
  } else {
    if (!Array.isArray(result.recommendations.immediate)) {
      result.recommendations.immediate = [];
    }
    if (!Array.isArray(result.recommendations.shortTerm)) {
      result.recommendations.shortTerm = [];
    }
    if (!Array.isArray(result.recommendations.longTerm)) {
      result.recommendations.longTerm = [];
    }
  }

  return result;
}

function generateUrgencyReasons(urgency: string, data: any): string[] {
  const severity = data.severity || 'moderate';
  const diagnosis = data.diagnosis || 'Plant health issue';

  switch (urgency) {
    case 'critical':
      return [
        `${diagnosis} requires immediate intervention to prevent plant loss`,
        `Severity level is ${severity} indicating rapid progression`,
        'Delay in treatment may result in irreversible damage or harvest loss',
        'Symptoms indicate active spread or systemic involvement'
      ];
    case 'high':
      return [
        `${diagnosis} needs attention within 24-48 hours`,
        `Severity level is ${severity} with potential for escalation`,
        'Early treatment will prevent spread to other plants or further damage'
      ];
    case 'medium':
      return [
        `${diagnosis} should be addressed within the week`,
        'Nutrient or environmental correction needed to prevent progression',
        'Monitoring recommended to ensure condition does not worsen'
      ];
    case 'low':
    default:
      return [
        'Plant is generally healthy with minor optimization opportunities',
        'No immediate action required - address at next scheduled maintenance'
      ];
  }
}

function generateHealthScoreBreakdown(healthScore: number): {
  vigor: number;
  leafCondition: number;
  pestFree: number;
  environmentOptimal: number;
  growthStageAppropriate: number;
  rootHealth: number;
} {
  // Derive breakdown from overall health score with some variance
  const base = healthScore || 75;
  const variance = (score: number) => Math.max(0, Math.min(100, score + Math.floor(Math.random() * 10) - 5));

  return {
    vigor: variance(base),
    leafCondition: variance(base),
    pestFree: variance(base + 5),
    environmentOptimal: variance(base),
    growthStageAppropriate: variance(base + 5),
    rootHealth: variance(base)
  };
}

function generateLikelyCauses(diagnosis: string, severity: string, confidence: number): Array<{
  cause: string;
  confidence: number;
  evidence: string;
}> {
  return [
    {
      cause: diagnosis || 'Environmental stress or nutrient imbalance',
      confidence: confidence || 75,
      evidence: 'Based on reported symptoms and visual analysis'
    }
  ];
}

function generateEvidenceObservations(data: any): string[] {
  const observations: string[] = [];

  if (data.diagnosis) {
    observations.push(`Primary diagnosis: ${data.diagnosis}`);
  }

  if (data.severity) {
    observations.push(`Assessed severity: ${data.severity}`);
  }

  if (data.symptomsMatched && Array.isArray(data.symptomsMatched)) {
    data.symptomsMatched.slice(0, 3).forEach((symptom: string) => {
      observations.push(`Observed symptom: ${symptom}`);
    });
  }

  if (observations.length === 0) {
    observations.push('Analysis completed based on provided plant information');
  }

  return observations;
}

function generateUncertainties(data: any, inputParams?: any): string[] {
  const uncertainties: string[] = [];

  // Note if image was not provided
  if (!inputParams?.imageAnalysis) {
    uncertainties.push('No image provided - analysis based on text description only');
  }

  // Note missing environmental data
  if (!inputParams?.phLevel) {
    uncertainties.push('pH level not measured - nutrient availability may be affected');
  }

  if (!inputParams?.temperature) {
    uncertainties.push('Temperature data not provided - environmental stress cannot be fully assessed');
  }

  // Generic uncertainty based on confidence
  const confidence = data.confidence || 75;
  if (confidence < 80) {
    uncertainties.push(`Analysis confidence is ${confidence}% - some symptoms may overlap with other conditions`);
  }

  if (uncertainties.length === 0) {
    uncertainties.push('Analysis complete with standard diagnostic confidence');
  }

  return uncertainties;
}

/**
 * Complete parsing pipeline: extract, validate, and post-process AI response.
 */
export function parseAnalysisResponse(response: string, inputParams?: any): {
  success: boolean;
  data?: any;
  error?: string;
  method: string;
  validationWarnings: string[];
  postProcessed: boolean;
} {
  // Step 1: Extract JSON
  const extractResult = extractJSONFromResponse(response);

  if (!extractResult.success) {
    return {
      success: false,
      error: extractResult.error,
      method: 'none',
      validationWarnings: [],
      postProcessed: false
    };
  }

  // Step 2: Validate
  const validation = validateAnalysisResult(extractResult.data);

  // Step 3: Post-process to ensure required fields
  const postProcessed = postProcessAnalysisResult(extractResult.data, inputParams);

  return {
    success: true,
    data: postProcessed,
    method: extractResult.method,
    validationWarnings: validation.warnings,
    postProcessed: true
  };
}
