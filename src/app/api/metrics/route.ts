/**
 * Prometheus-style metrics endpoint.
 *
 * Exposes the runtime + cache counters in a text/plain scrape format
 * that Prometheus / VictoriaMetrics / Grafana Agent can ingest directly.
 *
 * We deliberately do NOT pull in the prom-client dependency — the
 * surface area we expose is small enough that hand-rolling is clearer
 * and keeps the bundle small.
 */

import { NextResponse } from 'next/server';
import { getAnalyzeCache } from '@/lib/analyze-cache';
import { detectAvailableProviders } from '@/lib/ai-provider-detection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const mem = process.memoryUsage();

const analyzeCache = getAnalyzeCache().describe();

let providerSummary: { primary: string | null; available: string[]; unavailable: string[]; count: number; timedOut?: boolean; error?: string } | null = null;
try {
  // 3-second cap — never let /api/metrics hang the scraper
  const detected = await Promise.race<any>([
    detectAvailableProviders(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
  ]);
  if (detected) {
    const all = detected.all || [];
    providerSummary = {
      primary: detected.primary?.provider || null,
      available: all.filter((p: any) => p.isAvailable).map((p: any) => p.provider),
      unavailable: all.filter((p: any) => !p.isAvailable).map((p: any) => p.provider),
      count: all.length,
    };
  } else {
    providerSummary = { primary: null, available: [], unavailable: [], count: 0, timedOut: true };
  }
} catch (e: any) {
  providerSummary = { primary: null, available: [], unavailable: [], count: 0, error: e?.message || String(e) };
}

const lines: string[] = [];

function metric(name: string, help: string, type: 'gauge' | 'counter' | 'untyped') {
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} ${type}`);
}

function sample(name: string, value: number, labels: Record<string, string> = {}) {
  const labelStr = Object.keys(labels).length
    ? '{' + Object.entries(labels).map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`).join(',') + '}'
    : '';
  lines.push(`${name}${labelStr} ${value}`);
}

metric('cannaai_build_info', 'Static build information', 'gauge');
sample('cannaai_build_info', 1, {
  version: process.env.npm_package_version || 'unknown',
  node: process.version,
  pid: String(process.pid),
});

metric('cannaai_uptime_seconds', 'Process uptime in seconds', 'gauge');
sample('cannaai_uptime_seconds', process.uptime());

metric('cannaai_memory_bytes', 'Process memory usage', 'gauge');
sample('cannaai_memory_bytes{type="rss"}', mem.rss || 0);
sample('cannaai_memory_bytes{type="heap_used"}', mem.heapUsed || 0);
sample('cannaai_memory_bytes{type="heap_total"}', mem.heapTotal || 0);
sample('cannaai_memory_bytes{type="external"}', mem.external || 0);

metric('cannaai_analyze_cache_entries', 'Entries currently in the analyze result cache', 'gauge');
sample('cannaai_analyze_cache_entries', analyzeCache.entries || 0);

metric('cannaai_analyze_cache_bytes', 'Approximate bytes stored in the analyze cache', 'gauge');
sample('cannaai_analyze_cache_bytes', analyzeCache.totalBytesApprox || 0);

metric('cannaai_analyze_cache_hits_total', 'Cumulative analyze cache hits', 'counter');
sample('cannaai_analyze_cache_hits_total', analyzeCache.stats?.hits || 0);
metric('cannaai_analyze_cache_misses_total', 'Cumulative analyze cache misses', 'counter');
sample('cannaai_analyze_cache_misses_total', analyzeCache.stats?.misses || 0);
metric('cannaai_analyze_cache_evictions_total', 'Cumulative analyze cache evictions', 'counter');
sample('cannaai_analyze_cache_evictions_total', analyzeCache.stats?.evictions || 0);
metric('cannaai_analyze_cache_errors_total', 'Cumulative analyze cache errors', 'counter');
sample('cannaai_analyze_cache_errors_total', analyzeCache.stats?.errors || 0);

metric('cannaai_providers_detected', 'Detected AI providers (1 = available, 0 = unavailable)', 'gauge');
if (providerSummary) {
  for (const p of providerSummary.available) {
    sample('cannaai_providers_detected', 1, { provider: p, status: 'available' });
  }
  for (const p of providerSummary.unavailable) {
    sample('cannaai_providers_detected', 0, { provider: p, status: 'unavailable' });
  }
}

const body = lines.join('\n') + '\n';

export async function GET() {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
