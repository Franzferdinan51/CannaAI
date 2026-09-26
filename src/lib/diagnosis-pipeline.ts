/**
 * Two-stage plant diagnosis pipeline.
 *
 * Stage 1 (triage): a fast, cheap classification pass over the photo —
 * healthy / stressed / critical, suspected issues, urgency. Runs on the
 * fastest available provider with a small token budget.
 *
 * Stage 2 (deep): the full V2 explainable analysis. When triage ran first,
 * its findings are injected into the deep prompt so the heavy model focuses
 * on the right symptoms instead of re-deriving them from scratch.
 *
 * This mirrors the 2026 best practice for agricultural vision (lightweight
 * specialist first, heavy VLM second) and keeps the `full` path behavior
 * byte-identical for existing callers.
 */

export type HealthStatus = 'healthy' | 'stressed' | 'critical' | 'unknown';
export type DiagnosisMode = 'full' | 'triage' | 'auto';

export interface TriageContext {
  strain?: string;
  growthStage?: string;
  leafSymptoms?: string;
}

export interface TriageResult {
  healthStatus: HealthStatus;
  /** 0..1 — how sure the triage model is */
  confidence: number;
  /** short labels, e.g. ["nitrogen deficiency", "spider mites"] */
  suspectedIssues: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  /** plant parts / aspects the deep stage should focus on */
  focusAreas: string[];
  /** one-sentence human summary */
  summary: string;
  triageMs: number;
  triageModel?: string;
}

const TRIAGE_PROMPT = `You are a cannabis plant health triage classifier. Look at the photo and respond with ONLY a JSON object, no markdown, no commentary:
{"healthStatus": "healthy" | "stressed" | "critical", "confidence": 0.0-1.0, "suspectedIssues": ["short label", ...], "urgency": "low" | "medium" | "high" | "critical", "focusAreas": ["leaves" | "stems" | "buds" | "roots" | "overall"], "summary": "one sentence"}
Rules:
- healthy: vigorous plant, no visible deficiency, pest, or environmental stress signs.
- stressed: visible deficiency/pest/environmental symptoms, but the plant is viable and recoverable.
- critical: severe widespread damage (necrosis, major infestation, collapse) — plant may not recover.
- Be conservative: when torn between healthy and stressed, choose stressed.
- suspectedIssues: 0-3 short labels. Empty array when healthy.
- If you cannot see a plant clearly, use healthStatus "unknown", confidence <= 0.4, and say so in summary.`;

const VALID_STATUSES: HealthStatus[] = ['healthy', 'stressed', 'critical', 'unknown'];
const VALID_URGENCY = ['low', 'medium', 'high', 'critical'];

function clamp01(n: unknown, fallback: number): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(1, Math.max(0, v));
}

/**
 * Parse the triage model's raw output into a TriageResult.
 * Never throws — unparseable output becomes an `unknown` triage so the
 * caller can fall back to a full analysis.
 */
export function parseTriageOutput(raw: unknown, triageMs: number): TriageResult {
  const fallback: TriageResult = {
    healthStatus: 'unknown',
    confidence: 0.3,
    suspectedIssues: [],
    urgency: 'medium',
    focusAreas: ['overall'],
    summary: 'Triage output was not parseable; run a full analysis.',
    triageMs,
  };
  try {
    let text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
    // Strip code fences if the model wrapped the JSON.
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1];
    const obj = JSON.parse(text.trim());
    const healthStatus = VALID_STATUSES.includes(obj.healthStatus) ? obj.healthStatus : 'unknown';
    const urgency = VALID_URGENCY.includes(obj.urgency) ? obj.urgency : 'medium';
    return {
      healthStatus,
      confidence: clamp01(obj.confidence, healthStatus === 'unknown' ? 0.3 : 0.6),
      suspectedIssues: Array.isArray(obj.suspectedIssues)
        ? obj.suspectedIssues.filter((s: unknown) => typeof s === 'string').slice(0, 4)
        : [],
      urgency,
      focusAreas: Array.isArray(obj.focusAreas) && obj.focusAreas.length > 0
        ? obj.focusAreas.filter((s: unknown) => typeof s === 'string').slice(0, 5)
        : ['overall'],
      summary: typeof obj.summary === 'string' && obj.summary.trim().length > 0
        ? obj.summary.trim().slice(0, 300)
        : fallback.summary,
      triageMs,
    };
  } catch {
    return fallback;
  }
}

export function buildTriagePrompt(context: TriageContext): string {
  const hints: string[] = [];
  if (context.strain) hints.push(`Strain: ${context.strain}.`);
  if (context.growthStage) hints.push(`Growth stage: ${context.growthStage}.`);
  if (context.leafSymptoms && context.leafSymptoms !== 'No symptoms specified') {
    hints.push(`Grower-reported symptoms: ${context.leafSymptoms}.`);
  }
  return hints.length > 0 ? `${TRIAGE_PROMPT}\n\nContext: ${hints.join(' ')}` : TRIAGE_PROMPT;
}

/**
 * Format triage findings for injection into the deep-analysis prompt.
 * The deep model is told to verify, not blindly trust, the triage.
 */
export function formatTriageForPrompt(triage: TriageResult): string {
  const issues = triage.suspectedIssues.length > 0 ? triage.suspectedIssues.join('; ') : 'none flagged';
  return [
    `Preliminary triage classified this plant as ${triage.healthStatus.toUpperCase()} (confidence ${(triage.confidence * 100).toFixed(0)}%, urgency ${triage.urgency}).`,
    `Suspected issues: ${issues}.`,
    `Focus areas: ${triage.focusAreas.join(', ')}.`,
    `Triage summary: ${triage.summary}`,
    `Treat this as a hypothesis to VERIFY with your own visual examination — confirm, refine, or refute it. Do not repeat the triage verdict without evidence from the photo.`,
  ].join(' ');
}

/**
 * Whether the deep stage can be skipped. Conservative: only a confident
 * "healthy" verdict skips. Everything else goes deep.
 */
export function shouldSkipDeepAnalysis(triage: TriageResult): boolean {
  return triage.healthStatus === 'healthy' && triage.confidence >= 0.85;
}

export interface TriageExecutor {
  (prompt: string, imageBase64: string | undefined, options: { temperature?: number; timeout?: number }): Promise<{ text?: string; provider?: string }>;
}

/**
 * Run the triage stage through the injected provider executor.
 * Never throws — provider failures degrade to an `unknown` triage so the
 * caller can fall back to a full analysis instead of erroring out.
 */
export async function runTriageStage(
  imageBase64: string | undefined,
  context: TriageContext,
  execute: TriageExecutor,
): Promise<TriageResult> {
  const started = Date.now();
  const degraded = (summary: string): TriageResult => ({
    healthStatus: 'unknown',
    confidence: 0.3,
    suspectedIssues: [],
    urgency: 'medium',
    focusAreas: ['overall'],
    summary,
    triageMs: Date.now() - started,
  });
  try {
    const res = await execute(buildTriagePrompt(context), imageBase64, { temperature: 0.2, timeout: 45000 });
    const triage = parseTriageOutput(res.text ?? '', Date.now() - started);
    if (res.provider) triage.triageModel = res.provider;
    return triage;
  } catch (err) {
    return degraded(`Triage provider failed (${err instanceof Error ? err.message : 'unknown error'}); run a full analysis.`);
  }
}
