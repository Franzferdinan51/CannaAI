/**
 * /api/health-check - Enhanced health check for full stack
 * Tests DB, LM Studio, OpenClaw connectivity
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

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
    const res = await fetch(`${LM_STUDIO_URL}/v1/models`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        status: 'ok',
        models: (data.data || []).length,
        modelsLoaded: (data.data || []).filter((m: any) => m.loaded).length,
      };
    }
    return { status: 'http_error', code: res.status };
  } catch (e) {
    return { status: 'unreachable', error: String(e).slice(0, 80) };
  }
}

async function checkOpenClaw() {
  try {
    const res = await fetch(`${process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return { status: 'ok' };
    return { status: 'http_error', code: res.status };
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
