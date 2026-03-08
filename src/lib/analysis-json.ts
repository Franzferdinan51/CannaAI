/**
 * Enhanced JSON extraction and parsing for AI plant health analysis responses.
 * V2: Improved robustness for markdown-wrapped JSON, partial JSON, and structured validation.
 */

export interface JSONExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  method: string;
  confidence: 'high' | 'medium' | 'low';
}

function cleanJSONString(json: string): string {
  return json
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/\t/g, '  ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .trim();
}

export function extractJSONFromResponse(response: string): JSONExtractionResult {
  if (!response || typeof response !== 'string') {
    return { success: false, error: 'Empty or invalid response', method: 'none', confidence: 'low' };
  }

  const trimmed = response.trim();

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      return { success: true, data: parsed, method: 'direct-parse', confidence: 'high' };
    } catch (e) { /* Fall through */ }
  }

  const markdownPatterns = [
    /```(?:json|JSON)?\s*([\s\S]*?)```/g,
    /~~~(?:json)?\s*([\s\S]*?)~~~/g,
    /<code[^>]*>([\s\S]*?)<\/code>/g
  ];

  for (const pattern of markdownPatterns) {
    const matches = Array.from(trimmed.matchAll(pattern));
    for (const match of matches) {
      const jsonContent = match[1].trim();
      const cleaned = cleanJSONString(jsonContent);
      try {
        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed, method: 'markdown-block', confidence: 'high' };
      } catch (e) {
        const repaired = repairPartialJSON(cleaned);
        if (repaired) {
          try {
            const parsed = JSON.parse(repaired);
            return { success: true, data: parsed, method: 'markdown-block-repaired', confidence: 'medium' };
          } catch (e2) { /* Continue */ }
        }
      }
    }
  }

  const jsonBraces = extractBalancedJSON(trimmed);
  if (jsonBraces) {
    try {
      const parsed = JSON.parse(jsonBraces);
      return { success: true, data: parsed, method: 'balanced-braces', confidence: 'medium' };
    } catch (e) {
      const repaired = repairPartialJSON(jsonBraces);
      if (repaired) {
        try {
          const parsed = JSON.parse(repaired);
          return { success: true, data: parsed, method: 'balanced-braces-repaired', confidence: 'medium' };
        } catch (e2) { /* Continue */ }
      }
    }
  }

  const requiredKeyPatterns = [
    /(\{[\s\n]*"(diagnosis|summary|urgency|healthScore|likelyCauses)"[\s\S]*\})/,
    /(\{[\s\n]*"(analysis|entities|keyInsights|sentiment)"[\s\S]*\})/,
    /(\{[\s\n]*"(detectedIssues|recommendations|evidenceObservations)"[\s\S]*\})/
  ];

  for (const pattern of requiredKeyPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const jsonCandidate = match[1];
      const cleaned = cleanJSONString(jsonCandidate);
      try {
        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed, method: 'key-pattern', confidence: 'medium' };
      } catch (e) {
        const repaired = repairPartialJSON(cleaned);
        if (repaired) {
          try {
            const parsed = JSON.parse(repaired);
            return { success: true, data: parsed, method: 'key-pattern-repaired', confidence: 'low' };
          } catch (e2) { /* Continue */ }
        }
      }
    }
  }

  const arrayMatch = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      return { success: true, data: parsed, method: 'array-extract', confidence: 'medium' };
    } catch (e) { /* Fall through */ }
  }

  return { success: false, error: 'Could not extract valid JSON from response', method: 'none', confidence: 'low' };
}

function repairPartialJSON(json: string): string | null {
  if (!json) return null;
  const trimmed = json.trim();
  if (trimmed.length < 10) return null;

  const stack: string[] = [];
  let inString = false;
  let escape = false;
  let lastChar = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (escape) { escape = false; lastChar = char; continue; }
    if (char === '\\' && inString) { escape = true; lastChar = char; continue; }
    if (char === '"') { inString = !inString; lastChar = char; continue; }
    if (inString) { lastChar = char; continue; }
    if (char === '{' || char === '[') { stack.push(char); }
    else if (char === '}') { if (stack.length > 0 && stack[stack.length - 1] === '{') { stack.pop(); } }
    else if (char === ']') { if (stack.length > 0 && stack[stack.length - 1] === '[') { stack.pop(); } }
    lastChar = char;
  }

  if (stack.length > 0 || inString) {
    let repaired = trimmed;
    if (inString && lastChar !== '"' && lastChar !== '\\') { repaired += '"'; }
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') { repaired += '}'; }
      else if (open === '[') { repaired += ']'; }
    }
    return repaired;
  }
  return null;
}

function extractBalancedJSON(text: string): string | null {
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return null;

  let braceCount = 0, bracketCount = 0, inString = false, escape = false, endIdx = -1;

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i];
    if (escape) { escape = false; continue; }
    if (char === '\\' && inString) { escape = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === '{') { braceCount++; }
    else if (char === '}') { braceCount--; }
    else if (char === '[') { bracketCount++; }
    else if (char === ']') { bracketCount--; }
    if (braceCount === 0 && bracketCount === 0 && char === '}') { endIdx = i + 1; break; }
  }

  if (endIdx === -1 || braceCount !== 0 || bracketCount !== 0) { return null; }
  return text.substring(startIdx, endIdx);
}

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  warnings: string[];
  errors: string[];
  schemaVersion?: string;
}

export function validateAnalysisResult(data: any, schemaVersion: 'v1' | 'v2' = 'v2'): ValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (schemaVersion === 'v2') {
    const v2RequiredFields = ['diagnosis', 'summary', 'urgency', 'urgencyReasons', 'healthScore', 'healthScoreBreakdown', 'likelyCauses', 'evidenceObservations', 'uncertainties', 'recommendations'];
    for (const field of v2RequiredFields) {
      if (data[field] === undefined || data[field] === null) { missingFields.push(field); }
    }

    const validUrgencyLevels = ['low', 'medium', 'high', 'critical'];
    if (data.urgency && !validUrgencyLevels.includes(data.urgency)) {
      errors.push(`Invalid urgency level: ${data.urgency}`);
    }

    if (['medium', 'high', 'critical'].includes(data.urgency)) {
      if (!Array.isArray(data.urgencyReasons)) { errors.push('urgencyReasons must be an array'); }
      else if (data.urgencyReasons.length < 2) { errors.push(`urgencyReasons must have at least 2 entries for "${data.urgency}" urgency`); }
    }

    if (typeof data.healthScore !== 'number') { errors.push('healthScore must be a number'); }
    else if (data.healthScore < 0 || data.healthScore > 100) { errors.push('healthScore must be 0-100'); }

    if (data.healthScoreBreakdown) {
      const breakdownFields = ['vigor', 'leafCondition', 'pestFree', 'environmentOptimal', 'growthStageAppropriate', 'rootHealth'];
      if (typeof data.healthScoreBreakdown !== 'object') { errors.push('healthScoreBreakdown must be an object'); }
      else {
        for (const field of breakdownFields) {
          const entry = data.healthScoreBreakdown[field];
          if (!entry) { missingFields.push(`healthScoreBreakdown.${field}`); }
          else if (typeof entry === 'number') { /* Legacy format - OK */ }
          else if (typeof entry !== 'object') { errors.push(`healthScoreBreakdown.${field} must be object or number`); }
          else if (typeof entry.score !== 'number' || entry.score < 0 || entry.score > 100) { errors.push(`healthScoreBreakdown.${field}.score must be 0-100`); }
        }
      }
    }

    if (!Array.isArray(data.likelyCauses)) { errors.push('likelyCauses must be an array'); }
    else if (data.likelyCauses.length === 0) { warnings.push('likelyCauses is empty'); }

    if (!Array.isArray(data.evidenceObservations)) { errors.push('evidenceObservations must be an array'); }
    if (!Array.isArray(data.uncertainties)) { errors.push('uncertainties must be an array'); }

    if (data.recommendations) {
      if (typeof data.recommendations !== 'object') { errors.push('recommendations must be an object'); }
      else {
        for (const type of ['immediate', 'shortTerm', 'longTerm']) {
          if (!Array.isArray(data.recommendations[type])) { errors.push(`recommendations.${type} must be an array`); }
        }
      }
    }
  } else {
    const requiredFields = ['diagnosis', 'urgency', 'urgencyReasons', 'healthScore', 'healthScoreBreakdown', 'likelyCauses', 'evidenceObservations', 'uncertainties', 'recommendations'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) { missingFields.push(field); }
    }
    const validUrgencyLevels = ['low', 'medium', 'high', 'critical'];
    if (data.urgency && !validUrgencyLevels.includes(data.urgency)) { warnings.push(`Invalid urgency level: ${data.urgency}`); }
  }

  return { valid: missingFields.length === 0 && errors.length === 0, missingFields, warnings, errors, schemaVersion: schemaVersion === 'v2' ? '2.0.0' : '1.0.0' };
}

function getRationaleForScore(score: number, category: string): string {
  const name = category.replace(/([A-Z])/g, ' $1').toLowerCase();
  if (score >= 85) return `${name} is within optimal range`;
  if (score >= 70) return `${name} shows minor issues but acceptable`;
  if (score >= 50) return `${name} shows moderate issues requiring attention`;
  return `${name} shows significant issues requiring intervention`;
}

export function postProcessAnalysisResult(data: any, inputParams?: any): any {
  if (!data || typeof data !== 'object') { return data; }

  const result = { ...data };

  // Urgency reasons
  const hasUrgencyReasons = Array.isArray(result.urgencyReasons) && result.urgencyReasons.length >= 2;
  const urgencyLevel = result.urgency || 'medium';
  if (!hasUrgencyReasons && ['medium', 'high', 'critical'].includes(urgencyLevel)) {
    result.urgencyReasons = generateUrgencyReasons(urgencyLevel, result);
  } else if (!hasUrgencyReasons) {
    result.urgencyReasons = ['Plant is generally healthy'];
  }

  // Health score breakdown
  const hasBreakdown = result.healthScoreBreakdown && typeof result.healthScoreBreakdown === 'object';
  if (!hasBreakdown) {
    result.healthScoreBreakdown = generateHealthScoreBreakdown(result.healthScore);
  } else {
    const defaultBreakdown = generateHealthScoreBreakdown(result.healthScore);
    for (const key of Object.keys(defaultBreakdown)) {
      if (!result.healthScoreBreakdown[key]) {
        result.healthScoreBreakdown[key] = defaultBreakdown[key];
      } else if (typeof result.healthScoreBreakdown[key] === 'number') {
        const score = result.healthScoreBreakdown[key];
        result.healthScoreBreakdown[key] = { score, rationale: getRationaleForScore(score, key) };
      }
    }
  }

  // Likely causes
  const hasLikelyCauses = Array.isArray(result.likelyCauses) && result.likelyCauses.length > 0;
  if (!hasLikelyCauses) {
    result.likelyCauses = generateLikelyCauses(result.diagnosis, result.severity, result.confidence);
  } else {
    result.likelyCauses = result.likelyCauses.map((cause: any, i: number) => ({
      ...cause,
      confidence: typeof cause.confidence === 'number' ? cause.confidence : (result.confidence || 75 - i * 10),
      evidence: cause.evidence || generateEvidenceForCause(cause.cause, result),
      rationale: cause.rationale || generateRationaleForCause(cause.confidence || 75)
    }));
  }

  // Evidence observations
  if (!Array.isArray(result.evidenceObservations) || result.evidenceObservations.length === 0) {
    result.evidenceObservations = generateEvidenceObservations(result);
  }

  // Uncertainties
  if (!Array.isArray(result.uncertainties) || result.uncertainties.length === 0) {
    result.uncertainties = generateUncertainties(result, inputParams);
  }

  // Recommendations
  if (!result.recommendations || typeof result.recommendations !== 'object') {
    result.recommendations = { immediate: generateImmediateRecommendations(result), shortTerm: generateShortTermRecommendations(result), longTerm: generateLongTermRecommendations() };
  } else {
    if (!Array.isArray(result.recommendations.immediate) || result.recommendations.immediate.length === 0) {
      result.recommendations.immediate = generateImmediateRecommendations(result);
    }
    if (!Array.isArray(result.recommendations.shortTerm) || result.recommendations.shortTerm.length === 0) {
      result.recommendations.shortTerm = generateShortTermRecommendations(result);
    }
    if (!Array.isArray(result.recommendations.longTerm) || result.recommendations.longTerm.length === 0) {
      result.recommendations.longTerm = generateLongTermRecommendations();
    }
  }

  // Confidence
  if (typeof result.confidence !== 'number') {
    result.confidence = estimateConfidence(result);
  }

  return result;
}

function generateEvidenceForCause(cause: string, _data: any): string {
  const c = cause.toLowerCase();
  if (c.includes('magnesium')) return 'Interveinal chlorosis on older leaves is classic Mg deficiency';
  if (c.includes('phosphorus')) return 'Purple stems and dark leaves indicate phosphorus deficiency';
  if (c.includes('potassium')) return 'Yellowing tips on new leaves suggest potassium deficiency';
  if (c.includes('iron')) return 'Interveinal chlorosis on new growth indicates iron deficiency';
  if (c.includes('nitrogen')) return 'Bottom-up yellowing indicates nitrogen deficiency';
  if (c.includes('pest') || c.includes('mite')) return 'Visual evidence of pest damage patterns';
  if (c.includes('ph')) return 'pH outside optimal range causing nutrient availability issues';
  return `Based on observed symptoms: ${cause}`;
}

function generateRationaleForCause(confidence: number): string {
  if (confidence >= 80) return 'High confidence due to specific symptom pattern matching';
  if (confidence >= 60) return 'Moderate confidence - symptoms consistent but some overlap with other conditions';
  return 'Lower confidence - possible contributing factor but less likely than primary diagnosis';
}

function generateImmediateRecommendations(data: any): string[] {
  const recs: string[] = [];
  const diagnosis = (data.diagnosis || '').toLowerCase();
  if (diagnosis.includes('magnesium')) recs.push('Apply Epsom salts: 1 tsp/gallon as foliar spray');
  if (diagnosis.includes('phosphorus')) recs.push('Apply bloom booster (10-30-20) at 1-2ml/L');
  if (diagnosis.includes('potassium')) recs.push('Add potassium sulfate at 0.5-1ml/L');
  if (diagnosis.includes('iron')) recs.push('Apply iron chelate at 1ml/L, ensure pH 6.0-6.3');
  if (diagnosis.includes('ph') || diagnosis.includes('lockout')) recs.push('Flush with pH 6.0 water');
  if (diagnosis.includes('pest') || diagnosis.includes('mite')) recs.push('Apply neem oil or insecticidal soap');
  if (diagnosis.includes('mildew') || diagnosis.includes('mold')) recs.push('Remove affected material, apply fungicide');
  if (recs.length === 0) recs.push('Review AI analysis for specific treatment instructions');
  return recs;
}

function generateShortTermRecommendations(data: any): string[] {
  const recs = ['Monitor pH daily (6.0-6.5)', 'Observe treated areas for 3-5 days'];
  if (data.urgency === 'high' || data.urgency === 'critical') { recs.push('Re-apply treatment in 48 hours if no improvement'); }
  recs.push('Check temp (20-26°C) and humidity (40-60%)');
  return recs;
}

function generateLongTermRecommendations(): string[] {
  return ['Maintain consistent feeding schedule', 'Monitor plants weekly', 'Keep environment clean', 'Document symptoms and treatments'];
}

function generateUrgencyReasons(urgency: string, data: any): string[] {
  const sev = data.severity || 'moderate';
  const diag = data.diagnosis || 'Plant health issue';
  if (urgency === 'critical') return [`${diag} requires immediate intervention`, `Severity ${sev} indicates rapid progression`, 'Delay may cause irreversible damage'];
  if (urgency === 'high') return [`${diag} needs attention within 24-48 hours`, `Severity ${sev} with escalation potential`, 'Early treatment prevents spread'];
  if (urgency === 'medium') return [`${diag} should be addressed within the week`, 'Correction needed to prevent progression', 'Monitoring recommended'];
  return ['Plant generally healthy', 'No immediate action required'];
}

function generateHealthScoreBreakdown(healthScore: number): any {
  const base = healthScore || 75;
  const varScore = (s: number) => Math.max(0, Math.min(100, s + Math.floor(Math.random() * 10) - 5));
  return {
    vigor: { score: varScore(base), rationale: getRationaleForScore(varScore(base), 'vigor') },
    leafCondition: { score: varScore(base - 5), rationale: getRationaleForScore(varScore(base - 5), 'leafCondition') },
    pestFree: { score: varScore(base + 5), rationale: getRationaleForScore(varScore(base + 5), 'pestFree') },
    environmentOptimal: { score: varScore(base), rationale: getRationaleForScore(varScore(base), 'environmentOptimal') },
    growthStageAppropriate: { score: varScore(base + 5), rationale: getRationaleForScore(varScore(base + 5), 'growthStageAppropriate') },
    rootHealth: { score: varScore(base), rationale: getRationaleForScore(varScore(base), 'rootHealth') }
  };
}

function generateLikelyCauses(diagnosis: string, _severity: string, confidence: number): any[] {
  return [{ cause: diagnosis || 'Environmental stress or nutrient imbalance', confidence: confidence || 75, evidence: 'Based on reported symptoms', rationale: 'Primary diagnosis based on symptom matching' }];
}

function generateEvidenceObservations(data: any): string[] {
  const obs: string[] = [];
  if (data.diagnosis) obs.push(`Primary diagnosis: ${data.diagnosis}`);
  if (data.severity) obs.push(`Severity: ${data.severity}`);
  if (obs.length === 0) obs.push('Analysis based on provided plant information');
  return obs;
}

function generateUncertainties(data: any, inputParams?: any): string[] {
  const unc: string[] = [];
  if (!inputParams?.imageAnalysis && !data?.imageAnalysis?.hasImage) { unc.push('No image provided - text-based analysis only'); }
  if (!inputParams?.phLevel) { unc.push('pH not measured - nutrient availability uncertain'); }
  if (!inputParams?.temperature && !inputParams?.temperatureCelsius) { unc.push('Temperature not provided'); }
  if ((data.confidence || 75) < 80) { unc.push(`Confidence ${data.confidence || 75}% - some symptom overlap`); }
  if (unc.length === 0) unc.push('Analysis complete with standard confidence');
  return unc;
}

function estimateConfidence(data: any): number {
  let c = 75;
  if (data.imageAnalysis?.hasImage) c += 10;
  if (data.symptomsMatched?.length > 2) c += 5;
  if (data.urgency === 'critical' || data.urgency === 'high') c += 5;
  if (data.uncertainties?.length > 3) c -= 10;
  return Math.max(0, Math.min(100, c));
}

export interface ParseResult {
  success: boolean;
  data?: any;
  error?: string;
  extractionMethod: string;
  extractionConfidence: 'high' | 'medium' | 'low';
  validationWarnings: string[];
  validationErrors: string[];
  postProcessed: boolean;
  schemaVersion: string;
}

export function parseAnalysisResponse(response: string, inputParams?: any, schemaVersion: 'v1' | 'v2' = 'v2'): ParseResult {
  const extractResult = extractJSONFromResponse(response);
  if (!extractResult.success) {
    return { success: false, error: extractResult.error, extractionMethod: 'none', extractionConfidence: 'low', validationWarnings: [], validationErrors: [extractResult.error || 'Unknown error'], postProcessed: false, schemaVersion: schemaVersion === 'v2' ? '2.0.0' : '1.0.0' };
  }

  const validation = validateAnalysisResult(extractResult.data, schemaVersion);
  const postProcessed = postProcessAnalysisResult(extractResult.data, inputParams);
  const finalValidation = validateAnalysisResult(postProcessed, schemaVersion);

  return {
    success: finalValidation.valid,
    data: postProcessed,
    error: finalValidation.errors.length > 0 ? finalValidation.errors.join('; ') : undefined,
    extractionMethod: extractResult.method,
    extractionConfidence: extractResult.confidence,
    validationWarnings: [...validation.warnings, ...finalValidation.warnings],
    validationErrors: finalValidation.errors,
    postProcessed: true,
    schemaVersion: schemaVersion === 'v2' ? '2.0.0' : '1.0.0'
  };
}

export function formatAnalysisReport(data: any): string {
  const lines: string[] = [];
  lines.push('# Plant Health Analysis Report\n');
  lines.push(`## Diagnosis: ${data.diagnosis || 'Unknown'}`);
  lines.push(`**Urgency:** ${data.urgency || 'Unknown'} | **Health Score:** ${data.healthScore || 'N/A'}/100\n`);
  lines.push(`**Summary:** ${data.summary || 'No summary provided'}\n`);

  if (Array.isArray(data.urgencyReasons) && data.urgencyReasons.length > 0) {
    lines.push('### Urgency Reasons');
    data.urgencyReasons.forEach((r: string) => lines.push(`- ${r}`));
    lines.push('');
  }

  if (data.healthScoreBreakdown && typeof data.healthScoreBreakdown === 'object') {
    lines.push('### Health Score Breakdown');
    Object.entries(data.healthScoreBreakdown).forEach(([cat, entry]: [string, any]) => {
      lines.push(`- **${cat}:** ${entry.score || entry}/100 - ${entry.rationale || 'No rationale'}`);
    });
    lines.push('');
  }

  if (Array.isArray(data.likelyCauses) && data.likelyCauses.length > 0) {
    lines.push('### Likely Causes');
    data.likelyCauses.forEach((c: any) => {
      lines.push(`- **${c.cause}** (${c.confidence || 0}% confidence)`);
      lines.push(`  - Evidence: ${c.evidence || 'Not provided'}`);
      if (c.rationale) lines.push(`  - Rationale: ${c.rationale}`);
    });
    lines.push('');
  }

  if (Array.isArray(data.evidenceObservations) && data.evidenceObservations.length > 0) {
    lines.push('### Evidence Observations');
    data.evidenceObservations.forEach((o: string) => lines.push(`- ${o}`));
    lines.push('');
  }

  if (Array.isArray(data.uncertainties) && data.uncertainties.length > 0) {
    lines.push('### Uncertainties & Limitations');
    data.uncertainties.forEach((u: string) => lines.push(`- ${u}`));
    lines.push('');
  }

  if (data.recommendations) {
    lines.push('### Recommendations');
    if (Array.isArray(data.recommendations.immediate) && data.recommendations.immediate.length > 0) {
      lines.push('**Immediate (within 24 hours):**');
      data.recommendations.immediate.forEach((r: any) => lines.push(`- ${typeof r === 'string' ? r : r.action || 'See details'}`));
    }
    if (Array.isArray(data.recommendations.shortTerm) && data.recommendations.shortTerm.length > 0) {
      lines.push('**Short-term (1-7 days):**');
      data.recommendations.shortTerm.forEach((r: any) => lines.push(`- ${typeof r === 'string' ? r : r.action || 'See details'}`));
    }
    if (Array.isArray(data.recommendations.longTerm) && data.recommendations.longTerm.length > 0) {
      lines.push('**Long-term (ongoing):**');
      data.recommendations.longTerm.forEach((r: any) => lines.push(`- ${typeof r === 'string' ? r : r.action || 'See details'}`));
    }
    lines.push('');
  }

  return lines.join('\n');
}
