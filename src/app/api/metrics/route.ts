/**
 * Prometheus-style metrics endpoint.
 * Measurements are collected per request so runtime values remain truthful.
 */

import { NextResponse } from 'next/server';
import { getAnalyzeCache } from '@/lib/analyze-cache';
import { detectAvailableProviders } from '@/lib/ai-provider-detection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProviderSummary = {
  primary: string | null;
  available: string[];
  unavailable: string[];
  count: number;
  timedOut?: boolean;
  error?: string;
};

async function getProviderSummary(): Promise<ProviderSummary> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 3000);
      timer.unref?.();
    });
    const detected = await Promise.race([detectAvailableProviders({ fastLocal: true, localOnly: true }), timeout]);
    if (!detected) return { primary: null, available: [], unavailable: [], count: 0, timedOut: true };

    const all = detected.all || [];
    return {
      primary: detected.primary?.provider || null,
      available: all.filter((provider: any) => provider.isAvailable).map((provider: any) => provider.provider),
      unavailable: all.filter((provider: any) => !provider.isAvailable).map((provider: any) => provider.provider),
      count: all.length,
    };
  } catch (error: any) {
    return { primary: null, available: [], unavailable: [], count: 0, error: error?.message || String(error) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function metric(lines: string[], name: string, help: string, type: 'gauge' | 'counter' | 'untyped') {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);
}

function sample(lines: string[], name: string, value: number, labels: Record<string, string> = {}) {
  const labelStr = Object.keys(labels).length
    ? '{' + Object.entries(labels).map(([key, label]) => `${key}="${String(label).replace(/"/g, '\\"')}"`).join(',') + '}'
    : '';
  lines.push(`${name}${labelStr} ${value}`);
}

export async function GET() {
  const memory = process.memoryUsage();
  const cache = getAnalyzeCache().describe();
  const providers = await getProviderSummary();
  const lines: string[] = [];

  metric(lines, 'cannaai_build_info', 'Static build information', 'gauge');
  sample(lines, 'cannaai_build_info', 1, {
    version: process.env.npm_package_version || 'unknown', node: process.version, pid: String(process.pid),
  });
  metric(lines, 'cannaai_uptime_seconds', 'Process uptime in seconds', 'gauge');
  sample(lines, 'cannaai_uptime_seconds', process.uptime());
  metric(lines, 'cannaai_memory_bytes', 'Process memory usage', 'gauge');
  sample(lines, 'cannaai_memory_bytes', memory.rss || 0, { type: 'rss' });
  sample(lines, 'cannaai_memory_bytes', memory.heapUsed || 0, { type: 'heap_used' });
  sample(lines, 'cannaai_memory_bytes', memory.heapTotal || 0, { type: 'heap_total' });
  sample(lines, 'cannaai_memory_bytes', memory.external || 0, { type: 'external' });

  metric(lines, 'cannaai_analyze_cache_entries', 'Entries currently in the analyze result cache', 'gauge');
  sample(lines, 'cannaai_analyze_cache_entries', cache.entries || 0);
  metric(lines, 'cannaai_analyze_cache_bytes', 'Approximate bytes stored in the analyze cache', 'gauge');
  sample(lines, 'cannaai_analyze_cache_bytes', cache.totalBytesApprox || 0);
  metric(lines, 'cannaai_analyze_cache_hits_total', 'Cumulative analyze cache hits', 'counter');
  sample(lines, 'cannaai_analyze_cache_hits_total', cache.stats?.hits || 0);
  metric(lines, 'cannaai_analyze_cache_misses_total', 'Cumulative analyze cache misses', 'counter');
  sample(lines, 'cannaai_analyze_cache_misses_total', cache.stats?.misses || 0);
  metric(lines, 'cannaai_analyze_cache_evictions_total', 'Cumulative analyze cache evictions', 'counter');
  sample(lines, 'cannaai_analyze_cache_evictions_total', cache.stats?.evictions || 0);
  metric(lines, 'cannaai_analyze_cache_errors_total', 'Cumulative analyze cache errors', 'counter');
  sample(lines, 'cannaai_analyze_cache_errors_total', cache.stats?.errors || 0);

  metric(lines, 'cannaai_providers_detected', 'Detected AI providers (1 = available, 0 = unavailable)', 'gauge');
  for (const provider of providers.available) sample(lines, 'cannaai_providers_detected', 1, { provider, status: 'available' });
  for (const provider of providers.unavailable) sample(lines, 'cannaai_providers_detected', 0, { provider, status: 'unavailable' });

  return new NextResponse(lines.join('\n') + '\n', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
