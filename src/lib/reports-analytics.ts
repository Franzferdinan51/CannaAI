import { prisma } from '@/lib/prisma';

// Real aggregates behind the Reports analytics tabs.
//
// The frontend (NewUI reports/api.ts) asks the analytics catch-all for
// overview / plants/growth / environmental / financial / yield / realtime /
// insights / predictions. Everything here is computed from rows that actually
// exist (SensorReading, SensorAnalytics, Plant, PlantAnalysis,
// PlantHealthAnalytics, Alert). Where this deployment has no data source at
// all (financial costs/revenue, harvest weights, growth measurements), the
// builders return explicit `available: false` markers or contract-required
// zero placeholders instead of invented numbers — see the per-builder notes.

export interface DateRange {
  start: Date;
  end: Date;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// The reports UI sends its range through axios params, which arrive as
// `dateRange[start]` / `dateRange[end]`; accept the flatter spellings other
// callers use too, plus a JSON-encoded `dateRange`.
export function parseDateRange(searchParams: URLSearchParams, fallbackDays = 30): DateRange {
  const raw = (key: string) => searchParams.get(key) || undefined;
  let startRaw = raw('dateRange[start]') || raw('dateRange.start') || raw('start') || raw('startDate') || raw('from');
  let endRaw = raw('dateRange[end]') || raw('dateRange.end') || raw('end') || raw('endDate') || raw('to');
  const packed = raw('dateRange');
  if ((!startRaw || !endRaw) && packed) {
    try {
      const parsed = JSON.parse(packed) as { start?: string; end?: string };
      startRaw = startRaw || parsed.start;
      endRaw = endRaw || parsed.end;
    } catch {
      // Not JSON — ignore and fall back to defaults below.
    }
  }
  const end = endRaw && !Number.isNaN(Date.parse(endRaw)) ? new Date(endRaw) : new Date();
  const start = startRaw && !Number.isNaN(Date.parse(startRaw))
    ? new Date(startRaw)
    : new Date(end.getTime() - fallbackDays * 24 * 60 * 60 * 1000);
  return start <= end ? { start, end } : { start: end, end: start };
}

export function parseIdList(searchParams: URLSearchParams, ...keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    for (const candidate of [key, `${key}[]`]) {
      for (const raw of searchParams.getAll(candidate)) {
        for (const part of raw.split(',')) {
          const trimmed = part.trim();
          if (trimmed) values.push(trimmed);
        }
      }
    }
  }
  return Array.from(new Set(values));
}

// ---------------------------------------------------------------------------
// Sensor readings
// ---------------------------------------------------------------------------

export interface ReadingPoint {
  timestamp: Date;
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
}

export function extractMetrics(reading: { value: number | null; data: unknown }): Omit<ReadingPoint, 'timestamp'> {
  const data = record(reading.data);
  return {
    // SensorReading.value mirrors the primary climate reading (temperature
    // for the AC Infinity ingest) when the payload omits the key.
    temperature: num(data.temperature) ?? num(reading.value),
    humidity: num(data.humidity),
    vpd: num(data.vpd),
  };
}

const MAX_READINGS = 50000;

export async function fetchReadingPoints(sensorIds: string[], range: DateRange): Promise<ReadingPoint[]> {
  if (sensorIds.length === 0) return [];
  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: { in: sensorIds }, timestamp: { gte: range.start, lte: range.end } },
    orderBy: { timestamp: 'asc' },
    take: MAX_READINGS,
    select: { timestamp: true, value: true, data: true },
  });
  return readings.map((reading) => ({ timestamp: reading.timestamp, ...extractMetrics(reading) }));
}

export interface MetricBucket {
  timestamp: Date;
  count: number;
  temperature: number | null;
  humidity: number | null;
  vpd: number | null;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

// Time-bucket reading points into ~targetBuckets windows with per-metric
// averages. Buckets with no readings are omitted (the charts render gaps,
// which is the honest picture of collection downtime).
export function bucketize(points: ReadingPoint[], range: DateRange, targetBuckets = 60): MetricBucket[] {
  if (points.length === 0) return [];
  const rangeMs = Math.max(1, range.end.getTime() - range.start.getTime());
  const bucketMs = Math.max(5 * 60 * 1000, Math.ceil(rangeMs / targetBuckets / (60 * 1000)) * 60 * 1000);
  const buckets = new Map<number, { temps: number[]; hums: number[]; vpds: number[]; count: number }>();
  for (const point of points) {
    const index = Math.floor((point.timestamp.getTime() - range.start.getTime()) / bucketMs);
    let bucket = buckets.get(index);
    if (!bucket) {
      bucket = { temps: [], hums: [], vpds: [], count: 0 };
      buckets.set(index, bucket);
    }
    bucket.count += 1;
    if (point.temperature !== null) bucket.temps.push(point.temperature);
    if (point.humidity !== null) bucket.hums.push(point.humidity);
    if (point.vpd !== null) bucket.vpds.push(point.vpd);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, bucket]) => ({
      timestamp: new Date(range.start.getTime() + index * bucketMs),
      count: bucket.count,
      temperature: average(bucket.temps),
      humidity: average(bucket.hums),
      vpd: average(bucket.vpds),
    }));
}

export interface MetricStats {
  count: number;
  average: number;
  minimum: number;
  maximum: number;
  median: number;
  standardDeviation: number;
}

export function metricStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { count: 0, average: 0, minimum: 0, maximum: 0, median: 0, standardDeviation: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  const median = sorted.length % 2 === 1
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const variance = sorted.reduce((sum, v) => sum + (v - avg) ** 2, 0) / sorted.length;
  return {
    count: sorted.length,
    average: round2(avg),
    minimum: round2(sorted[0]),
    maximum: round2(sorted[sorted.length - 1]),
    median: round2(median),
    standardDeviation: round2(Math.sqrt(variance)),
  };
}

function trendFor(buckets: MetricBucket[]): { direction: 'up' | 'down' | 'stable'; percentage: number; significance: 'high' | 'medium' | 'low' } {
  const temps = buckets.map((b) => b.temperature).filter((v): v is number => v !== null);
  if (temps.length < 2) return { direction: 'stable', percentage: 0, significance: 'low' };
  const half = Math.floor(temps.length / 2);
  const first = average(temps.slice(0, half)) ?? 0;
  const second = average(temps.slice(half)) ?? 0;
  if (first === 0) return { direction: 'stable', percentage: 0, significance: 'low' };
  const percentage = round2(((second - first) / Math.abs(first)) * 100);
  const direction = percentage > 1 ? 'up' : percentage < -1 ? 'down' : 'stable';
  const significance = Math.abs(percentage) >= 5 ? 'high' : Math.abs(percentage) >= 2 ? 'medium' : 'low';
  return { direction, percentage, significance };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function buildOverview(range: DateRange, roomIds: string[]) {
  const sensors = await prisma.sensor.findMany({
    where: roomIds.length ? { locationId: { in: roomIds } } : {},
    select: { id: true },
  });
  const points = await fetchReadingPoints(sensors.map((s) => s.id), range);
  const emptySummary = {
    total: 0, average: 0, minimum: 0, maximum: 0, median: 0, standardDeviation: 0,
    trend: { direction: 'stable' as const, percentage: 0, significance: 'low' as const },
    growth: { absolute: 0, percentage: 0, period: 'selected range' },
  };
  if (points.length === 0) {
    return {
      timeSeries: [],
      summary: emptySummary,
      available: false,
      message: 'No sensor readings were collected in the selected range.',
    };
  }
  const buckets = bucketize(points, range);
  const temps = points.map((p) => p.temperature).filter((v): v is number => v !== null);
  const stats = metricStats(temps);
  const firstTemp = buckets.find((b) => b.temperature !== null)?.temperature ?? 0;
  const lastTemp = [...buckets].reverse().find((b) => b.temperature !== null)?.temperature ?? 0;
  return {
    timeSeries: buckets.map((bucket) => ({
      timestamp: bucket.timestamp.toISOString(),
      value: bucket.temperature !== null ? round2(bucket.temperature) : 0,
      humidity: bucket.humidity !== null ? round2(bucket.humidity) : 0,
      vpd: bucket.vpd !== null ? round2(bucket.vpd) : 0,
      metric: 'temperature',
      unit: '°F',
      quality: bucket.count >= 3 ? 'good' : 'fair',
      metadata: { readings: bucket.count },
    })),
    summary: {
      total: stats.count,
      average: stats.average,
      minimum: stats.minimum,
      maximum: stats.maximum,
      median: stats.median,
      standardDeviation: stats.standardDeviation,
      trend: trendFor(buckets),
      growth: {
        absolute: round2(lastTemp - firstTemp),
        percentage: firstTemp !== 0 ? round2(((lastTemp - firstTemp) / Math.abs(firstTemp)) * 100) : 0,
        period: 'selected range',
      },
    },
    available: true,
  };
}

// ---------------------------------------------------------------------------
// Environmental (per room)
// ---------------------------------------------------------------------------

const EVENT_SEVERITY: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  critical: 'critical',
  high: 'high',
  warning: 'medium',
  medium: 'medium',
  low: 'low',
  info: 'low',
};

export async function buildEnvironmental(range: DateRange, roomIds: string[]) {
  const rooms = await prisma.room.findMany({
    where: roomIds.length ? { id: { in: roomIds } } : {},
    include: { sensors: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  const results = [];
  for (const room of rooms) {
    if (room.sensors.length === 0) continue; // No sensors → no environmental analytics for the room.
    const sensorIds = room.sensors.map((s) => s.id);
    const points = await fetchReadingPoints(sensorIds, range);
    const buckets = bucketize(points, range);
    const temps = points.map((p) => p.temperature).filter((v): v is number => v !== null);
    const hums = points.map((p) => p.humidity).filter((v): v is number => v !== null);
    const vpds = points.map((p) => p.vpd).filter((v): v is number => v !== null);

    const alerts = await prisma.alert.findMany({
      where: { sensorId: { in: sensorIds }, createdAt: { gte: range.start, lte: range.end } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const zeroLight = { intensity: 0, duration: 0, spectrum: { blue: 0, green: 0, red: 0, far_red: 0, uv: 0 }, dli: 0 };
    const zeroWater = { ph: 0, ec: 0, temperature: 0, oxygen: 0, nutrients: [] as never[] };

    results.push({
      roomId: room.id,
      roomName: room.name,
      timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      // co2 / light / water metrics stay 0: no installed sensor reports them
      // (the AC Infinity payload carries temperature, humidity and VPD only).
      // They are structural placeholders required by the UI contract, not
      // measurements.
      conditions: buckets.map((bucket) => ({
        timestamp: bucket.timestamp.toISOString(),
        temperature: bucket.temperature !== null ? round2(bucket.temperature) : 0,
        humidity: bucket.humidity !== null ? round2(bucket.humidity) : 0,
        co2: 0,
        light: zeroLight,
        air: {
          vpd: bucket.vpd !== null ? round2(bucket.vpd) : 0,
          pressure: 0,
          circulation: 0,
          quality: { oxygen: 0, volatileOrganicCompounds: 0, particulates: 0 },
        },
        water: zeroWater,
      })),
      averages: {
        temperature: round2(average(temps) ?? 0),
        humidity: round2(average(hums) ?? 0),
        co2: 0,
        lightIntensity: 0,
        vpd: round2(average(vpds) ?? 0),
        ph: 0,
        ec: 0,
      },
      events: alerts.map((alert) => ({
        timestamp: alert.createdAt.toISOString(),
        type: 'alert' as const,
        severity: EVENT_SEVERITY[alert.severity] ?? 'low',
        message: alert.message,
        data: { alertType: alert.type, acknowledged: alert.acknowledged },
      })),
      efficiency: {
        energy: { consumption: 0, cost: 0, efficiency: 0, savings: 0 },
        water: { consumption: 0, recycling: 0, efficiency: 0, savings: 0 },
        nutrients: { usage: 0, waste: 0, efficiency: 0, savings: 0 },
      },
      available: points.length > 0,
      ...(points.length === 0 ? { message: 'No sensor readings for this room in the selected range.' } : {}),
    });
  }
  // Rooms with actual readings first so the dashboard's [0] is meaningful.
  return results.sort((a, b) => Number(b.available) - Number(a.available));
}

// ---------------------------------------------------------------------------
// Plant growth
// ---------------------------------------------------------------------------

const GROWTH_STAGES = ['germination', 'seedling', 'vegetative', 'flowering', 'ripening', 'harvest'];

export async function buildPlantGrowth(
  range: DateRange,
  filters: { plantIds: string[]; strainIds: string[]; roomIds: string[]; growthStages: string[] },
) {
  const plants = await prisma.plant.findMany({
    where: {
      ...(filters.plantIds.length ? { id: { in: filters.plantIds } } : {}),
      ...(filters.strainIds.length ? { strainId: { in: filters.strainIds } } : {}),
      ...(filters.roomIds.length ? { locationId: { in: filters.roomIds } } : {}),
      ...(filters.growthStages.length ? { stage: { in: filters.growthStages } } : {}),
    },
    include: { strain: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];
  for (const plant of plants) {
    const [historyInRange, latestHealth] = await Promise.all([
      prisma.plantHealthAnalytics.findMany({
        where: { plantId: plant.id, timestamp: { gte: range.start, lte: range.end } },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.plantHealthAnalytics.findFirst({
        where: { plantId: plant.id },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const healthJson = record(plant.health);
    const healthScore = latestHealth?.healthScore
      ?? num(healthJson.score)
      ?? (historyInRange.length ? historyInRange[historyInRange.length - 1].healthScore : null);
    if (healthScore === null) continue; // No health signal anywhere → no growth analytics for this plant yet.

    const recommendationsRaw = (latestHealth?.recommendations ?? healthJson.recommendations) as unknown;
    const recommendations = Array.isArray(recommendationsRaw)
      ? recommendationsRaw.filter((item): item is string => typeof item === 'string')
      : [];

    let growthRate = 0;
    if (historyInRange.length >= 2) {
      const first = historyInRange[0];
      const last = historyInRange[historyInRange.length - 1];
      const days = (last.timestamp.getTime() - first.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      if (days > 0) growthRate = round2((last.healthScore - first.healthScore) / days);
    }

    results.push({
      plantId: plant.id,
      plantName: plant.name,
      strain: plant.strain?.name ?? 'Unknown strain',
      growthStage: plant.stage && GROWTH_STAGES.includes(plant.stage) ? plant.stage : (plant.stage ?? 'seedling'),
      // Measurements carry the health series recorded by plant analyses.
      // No physical measurement source (height/width/leaf count) exists in
      // this deployment, so those fields are 0 and the health score is the
      // real signal.
      measurements: historyInRange.map((row) => ({
        timestamp: row.timestamp.toISOString(),
        height: 0,
        width: 0,
        leafCount: 0,
        color: { dominant: 'unknown', variance: 0, chlorophyll: 0, stress: 0 },
        health: {
          score: row.healthScore,
          issues: (Array.isArray(row.issues) ? row.issues : []).map((issue) => {
            const issueRecord = record(issue);
            return {
              type: typeof issueRecord.type === 'string' ? issueRecord.type : 'observation',
              severity: 'medium' as const,
              description: typeof issue === 'string' ? issue : (typeof issueRecord.description === 'string' ? issueRecord.description : 'Analysis observation'),
              recommendation: '',
            };
          }),
          nutrients: [],
          pests: [],
          diseases: [],
        },
        environmental: {
          temperature: 0, humidity: 0, co2: 0,
          light: { intensity: 0, duration: 0, spectrum: { blue: 0, green: 0, red: 0, far_red: 0, uv: 0 }, dli: 0 },
          air: { vpd: 0, pressure: 0, circulation: 0, quality: { oxygen: 0, volatileOrganicCompounds: 0, particulates: 0 } },
          water: { ph: 0, ec: 0, temperature: 0, oxygen: 0, nutrients: [] },
        },
      })),
      healthScore: round2(healthScore),
      growthRate,
      // No harvest/yield data source exists yet, so there is no honest
      // estimate; the UI contract requires the object, zeros mean "none".
      yieldPrediction: {
        estimated: 0,
        unit: 'g',
        confidence: 0,
        factors: [],
        timeline: (plant.plantedDate ?? plant.createdAt).toISOString(),
      },
      recommendations,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

const INSIGHT_SEVERITY: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  critical: 'critical',
  high: 'high',
  warning: 'medium',
  medium: 'medium',
  low: 'low',
  info: 'low',
};

export async function buildInsights(range: DateRange) {
  const insights: Record<string, unknown>[] = [];

  const alerts = await prisma.alert.findMany({
    where: { createdAt: { gte: range.start, lte: range.end } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: { sensor: { select: { name: true } } },
  });
  for (const alert of alerts) {
    insights.push({
      type: 'alert',
      severity: INSIGHT_SEVERITY[alert.severity] ?? 'low',
      title: `${alert.type.replace(/_/g, ' ')}${alert.sensor ? ` — ${alert.sensor.name}` : ''}`,
      description: alert.message,
      impact: 'Environmental condition outside its target range',
      confidence: 1,
      timestamp: alert.createdAt.toISOString(),
      data: { alertId: alert.id, acknowledged: alert.acknowledged },
    });
  }

  const flagged = await prisma.sensorAnalytics.groupBy({
    by: ['status'],
    where: { timestamp: { gte: range.start, lte: range.end }, status: { not: 'ok' } },
    _count: { _all: true },
  });
  for (const group of flagged) {
    insights.push({
      type: 'anomaly',
      severity: group.status === 'critical' ? 'high' : 'medium',
      title: `${group._count._all} sensor readings flagged "${group.status}"`,
      description: `The ingest pipeline marked ${group._count._all} readings as ${group.status} in the selected range.`,
      impact: 'Conditions drifted outside expected bands during the range',
      confidence: 1,
      timestamp: range.end.toISOString(),
      data: { status: group.status, count: group._count._all },
    });
  }

  const plants = await prisma.plant.findMany({ select: { id: true, name: true, health: true } });
  for (const plant of plants) {
    const latest = await prisma.plantHealthAnalytics.findFirst({
      where: { plantId: plant.id },
      orderBy: { timestamp: 'desc' },
    });
    const score = latest?.healthScore ?? num(record(plant.health).score);
    if (score !== null && score < 70) {
      insights.push({
        type: 'recommendation',
        severity: score < 40 ? 'high' : 'medium',
        title: `${plant.name} health score is ${round2(score)}`,
        description: `Latest recorded health score for ${plant.name} is below the healthy band (70+). Review the plant and run a fresh photo analysis.`,
        impact: 'Plant health needs attention',
        confidence: latest?.confidence ?? 0.8,
        timestamp: (latest?.timestamp ?? new Date()).toISOString(),
        data: { plantId: plant.id, healthScore: score },
      });
    }
  }

  return insights.slice(0, 20);
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export async function buildRealtime() {
  const sensors = await prisma.sensor.findMany({
    include: {
      room: { select: { id: true, name: true } },
      readings: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
    orderBy: { name: 'asc' },
  });
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [readingsLastHour, unacknowledgedAlerts, activePlants] = await Promise.all([
    prisma.sensorReading.count({ where: { timestamp: { gte: hourAgo } } }),
    prisma.alert.count({ where: { acknowledged: false } }),
    prisma.plant.count({ where: { isActive: true } }),
  ]);
  return {
    available: sensors.some((s) => s.readings.length > 0),
    timestamp: new Date().toISOString(),
    sensors: sensors.map((sensor) => {
      const latest = sensor.readings[0];
      const metrics = latest ? extractMetrics(latest) : { temperature: null, humidity: null, vpd: null };
      return {
        sensorId: sensor.id,
        name: sensor.name,
        type: sensor.type,
        roomId: sensor.room?.id ?? sensor.locationId,
        roomName: sensor.room?.name ?? null,
        temperature: metrics.temperature,
        humidity: metrics.humidity,
        vpd: metrics.vpd,
        updatedAt: latest ? latest.timestamp.toISOString() : null,
      };
    }),
    summary: { readingsLastHour, unacknowledgedAlerts, activePlants },
  };
}
