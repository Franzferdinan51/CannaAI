import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

const KNOWN_QUALITIES = new Set(['good', 'fair', 'poor']);

/**
 * Honest quality for a reading: a missing (null) value can never be
 * 'good'. Otherwise use the quality recorded in the reading's metadata
 * (`data.quality`, the same convention as the sensor test route) when
 * it is a known value; with no such signal, report 'unknown' instead
 * of fabricating 'good'.
 */
function readingQuality(value: number | null, data: unknown): string {
  if (value === null) return 'unknown';
  const metadata =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return typeof metadata.quality === 'string' && KNOWN_QUALITIES.has(metadata.quality)
    ? metadata.quality
    : 'unknown';
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({
    where: { id },
    include: { room: true }
  });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });

  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: id },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const data = readings.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    // Keep a missing reading null — coercing it to 0 would present a
    // fabricated measurement as real.
    value: r.value,
    quality: readingQuality(r.value, r.data),
    sensorId: sensor.id,
    roomName: sensor.room?.name,
    location: sensor.locationId
  }));

  return NextResponse.json({ success: true, data });
}
