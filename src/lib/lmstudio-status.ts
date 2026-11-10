import { checkLMStudio } from '@/lib/ai-provider-lmstudio';

export interface LiveLmStudioStatus {
  connected: boolean;
  modelsAvailable: number | null;
  statusSource: 'live-probe';
  statusCheckedAt: string;
}

/**
 * Live LM Studio status from the same catalog probe /api/health-check
 * uses. Settings/automation payloads serve a stored config blob whose
 * seed-time `connected: false` was previously presented as live status;
 * overlaying this probe result makes those payloads report live truth
 * for the lmStudio entry instead. `model` stays a config field (empty
 * means "resolve the loaded model at request time") — the live model
 * count is reported separately as modelsAvailable, never written back
 * into the stored config.
 */
export async function getLiveLmStudioStatus(): Promise<LiveLmStudioStatus> {
  const statusCheckedAt = new Date().toISOString();
  try {
    const result = await checkLMStudio(true);
    return {
      connected: result.available,
      modelsAvailable: result.models?.length ?? null,
      statusSource: 'live-probe',
      statusCheckedAt,
    };
  } catch {
    return {
      connected: false,
      modelsAvailable: null,
      statusSource: 'live-probe',
      statusCheckedAt,
    };
  }
}
