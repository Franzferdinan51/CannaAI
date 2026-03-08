#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_FIXTURE_PATH = path.resolve(
  process.cwd(),
  'tests/fixtures/report-quality-sample.png.base64'
);
const TIMEOUT_MS = parseNumber(
  process.env.CANNAAI_REPORT_CHECK_TIMEOUT_MS,
  20000
);
const ANALYZE_URL = (
  process.env.CANNAAI_REPORT_CHECK_URL ||
  `${DEFAULT_BASE_URL}/api/analyze`
).replace(/\/+$/, '');
const FIXTURE_PATH = path.resolve(
  process.cwd(),
  process.env.CANNAAI_REPORT_CHECK_IMAGE || DEFAULT_FIXTURE_PATH
);

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function log(message: string) {
  console.log(`[report-quality] ${message}`);
}

function warn(message: string) {
  console.warn(`[report-quality] ${message}`);
}

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

function inferMimeType(filePath: string): string {
  const baseName = path.basename(filePath).replace(/\.base64$/i, '');
  const extension = path.extname(baseName).toLowerCase();

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    default:
      return 'image/png';
  }
}

async function loadFixtureDataUrl(filePath: string): Promise<string> {
  const mimeType = inferMimeType(filePath);

  if (filePath.endsWith('.base64')) {
    const raw = (await readFile(filePath, 'utf8')).trim();
    return raw.startsWith('data:image/')
      ? raw
      : `data:${mimeType};base64,${raw}`;
  }

  const buffer = await readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function isPlaceholderText(value: string): boolean {
  return /(required:|placeholder|example|todo|tbd)/i.test(value);
}

function readStringArray(value: unknown, fieldName: string): string[] {
  assert(Array.isArray(value), `${fieldName} must be an array.`);
  const strings = value.filter(isNonEmptyString).map(item => item.trim());
  assert(strings.length === value.length, `${fieldName} must only contain non-empty strings.`);
  assert(strings.every(item => !isPlaceholderText(item)), `${fieldName} contains placeholder text.`);
  return strings;
}

function validateUrgencyReasons(analysis: JsonRecord, checks: string[]) {
  const urgency = isNonEmptyString(analysis.urgency)
    ? analysis.urgency.toLowerCase()
    : 'unknown';
  const reasons = readStringArray(analysis.urgencyReasons, 'analysis.urgencyReasons');
  const minimumReasons = urgency === 'critical' ? 3 : urgency === 'high' || urgency === 'medium' ? 2 : 0;

  assert(
    reasons.length >= minimumReasons,
    `analysis.urgencyReasons must include at least ${minimumReasons} item(s) for urgency "${urgency}".`
  );

  checks.push(`urgencyReasons ok (${reasons.length} reason${reasons.length === 1 ? '' : 's'} for ${urgency})`);
}

function validateHealthScoreBreakdown(analysis: JsonRecord, checks: string[]) {
  const healthScore = analysis.healthScore;

  assert(isFiniteNumber(healthScore), 'analysis.healthScore must be a finite number.');
  assert(
    healthScore >= 0 && healthScore <= 100,
    'analysis.healthScore must be between 0 and 100.'
  );

  const breakdown = analysis.healthScoreBreakdown;
  assert(Array.isArray(breakdown), 'analysis.healthScoreBreakdown must be an array.');
  assert(breakdown.length >= 3, 'analysis.healthScoreBreakdown must include at least 3 entries.');

  const categories = new Set<string>();

  breakdown.forEach((entry, index) => {
    assert(isRecord(entry), `analysis.healthScoreBreakdown[${index}] must be an object.`);
    const category = entry.category;
    const score = entry.score;
    const reason = entry.reason;

    assert(isNonEmptyString(category), `analysis.healthScoreBreakdown[${index}].category is required.`);
    assert(
      isFiniteNumber(score) && score >= 0 && score <= 100,
      `analysis.healthScoreBreakdown[${index}].score must be between 0 and 100.`
    );
    assert(isNonEmptyString(reason), `analysis.healthScoreBreakdown[${index}].reason is required.`);
    assert(
      !isPlaceholderText(reason),
      `analysis.healthScoreBreakdown[${index}].reason contains placeholder text.`
    );
    categories.add(category.trim().toLowerCase());
  });

  assert(categories.size >= 3, 'analysis.healthScoreBreakdown must cover at least 3 unique categories.');

  checks.push(`healthScoreBreakdown ok (${breakdown.length} entries, score ${healthScore})`);
}

function validateDetectedIssues(analysis: JsonRecord, checks: string[]) {
  const detectedIssues = analysis.detectedIssues;
  assert(Array.isArray(detectedIssues), 'analysis.detectedIssues must be an array.');
  assert(detectedIssues.length >= 1, 'analysis.detectedIssues must include at least 1 issue for the regression fixture.');

  detectedIssues.forEach((issue, index) => {
    assert(isRecord(issue), `analysis.detectedIssues[${index}] must be an object.`);
    const type = issue.type;
    const name = issue.name;
    const severity = issue.severity;
    const confidence = issue.confidence;

    assert(isNonEmptyString(type), `analysis.detectedIssues[${index}].type is required.`);
    assert(isNonEmptyString(name), `analysis.detectedIssues[${index}].name is required.`);
    assert(isNonEmptyString(severity), `analysis.detectedIssues[${index}].severity is required.`);
    assert(
      isFiniteNumber(confidence) && confidence >= 0 && confidence <= 100,
      `analysis.detectedIssues[${index}].confidence must be between 0 and 100.`
    );

    const evidence = readStringArray(issue.evidence, `analysis.detectedIssues[${index}].evidence`);
    assert(
      evidence.length >= 1,
      `analysis.detectedIssues[${index}].evidence must include at least 1 supporting observation.`
    );
  });

  checks.push(`detectedIssues ok (${detectedIssues.length} issue${detectedIssues.length === 1 ? '' : 's'})`);
}

function validateActionItem(value: unknown, fieldName: string) {
  assert(isRecord(value), `${fieldName} must be an object.`);
  const priority = value.priority;
  const action = value.action;
  const reason = value.reason;
  const relatedIssue = value.relatedIssue;

  assert(
    isFiniteNumber(priority) && priority >= 1,
    `${fieldName}.priority must be a positive number.`
  );
  assert(isNonEmptyString(action), `${fieldName}.action is required.`);
  assert(isNonEmptyString(reason), `${fieldName}.reason is required.`);
  assert(!isPlaceholderText(action), `${fieldName}.action contains placeholder text.`);
  assert(!isPlaceholderText(reason), `${fieldName}.reason contains placeholder text.`);

  if (relatedIssue !== undefined) {
    assert(isNonEmptyString(relatedIssue), `${fieldName}.relatedIssue must be a non-empty string when present.`);
  }
}

function validatePrioritizedActionPlan(analysis: JsonRecord, checks: string[]) {
  const urgency = isNonEmptyString(analysis.urgency)
    ? analysis.urgency.toLowerCase()
    : 'unknown';
  const plan = analysis.prioritizedActionPlan;

  assert(isRecord(plan), 'analysis.prioritizedActionPlan must be an object.');

  const immediate = Array.isArray(plan.immediate) ? plan.immediate : fail('analysis.prioritizedActionPlan.immediate must be an array.');
  const within24Hours = Array.isArray(plan.within24Hours) ? plan.within24Hours : fail('analysis.prioritizedActionPlan.within24Hours must be an array.');
  const within7Days = Array.isArray(plan.within7Days) ? plan.within7Days : fail('analysis.prioritizedActionPlan.within7Days must be an array.');
  const allItems = [...immediate, ...within24Hours, ...within7Days];

  assert(allItems.length >= 2, 'analysis.prioritizedActionPlan must include at least 2 action items.');

  allItems.forEach((item, index) => {
    validateActionItem(item, `analysis.prioritizedActionPlan.item[${index}]`);
  });

  if (urgency === 'medium' || urgency === 'high' || urgency === 'critical') {
    assert(
      immediate.length + within24Hours.length >= 1,
      `analysis.prioritizedActionPlan should include at least 1 near-term action for urgency "${urgency}".`
    );
  }

  const hasRelatedIssue = allItems.some(item => isRecord(item) && isNonEmptyString(item.relatedIssue));
  assert(
    hasRelatedIssue,
    'analysis.prioritizedActionPlan should reference at least 1 related issue for explainability.'
  );

  checks.push(
    `prioritizedActionPlan ok (${immediate.length}/${within24Hours.length}/${within7Days.length} in immediate/24h/7d)`
  );
}

function shouldSkipForStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function describeUnavailableResponse(payload: unknown): string {
  if (isRecord(payload)) {
    const message = payload.message;
    const errorPayload = payload.error;

    if (isNonEmptyString(message)) {
      return message;
    }

    if (isRecord(errorPayload) && isNonEmptyString(errorPayload.message)) {
      return errorPayload.message;
    }
  }

  return 'service reported an unavailable state';
}

function isUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('connect') ||
    message.includes('refused') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('econnreset')
  );
}

async function main() {
  log(`Using analyze endpoint ${ANALYZE_URL}`);
  log(`Using fixture ${path.relative(process.cwd(), FIXTURE_PATH)}`);

  const plantImage = await loadFixtureDataUrl(FIXTURE_PATH);
  const payload = {
    strain: 'Blue Dream',
    leafSymptoms: 'Lower leaves are yellowing with brown edge burn and slight upward canoeing near the canopy.',
    growthStage: 'flowering',
    medium: 'soil',
    temperature: 82,
    humidity: 66,
    phLevel: 6.8,
    urgency: 'medium',
    additionalNotes: 'Regression smoke check for explainability fields. Prioritize concrete reasons and actions.',
    plantImage
  };

  let response: Response;

  try {
    response = await fetch(ANALYZE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (error) {
    if (isUnavailableError(error)) {
      warn(`Skipping check because the local analyze service is unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    throw error;
  }

  let json: unknown = null;

  try {
    json = await response.json();
  } catch (error) {
    fail(`Analyze endpoint returned non-JSON output (status ${response.status}): ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    if (shouldSkipForStatus(response.status)) {
      warn(`Skipping check because the analyze service is unavailable (${response.status}): ${describeUnavailableResponse(json)}`);
      return;
    }

    fail(`Analyze endpoint returned ${response.status}: ${JSON.stringify(json)}`);
  }

  assert(isRecord(json), 'Analyze endpoint returned an invalid JSON object.');
  assert(json.success === true, 'Analyze endpoint did not report success.');
  assert(isRecord(json.analysis), 'Analyze endpoint response is missing the analysis object.');

  const analysis = json.analysis;
  const checks: string[] = [];

  validateUrgencyReasons(analysis, checks);
  validateHealthScoreBreakdown(analysis, checks);
  validateDetectedIssues(analysis, checks);
  validatePrioritizedActionPlan(analysis, checks);

  checks.forEach(check => log(`PASS ${check}`));
  log('Report quality regression check passed.');
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[report-quality] FAIL ${message}`);
  process.exitCode = 1;
});
