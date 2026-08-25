/**
 * /api/health-check - Enhanced health check for full stack
 * Tests DB, LM Studio, OpenClaw, and (when configured) Hermes connectivity.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkLMStudio as checkLMStudioProvider } from '@/lib/ai-provider-lmstudio';

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
  const configured = Boolean(
    process.env.HERMES_API_KEY ||
    process.env.HERMES_API_SERVER_KEY ||
    process.env.HERMES_AGENT_COMMAND,
  );
  if (!configured) return { status: 'unconfigured' as const };

  try {
    const { providerAuthStatus } = await import('@/lib/provider-auth');
    const result = await providerAuthStatus('hermes');
    return result.connected
      ? { status: 'ok' as const, source: result.source }
      : { status: 'unreachable' as const, source: result.source, error: result.summary };
  } catch (e) {
    return { status: 'unreachable' as const, error: String(e).slice(0, 80) };
  }
}

export async function GET() {
  const [db, lmstudio, openclaw, hermes] = await Promise.all([
    checkPrisma(),
    checkLMStudio(),
    checkOpenClaw(),
    checkHermes(),
  ]);

  const core = [db, lmstudio, openclaw];
  const monitored = hermes.status === 'unconfigured' ? core : [...core, hermes];
  const allUp = monitored.every((s) => s.status === 'ok');
  const degraded = monitored.some((s) => s.status === 'ok');

  return NextResponse.json({
    status: allUp ? 'ok' : degraded ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: { db, lmstudio, openclaw, hermes },
  }, { status: allUp ? 200 : degraded ? 200 : 503 });
}
