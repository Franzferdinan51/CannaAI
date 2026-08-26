import { NextResponse } from 'next/server';
import { detectAvailableProviders } from '@/lib/ai-provider-detection';
import { getAnalyzeCache } from '@/lib/analyze-cache';

// Export configuration for dual-mode compatibility
// Health reflects the current process and provider state; never freeze it at
// build time or cache a stale provider snapshot.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = false;

async function withHealthTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
      timer.unref?.();
    });
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  const mem = process.memoryUsage();
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'CannaAI Health Check',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || 'unknown',
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
    memory: {
      rssMB: Math.round((mem.rss || 0) / 1024 / 1024),
      heapUsedMB: Math.round((mem.heapUsed || 0) / 1024 / 1024),
      heapTotalMB: Math.round((mem.heapTotal || 0) / 1024 / 1024),
      externalMB: Math.round((mem.external || 0) / 1024 / 1024),
    },
  } as Record<string, any>;

  // Non-blocking best-effort provider summary — never let probe failures
  // flip the health endpoint to unhealthy.
  try {
    const detected = await withHealthTimeout(detectAvailableProviders({ fastLocal: true }), 4000);
    if (detected) {
      const available = (detected.all || []).filter((p: any) => p.isAvailable).map((p: any) => p.provider);
      const unavailable = (detected.all || []).filter((p: any) => !p.isAvailable).map((p: any) => p.provider);
      health.providers = {
        primary: detected.primary?.provider || null,
        available,
        unavailable,
        count: (detected.all || []).length,
      };
    } else {
      health.providers = { timedOut: true };
    }
  } catch (e: any) {
    health.providers = { error: e?.message || String(e) };
  }

  // Cache stats — useful when triaging slow /api/analyze paths.
  try {
    health.analyzeCache = getAnalyzeCache().describe();
  } catch (e: any) {
    health.analyzeCache = { error: e?.message || String(e) };
  }

  return NextResponse.json(health);
}
