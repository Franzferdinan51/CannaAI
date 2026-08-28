import { prisma } from '@/lib/prisma';

type PersistedSettings = { model?: string; baseUrl?: string };
let cache: PersistedSettings & { expiresAt: number } = { expiresAt: 0 };

/** Bounded Settings-page fallback for callers that omit per-request overrides. */
export async function getPersistedLMStudioSettings(): Promise<PersistedSettings> {
  if (cache.expiresAt > Date.now()) return cache;
  try {
    const lookup = prisma.automationSetting.findFirst({ orderBy: { updatedAt: 'desc' } });
    const timeout = new Promise<null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 750);
      timer.unref?.();
    });
    const stored = await Promise.race([lookup, timeout]);
    const config = stored && typeof stored.config === 'object' && !Array.isArray(stored.config)
      ? (stored.config as { lmStudio?: { model?: unknown; url?: unknown; baseUrl?: unknown } }).lmStudio
      : undefined;
    const model = typeof config?.model === 'string' && config.model.trim() ? config.model.trim() : undefined;
    const rawBaseUrl = config?.url || config?.baseUrl;
    const baseUrl = typeof rawBaseUrl === 'string' && rawBaseUrl.trim() ? rawBaseUrl.trim() : undefined;
    cache = { model, baseUrl, expiresAt: Date.now() + 30000 };
    return { model, baseUrl };
  } catch {
    return {};
  }
}
