/** @jest-environment node */

/**
 * POST /api/sensors/[id]/analytics — per-sensor analytics for the
 * SensorAnalytics dashboard component.
 *
 * First route tests for this endpoint. They pin the wave-27 fix for the
 * silent truncation the 2026-11-27 audit flagged as an investigation:
 * the old handler ignored the timeframe and served the newest 100
 * readings for every window (a 90d view quietly showed ~8 hours),
 * zero-filled missing values, and labelled every point quality 'good'.
 * The contracts pinned here:
 *  - the query is bounded by the requested timeframe window and has
 *    no row cap;
 *  - statistics cover every valued reading in the window;
 *  - long windows aggregate server-side into disclosed buckets;
 *  - null values are excluded (never 0) and counted in dataQuality;
 *  - point quality comes from the reading's recorded metadata or is
 *    'unknown' — never an assumed 'good';
 *  - an unknown timeframe is a JSON 400; an empty window is an honest
 *    empty result.
 */

const mockFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: { sensorReading: { findMany: mockFindMany } },
}));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/logger', () => ({
  withRequest: () => ({ error: () => {}, info: () => {}, debug: () => {}, warn: () => {} }),
  getLogger: () => ({ error: () => {}, info: () => {}, debug: () => {}, warn: () => {} }),
}));

import { POST } from '@/app/api/sensors/[id]/analytics/route';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function reading(minutesAgo: number, value: number | null, data: Record<string, unknown> | null = null) {
  return {
    id: `r-${minutesAgo}-${value}`,
    sensorId: 'sensor-1',
    value,
    data,
    timestamp: new Date(Date.now() - minutesAgo * MIN),
  };
}

function post(body: unknown) {
  return POST(
    new Request('http://100.88.161.36:3000/api/sensors/sensor-1/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'sensor-1' }) },
  );
}

describe('POST /api/sensors/[id]/analytics', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue([]);
  });

  it('bounds the query by the requested window with no row cap', async () => {
    const before = Date.now();
    const response = await post({ timeframe: '7d' });
    expect(response.status).toBe(200);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where.sensorId).toBe('sensor-1');
    expect(arg.take).toBeUndefined();
    const gte = (arg.where.timestamp.gte as Date).getTime();
    expect(before - gte).toBeGreaterThanOrEqual(7 * DAY - 5000);
    expect(before - gte).toBeLessThanOrEqual(7 * DAY + 5000);
    expect(arg.orderBy).toEqual({ timestamp: 'asc' });
  });

  it('defaults to the 24h window when no timeframe is given', async () => {
    const before = Date.now();
    await post({});
    const gte = (mockFindMany.mock.calls[0][0].where.timestamp.gte as Date).getTime();
    expect(before - gte).toBeGreaterThanOrEqual(DAY - 5000);
    expect(before - gte).toBeLessThanOrEqual(DAY + 5000);
  });

  it('rejects an unknown timeframe with a JSON 400 and never queries', async () => {
    const response = await post({ timeframe: '3y' });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('computes statistics over every valued reading in the window', async () => {
    // 150 readings — more than the old handler's silent 100-row cap.
    const rows = Array.from({ length: 150 }, (_, i) => reading(150 - i, i + 1));
    mockFindMany.mockResolvedValue(rows);

    const response = await post({ timeframe: '6h' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.statistics.min).toBe(1);
    expect(body.statistics.max).toBe(150);
    expect(body.statistics.avg).toBeCloseTo(75.5);
    expect(body.statistics.current).toBe(150);
    expect(body.aggregation.readingsConsidered).toBe(150);
    expect(body.aggregation.readingsWithValue).toBe(150);
    expect(body.aggregation.bucketSeconds).toBe(0);
    expect(body.data).toHaveLength(150);
  });

  it('aggregates long windows into disclosed buckets of averages', async () => {
    // Three readings inside one 15-minute bucket, one in the next.
    mockFindMany.mockResolvedValue([
      reading(20, 10),
      reading(18, 20),
      reading(16, 30),
      reading(2, 50),
    ]);

    const response = await post({ timeframe: '24h' });
    const body = await response.json();

    expect(body.aggregation.bucketSeconds).toBe(900);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.length).toBeLessThanOrEqual(2);
    const bucketValues = body.data.map((p: { value: number }) => p.value);
    expect(bucketValues).toContain(50);
    // Statistics still cover the raw readings, not the bucket means.
    expect(body.statistics.avg).toBeCloseTo(27.5);
    expect(body.statistics.max).toBe(50);
  });

  it('excludes null values instead of zero-filling them, and counts them in dataQuality', async () => {
    mockFindMany.mockResolvedValue([
      reading(30, 70),
      reading(20, null),
      reading(10, 74),
      reading(5, null),
    ]);

    const response = await post({ timeframe: '1h' });
    const body = await response.json();

    expect(body.data).toHaveLength(2);
    expect(body.data.map((p: { value: number }) => p.value)).toEqual([70, 74]);
    expect(body.statistics.min).toBe(70);
    expect(body.dataQuality).toBe(50);
    expect(body.aggregation.readingsConsidered).toBe(4);
    expect(body.aggregation.readingsWithValue).toBe(2);
  });

  it('reports recorded quality, and unknown when nothing was recorded — never an assumed good', async () => {
    mockFindMany.mockResolvedValue([
      reading(10, 70, { quality: 'poor' }),
      reading(5, 72, null),
      reading(1, 71, { quality: 'fair' }),
    ]);

    const response = await post({ timeframe: '1h' });
    const body = await response.json();

    expect(body.data.map((p: { quality: string }) => p.quality)).toEqual(['poor', 'unknown', 'fair']);
  });

  it('serves an honest empty result for an empty window', async () => {
    const response = await post({ timeframe: '30d' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.statistics).toEqual({
      min: 0,
      max: 0,
      avg: 0,
      current: 0,
      trend: 'stable',
      trendPercentage: 0,
    });
    expect(body.dataQuality).toBe(0);
    expect(body.aggregation.readingsConsidered).toBe(0);
  });
});
