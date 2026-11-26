import { getLogger } from './logger';

// Raw model-output handling for plant-analysis reports: turning the
// provider's free-form response (embedded JSON, reasoning blocks,
// truncated payloads) into a structured record. Extracted from
// plant-analysis-report-v2.ts (wave 25) — the normalization pipeline
// there consumes parseAnalysisPayload; nothing here depends on it back.

type AnalysisRecord = Record<string, any>;

const log = getLogger().child({ tag: '[PLANT-ANALYSIS-REPORT]' });

export function isRecord(value: unknown): value is AnalysisRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

export function parseAnalysisPayload(rawResult: unknown, provider: string): {
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

  const rawText = stripReasoningBlocks(normalizeString(rawResult, '').trim());
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
    confidence: 0,
    severity: 'moderate',
    symptomsMatched: narrativeSummary ? [narrativeSummary] : ['Review the provider narrative for the primary symptom pattern'],
    causes: [
      narrativeSummary
        ? `Provider narrative indicated: ${narrativeSummary}`
        : 'The provider returned an unstructured response instead of the requested JSON contract'
    ],
    treatment: ['Review the preserved fallback text and confirm the recommended intervention'],
    healthScore: 0,
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
        confidence: 0,
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
        score: 0,
        reason: 'Overall vigor was estimated from fallback text instead of structured signals.'
      },
      {
        category: 'leafCondition',
        score: 0,
        reason: 'Leaf condition details were not returned in a structured format.'
      },
      {
        category: 'pestFree',
        score: 0,
        reason: 'No structured pest finding was returned, so pest status remains uncertain.'
      },
      {
        category: 'environmentOptimal',
        score: 0,
        reason: 'Environmental risks could not be fully parsed from the raw response.'
      },
      {
        category: 'growthStageAppropriate',
        score: 0,
        reason: 'Growth-stage suitability was inferred conservatively from limited structured evidence.'
      },
      {
        category: 'rootHealth',
        score: 0,
        reason: 'Root-zone details were not returned in a structured format.'
      }
    ],
    detectedIssues: [
      {
        type: 'analysis_response',
        name: 'Unstructured AI response',
        severity: 'moderate',
        confidence: 0,
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
      overallConfidence: 0,
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
      checkAfterDays: null,
      whatToMonitor: [],
      successIndicators: [],
      escalationTriggers: []
    },
    prognosis: {
      expectedOutcome: 'Outcome depends on manual review of the preserved raw response.',
      timeframe: '24-72 hours for reassessment',
      factorsAffectingOutcome: ['Response quality', 'Environmental stability', 'Speed of intervention'],
      fullRecoveryExpected: null
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
          log.debug('plant_analysis.json_extracted', { strategy: 'repair' });
          return parsed;
        }
      }
    } catch {
      continue;
    }
  }

  // Strategy 3: Salvage a truncated JSON object (reasoning models are often
  // cut off mid-response; the diagnosis fields are emitted first)
  const salvaged = salvageTruncatedJson(rawText);
  if (salvaged) {
    log.debug('plant_analysis.json_extracted', { strategy: 'truncation-salvage' });
    return salvaged;
  }

  // Strategy 4: Extract largest valid object (fallback)
  const largestValid = extractLargestValidObject(rawText);
  if (largestValid && hasRequiredKeys(largestValid)) {
    log.debug('plant_analysis.json_extracted', { strategy: 'largest-object' });
    return largestValid;
  }

  log.info('plant_analysis.json_extraction_failed');
  return null;
}

/**
 * Remove reasoning blocks (<think>...</think>) that reasoning models emit
 * around their answer. An unterminated block runs to the end of the response;
 * everything inside it is scratch reasoning, never report content.
 */
function stripReasoningBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<think>[\s\S]*$/i, ' ')
    .replace(/<\/think>/gi, ' ')
    .trim();
}

/**
 * Recover the leading key/value pairs of a JSON object whose response was
 * truncated mid-stream. Scans from the first '{' with a string/escape-aware
 * stack, remembers the last point where a top-level pair was complete, then
 * cuts there and closes the root object. Returns null when the object is
 * balanced (other strategies own that case) or nothing salvageable remains.
 */
function salvageTruncatedJson(rawText: string): AnalysisRecord | null {
  const start = rawText.indexOf('{');
  if (start === -1) {
    return null;
  }

  const text = rawText.slice(start);
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastPairEnd = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return null; // Balanced object — not a truncation salvage case
      }
      if (depth === 1) {
        lastPairEnd = index + 1; // A nested top-level value just completed
      }
    } else if (char === ',' && depth === 1) {
      lastPairEnd = index; // Top-level pair boundary (comma excluded)
    }
  }

  if (depth <= 0 || lastPairEnd <= 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(`${text.slice(0, lastPairEnd)}}`);
    if (isRecord(parsed) && hasRequiredKeys(parsed)) {
      return parsed;
    }
  } catch {
    // Salvage failed — fall through to the remaining strategies
  }

  return null;
}

/**
 * Check if parsed object has minimum required keys for plant analysis
 */
function hasRequiredKeys(obj: AnalysisRecord): boolean {
  // The V2 schema leads with diagnosis/summary/urgency/healthScore and trails
  // with recommendations. A response cut off before the trailing sections (or
  // one that simply omits them) still carries a usable diagnosis — the
  // normalizer fills the rest — so only the leading fields are required.
  const diagnosis = typeof obj.diagnosis === 'string' && obj.diagnosis.trim().length > 0;
  if (!diagnosis) {
    return false;
  }

  const hasCoreField = ['summary', 'healthScore', 'urgency'].some(key => key in obj);
  return hasCoreField && Object.keys(obj).length >= 4;
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

export function summarizeNarrative(value?: string): string {
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
  const summary = candidates.find(item => isMeaningfulNarrativeSentence(item)) || normalized;
  return clipText(summary.replace(/\s+\d+\.$/, ''), 160);
}

export function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function isMeaningfulNarrativeSentence(item: string): boolean {
  if (item.length < 24 || item.startsWith('{')) {
    return false;
  }
  if (/^(let me|let's|i will|i'll|first,? let)\b/i.test(item)) {
    return false;
  }
  if (/^(what i('m| am) seeing|in this (image|photo)|looking at (this|the) (image|photo)|here(?:'s| is))\b/i.test(item)) {
    return false;
  }
  if (/^["}]/.test(item) || /"\s*:\s*"/.test(item) || /",\s*"\w+"\s*:/.test(item)) {
    return false;
  }
  return true;
}
