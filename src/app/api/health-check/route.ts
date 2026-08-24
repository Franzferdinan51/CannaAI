/**
 * /api/health-check - Enhanced health check for full stack
 * Tests DB, LM Studio, OpenClaw connectivity
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

export async function GET() {
  const [db, lmstudio, openclaw] = await Promise.all([
    checkPrisma(),
    checkLMStudio(),
    checkOpenClaw(),
  ]);

  const allUp = [db, lmstudio, openclaw].every((s) => s.status === 'ok');
  const degraded = [db, lmstudio, openclaw].some((s) => s.status === 'ok');

  return NextResponse.json({
    status: allUp ? 'ok' : degraded ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: { db, lmstudio, openclaw },
  }, { status: allUp ? 200 : degraded ? 200 : 503 });
}
