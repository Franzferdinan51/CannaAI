import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const TIMEFRAMES = ['1h', '6h', '24h', '7d', '30d', '90d'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const SensorAnalyticsSchema = z.object({
  timeframe: z.enum(TIMEFRAMES).optional(),
});

// Window length and server-side aggregation bucket per timeframe. Short
// windows serve raw readings; long windows serve per-bucket averages so
// the payload stays chart-sized WITHOUT silently dropping readings —
// every reading inside the window feeds the statistics and its bucket,
// and the response discloses the bucket size (see `aggregation` below).
// The previous implementation ignored the timeframe entirely and served
// the newest 100 readings for every window, so a 90d view quietly showed
// only the last ~8 hours.
const TIMEFRAME_CONFIG: Record<Timeframe, { windowMs: number; bucketMs: number }> = {
  '1h': { windowMs: 60 * 60 * 1000, bucketMs: 0 },
  '6h': { windowMs: 6 * 60 * 60 * 1000, bucketMs: 0 },
  '24h': { windowMs: 24 * 60 * 60 * 1000, bucketMs: 15 * 60 * 1000 },
  '7d': { windowMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 },
  '30d': { windowMs: 30 * 24 * 60 * 60 * 1000, bucketMs: 6 * 60 * 60 * 1000 },
  '90d': { windowMs: 90 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000 },
};

type Quality = 'good' | 'fair' | 'poor' | 'unknown';
const QUALITY_RANK: Record<'good' | 'fair' | 'poor', number> = { good: 0, fair: 1, poor: 2 };

// A reading's quality is whatever the ingest recorded on its payload
// (`data.quality`, the same convention as the sensor history route) —
// never an assumed 'good' for a reading that recorded nothing.
function recordedQuality(data: unknown): Quality {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const quality = (data as Record<string, unknown>).quality;
    if (quality === 'good' || quality === 'fair' || quality === 'poor') return quality;
  }
  return 'unknown';
}

export async function POST(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = SensorAnalyticsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid analytics payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const timeframe: Timeframe = parsed.data.timeframe || '24h';
    const { windowMs, bucketMs } = TIMEFRAME_CONFIG[timeframe];
    const since = new Date(Date.now() - windowMs);
    await ensureSeedData();
    const readings = await prisma.sensorReading.findMany({
      where: { sensorId: id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
    });

    // Null-valued readings are real rows (the sensor reported, but not
    // this metric): they count toward dataQuality and are otherwise
    // excluded — a missing value is never dressed up as 0.
    const valued = readings.filter(
      (r): r is typeof r & { value: number } =>
        typeof r.value === 'number' && Number.isFinite(r.value),
    );

    const values = valued.map(r => r.value);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const current = values.length ? values[values.length - 1] : 0;
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const previous = values.length > 1 ? values[values.length - 2] : undefined;
    const trendPercentage = previous && previous !== 0
      ? ((current - previous) / Math.abs(previous)) * 100
      : 0;

    let data: Array<{ timestamp: string; value: number; quality: Quality }>;
    if (bucketMs === 0) {
      data = valued.map(reading => ({
        timestamp: reading.timestamp.toISOString(),
        value: reading.value,
        quality: recordedQuality(reading.data),
      }));
    } else {
      const buckets = new Map<number, { sum: number; count: number; quality: Quality }>();
      for (const reading of valued) {
        const start = Math.floor(reading.timestamp.getTime() / bucketMs) * bucketMs;
        const bucket = buckets.get(start) ?? { sum: 0, count: 0, quality: 'unknown' as Quality };
        bucket.sum += reading.value;
        bucket.count += 1;
        const quality = recordedQuality(reading.data);
        if (quality !== 'unknown') {
          // A bucket reports the worst quality any of its readings recorded.
          if (bucket.quality === 'unknown' || QUALITY_RANK[quality] > QUALITY_RANK[bucket.quality as 'good' | 'fair' | 'poor']) {
            bucket.quality = quality;
          }
        }
        buckets.set(start, bucket);
      }
      data = [...buckets.entries()]
        .sort(([a], [b]) => a - b)
        .map(([start, bucket]) => ({
          timestamp: new Date(start).toISOString(),
          value: bucket.sum / bucket.count,
          quality: bucket.quality,
        }));
    }

    return NextResponse.json({
      sensorId: id,
      timeframe,
      data,
      statistics: {
        min,
        max,
        avg,
        current,
        trend: trendPercentage > 1 ? 'rising' : trendPercentage < -1 ? 'falling' : 'stable',
        trendPercentage,
      },
      alerts: 0,
      // Share of readings inside the window that actually carry a value
      // for this sensor — 0 when the window is empty, never a blanket 100.
      dataQuality: readings.length ? Math.round((valued.length / readings.length) * 1000) / 10 : 0,
      aggregation: {
        bucketSeconds: bucketMs / 1000,
        readingsConsidered: readings.length,
        readingsWithValue: valued.length,
      },
    });
  } catch (error) {
    log.error('sensors.analytics_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load sensor analytics' }, { status: 500 });
  }
}
