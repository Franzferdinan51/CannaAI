import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

const TIMEFRAME_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const RESOLUTION_MS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

interface Bucket {
  timestamp: number;
  sums: Map<string, { sum: number; count: number }>;
}

function add(bucket: Bucket, key: string, value: number | null) {
  if (value === null) return;
  const current = bucket.sums.get(key) || { sum: 0, count: 0 };
  current.sum += value;
  current.count += 1;
  bucket.sums.set(key, current);
}

export async function GET(request: Request) {
  await ensureSeedData();
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '24h';
  const duration = TIMEFRAME_MS[timeframe] || TIMEFRAME_MS['24h'];
  const requestedResolution = searchParams.get('resolution') || (duration > TIMEFRAME_MS['6h'] ? '1h' : '5m');
  const raw = requestedResolution === 'raw';
  const bucketMs = raw ? 0 : RESOLUTION_MS[requestedResolution] || RESOLUTION_MS['1h'];
  const resolution = raw ? 'raw' : requestedResolution in RESOLUTION_MS ? requestedResolution : '1h';

  const sensorsParam = searchParams.get('sensors');
  let sensors = sensorsParam ? sensorsParam.split(',').map((value) => value.trim()).filter(Boolean) : [];
  if (sensors.length === 0) {
    sensors = (await prisma.sensor.findMany({ select: { id: true }, orderBy: { name: 'asc' } })).map((sensor) => sensor.id);
  }
  if (sensors.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      metadata: { sensors, timeframe, resolution, totalPoints: 0 },
    });
  }

  const end = new Date();
  const start = new Date(end.getTime() - duration);
  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: { in: sensors }, timestamp: { gte: start, lte: end } },
    orderBy: { timestamp: 'asc' },
  });

  const buckets = new Map<number, Bucket>();
  for (const reading of readings) {
    const timestamp = raw
      ? reading.timestamp.getTime()
      : Math.floor(reading.timestamp.getTime() / bucketMs) * bucketMs;
    let bucket = buckets.get(timestamp);
    if (!bucket) {
      bucket = { timestamp, sums: new Map() };
      buckets.set(timestamp, bucket);
    }

    const details = record(reading.data);
    const temperature = finite(details.temperature) ?? finite(reading.value);
    const humidity = finite(details.humidity);
    const vpd = finite(details.vpd);

    add(bucket, reading.sensorId, finite(reading.value));
    add(bucket, `${reading.sensorId}_temperature`, temperature);
    add(bucket, `${reading.sensorId}_humidity`, humidity);
    add(bucket, `${reading.sensorId}_vpd`, vpd);

    // Friendly climate keys make the common one-controller grow readable
    // without requiring chart code to know the generated sensor id.
    if (temperature !== null || humidity !== null || vpd !== null) {
      add(bucket, 'temperature', temperature);
      add(bucket, 'humidity', humidity);
      add(bucket, 'vpd', vpd);
    }
  }

  const data = [...buckets.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((bucket) => {
      const row: Record<string, string | number> = { timestamp: new Date(bucket.timestamp).toISOString() };
      for (const [key, value] of bucket.sums.entries()) {
        row[key] = Math.round((value.sum / value.count) * 100) / 100;
      }
      return row;
    });

  return NextResponse.json({
    success: true,
    data,
    metadata: {
      sensors,
      timeframe,
      resolution,
      totalPoints: data.length,
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
}
