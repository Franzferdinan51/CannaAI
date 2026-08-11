import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

let cachedBuild: { value: any; ts: number } | null = null;
const CACHE_TTL_MS = 60_000; // refresh git info at most once per minute

function safeExec(cmd: string): string | null {
  try {
    return execSync(cmd, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 1500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function buildInfo() {
  if (cachedBuild && Date.now() - cachedBuild.ts < CACHE_TTL_MS) {
    return cachedBuild.value;
  }
  const sha = safeExec('git rev-parse --short HEAD') || process.env.GIT_SHA || null;
  const longSha = safeExec('git rev-parse HEAD') || null;
  const describe = safeExec('git describe --tags --always --dirty') || null;
  const branch = safeExec('git rev-parse --abbrev-ref HEAD') || process.env.GIT_BRANCH || null;
  const builtAt = new Date().toISOString();

  const value = {
    name: 'CannaAI',
    version: process.env.npm_package_version || '0.2.0',
    node: process.versions.node,
    build: {
      sha,
      longSha,
      describe,
      branch,
      builtAt,
    },
  };
  cachedBuild = { value, ts: Date.now() };
  return value;
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

  return NextResponse.json(buildInfo());
}

