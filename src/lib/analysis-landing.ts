import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Analysis landing.
 *
 * When an AI analysis completes for a real plant, the PlantAnalysis row is
 * only the archive copy. The result also has to reach the plant-facing
 * stores, in the shapes their existing readers already use:
 *
 *   1. PlantHealthAnalytics — one row per analysis; the source for the
 *      health-trend API (score/status/issues/recommendations/confidence).
 *   2. AnalysisHistory — the plant's analysis timeline entry (same payload
 *      shape the automation routes write).
 *   3. Plant.health — the denormalized
 *      { score, status, issues, recommendations, warnings, history }
 *      object the plants API passes through and the UI renders directly.
 *
 * Every write is individually guarded: a failure here is logged and must
 * never lose — or fail — the primary PlantAnalysis write that already
 * happened. Analyses without a plantId never reach this helper.
 */

export type AnalysisHealthStatus = 'healthy' | 'stressed' | 'critical' | 'unknown';

export interface AnalysisLandingInput {
  plantId: string;
  /** Id of the PlantAnalysis row this analysis was archived as. */
  analysisId?: string;
  /** AnalysisHistory.analysisType, e.g. 'manual_health'. */
  analysisType: string;
  /** Recorded in the AnalysisHistory metadata, e.g. 'api_analyze'. */
  source: string;
  provider?: string;
  diagnosis?: string;
  /** Health score on the 0-100 scale. Omit when no score was produced. */
  healthScore?: number;
  /** Confidence on the 0-1 scale. */
  confidence?: number;
  urgency?: string;
  /** Issues as produced by the provider (strings or issue objects). */
  issues?: unknown[];
  /** Flat recommendation strings. */
  recommendations?: string[];
  /** Payload stored on the AnalysisHistory row (automation-writer shape). */
  historyData: Record<string, unknown>;
}

/**
 * Map a 0-100 score (+ provider urgency) onto the health-status vocabulary
 * used across the app ('healthy' | 'stressed' | 'critical' | 'unknown',
 * same set as the triage pipeline and Plant.health).
 */
export function healthStatusForScore(
  score: number | undefined,
  urgency?: string,
): AnalysisHealthStatus {
  if (urgency === 'critical') return 'critical';
  if (score === undefined || !Number.isFinite(score)) return 'unknown';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'stressed';
  return 'critical';
}

/**
 * Flatten the report-style recommendation shapes ({ immediate, shortTerm,
 * longTerm, overall } or a plain string array) into a flat string list —
 * the same flattening src/lib/ai.ts applies to provider reports.
 */
export function flattenRecommendations(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is string => typeof item === 'string');
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (typeof record.overall === 'string') return [record.overall];
    const flattened: string[] = [];
    for (const key of ['immediate', 'shortTerm', 'longTerm'] as const) {
      const value = record[key];
      if (Array.isArray(value)) {
        flattened.push(...value.filter((item): item is string => typeof item === 'string'));
      } else if (typeof value === 'string') {
        flattened.push(value);
      }
    }
    return flattened;
  }
  return [];
}

function finiteNumber(value: number | undefined, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : undefined;
}

export async function landAnalysisOnPlant(input: AnalysisLandingInput): Promise<void> {
  const { plantId } = input;

  let plant: { id: string; health: unknown } | null = null;
  try {
    plant = await prisma.plant.findUnique({
      where: { id: plantId },
      select: { id: true, health: true },
    });
  } catch (error) {
    console.error(`Analysis landing: failed to load plant ${plantId}:`, error);
    return;
  }
  if (!plant) {
    // The analysis stays archived on its PlantAnalysis row; there is no
    // real plant to land it on.
    console.warn(`Analysis landing: plant ${plantId} not found; skipping plant-facing writes.`);
    return;
  }

  const score = finiteNumber(input.healthScore, 0, 100);
  const confidence = finiteNumber(input.confidence, 0, 1);
  const status = healthStatusForScore(score, input.urgency);
  const issues = Array.isArray(input.issues) ? input.issues : [];
  const recommendations = Array.isArray(input.recommendations) ? input.recommendations : [];

  // 1. PlantHealthAnalytics — healthScore is a required column, so this row
  //    is only written when the analysis actually produced a score.
  if (score !== undefined) {
    try {
      await prisma.plantHealthAnalytics.create({
        data: {
          plantId,
          analysisId: input.analysisId,
          healthScore: score,
          healthStatus: status,
          issues: issues as Prisma.InputJsonValue,
          recommendations: recommendations as Prisma.InputJsonValue,
          confidence: confidence ?? null,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error(`Analysis landing: failed to record health analytics for plant ${plantId}:`, error);
    }
  }

  // 2. AnalysisHistory — timeline entry, written for every landed analysis.
  try {
    await prisma.analysisHistory.create({
      data: {
        plantId,
        analysisType: input.analysisType,
        analysisId: input.analysisId,
        data: input.historyData as Prisma.InputJsonValue,
        metadata: {
          source: input.source,
          provider: input.provider ?? null,
          automated: false,
        },
      },
    });
  } catch (error) {
    console.error(`Analysis landing: failed to record analysis history for plant ${plantId}:`, error);
  }

  // 3. Plant.health — override only the fields the analysis owns and
  //    preserve the rest of the established JSON shape (warnings, history,
  //    and any other keys already present).
  if (score !== undefined) {
    try {
      const existing =
        plant.health && typeof plant.health === 'object' && !Array.isArray(plant.health)
          ? (plant.health as Record<string, unknown>)
          : {};
      await prisma.plant.update({
        where: { id: plantId },
        data: {
          health: {
            ...existing,
            score,
            status,
            issues,
            recommendations,
            warnings: Array.isArray(existing.warnings) ? existing.warnings : [],
            history: Array.isArray(existing.history) ? existing.history : [],
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error(`Analysis landing: failed to update health for plant ${plantId}:`, error);
    }
  }
}
