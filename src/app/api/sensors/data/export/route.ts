import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

const HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

/**
 * POST /api/sensors/data/export
 *
 * CSV of the last 24 hourly buckets (UTC, oldest first): one column per
 * sensor, each cell the mean of that sensor's stored primary readings
 * in the bucket. A bucket with no readings is an EMPTY cell. Until
 * wave 9 this route returned 24 rows of fabricated zeros, which read
 * downstream as real flatlined data.
 */
export async function POST(request: Request) {
  const log = withRequest(request);
  try {
    await ensureSeedData();
    const sensors = await prisma.sensor.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const sensorIds = sensors.map((s) => s.id);

    const currentHourStart = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const windowStartMs = currentHourStart - (HOURS - 1) * HOUR_MS;

    const readings = sensorIds.length === 0
      ? []
      : await prisma.sensorReading.findMany({
          where: {
            sensorId: { in: sensorIds },
            timestamp: { gte: new Date(windowStartMs) },
          },
          select: { sensorId: true, value: true, timestamp: true },
        });

    // sums: sensorId -> bucketIndex -> [sum, count]
    const sums = new Map<string, Map<number, [number, number]>>();
    for (const reading of readings) {
      if (typeof reading.value !== 'number' || !Number.isFinite(reading.value)) continue;
      const bucket = Math.floor(
        (new Date(reading.timestamp).getTime() - windowStartMs) / HOUR_MS,
      );
      if (bucket < 0 || bucket >= HOURS) continue;
      let perSensor = sums.get(reading.sensorId);
      if (!perSensor) {
        perSensor = new Map();
        sums.set(reading.sensorId, perSensor);
      }
      const agg = perSensor.get(bucket) ?? [0, 0];
      agg[0] += reading.value;
      agg[1] += 1;
      perSensor.set(bucket, agg);
    }

    const header = ['timestamp', ...sensorIds].join(',');
    const rows: string[] = [];
    for (let bucket = 0; bucket < HOURS; bucket += 1) {
      const timestamp = new Date(windowStartMs + bucket * HOUR_MS).toISOString();
      const cells = sensorIds.map((id) => {
        const agg = sums.get(id)?.get(bucket);
        return agg ? String(Math.round((agg[0] / agg[1]) * 100) / 100) : '';
      });
      rows.push([timestamp, ...cells].join(','));
    }

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sensor-export.csv"',
      },
    });
  } catch (error) {
    log.error('sensors.data_export_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to export sensor data' }, { status: 500 });
  }
}
