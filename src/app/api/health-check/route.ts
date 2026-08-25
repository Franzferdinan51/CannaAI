/**
 * /api/health-check - Enhanced health check for full stack
 * Tests DB, LM Studio, OpenClaw, and (when configured) Hermes connectivity.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLMStudio as checkLMStudioProvider } from '@/lib/ai-provider-lmstudio';

function withHealthTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

type HealthComponent = {
  status: string;
  transport?: string;
  source?: string;
  error?: string;
  models?: number;
  modelsLoaded?: number | null;
  latency?: number | null;
};

async function checkPrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latency: null };
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
}

async function checkLMStudio() {
  try {
    // Use the same endpoint discovery and authentication as analysis/model
    // selection. A stale launchd LM_STUDIO_URL must not mask the local server
    // configured in .env.local or the LM Studio default port.
    const result = await checkLMStudioProvider(true);
    if (result.available) {
      return {
        status: 'ok',
        models: result.models?.length || 0,
        // OpenAI-compatible /v1/models does not expose LM Studio's loaded
        // state reliably, so do not report the catalog size as loaded count.
        modelsLoaded: null,
      };
    }
    return { status: 'unreachable', error: result.reason };
  } catch (e) {
    return { status: 'unreachable', error: String(e).slice(0, 80) };
  }
}

async function checkOpenClaw() {
  try {
    const { checkOpenClaw: check } = await import('@/lib/ai-provider-openclaw');
    const result = await check();
    return result.isAvailable ? { status: 'ok', transport: 'acp' } : { status: 'unreachable', transport: 'acp' };
  } catch (e) {
    return { status: 'unreachable', error: String(e).slice(0, 80) };
  }
}

async function checkHermes() {
  try {
    // Use the same detector as provider discovery so an authenticated Hermes
    // proxy/CLI session is not misreported as unconfigured merely because it
    // does not use HERMES_API_KEY.
    const { checkHermes: detectHermes } = await import('@/lib/ai-provider-hermes');
    const result = await detectHermes();
    const configured = Boolean(
      process.env.HERMES_API_KEY ||
      process.env.HERMES_API_SERVER_KEY ||
      process.env.HERMES_AGENT_COMMAND ||
      process.env.HERMES_BIN,
    );
    if (result.isAvailable) {
      const source = result.config?.transport === 'api-server' ? 'hermes-api-server' : 'hermes-proxy';
      return { status: 'ok' as const, source };
    }
    return configured
      ? { status: 'unreachable' as const, error: result.reason }
      : { status: 'unconfigured' as const };
  } catch (e) {
    return { status: 'unreachable' as const, error: String(e).slice(0, 80) };
  }
}

export async function GET() {
  const [db, lmstudio, openclaw, hermes] = await Promise.all([
    checkPrisma(),
    checkLMStudio(),
    // OpenClaw's supported status command starts a CLI process and can take
    // 20–30 seconds even with --no-probe on macOS launchd installations.
    // Keep the route bounded, but allow the detector to prove a healthy Gateway.
    withHealthTimeout<HealthComponent>(
      checkOpenClaw(),
      { status: 'unreachable', transport: 'acp', error: 'health check timed out' },
      Number(process.env.OPENCLAW_HEALTH_TIMEOUT_MS || 45000),
    ),
    withHealthTimeout<HealthComponent>(checkHermes(), { status: 'unreachable', error: 'health check timed out' }, 5000),
  ]);

  const core: Array<{ status: string }> = [db, lmstudio, openclaw];
  const monitored: Array<{ status: string }> = hermes.status === 'unconfigured'
    ? core
    : [...core, hermes];
  const allUp = monitored.every((s) => s.status === 'ok');
  const degraded = monitored.some((s) => s.status === 'ok');

  return NextResponse.json({
    status: allUp ? 'ok' : degraded ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: { db, lmstudio, openclaw, hermes },
  }, { status: allUp ? 200 : degraded ? 200 : 503 });
}
