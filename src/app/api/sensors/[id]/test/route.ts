import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const startedAt = Date.now();
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({
    where: { id },
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });

  const latestReading = sensor.readings[0];
  return NextResponse.json({
    success: true,
    data: {
      status: sensor.enabled ? 'success' : 'error',
      responseTime: Date.now() - startedAt,
      ...(latestReading ? { lastReading: { value: latestReading.value, timestamp: latestReading.timestamp.toISOString(), quality: 'good' } } : {}),
      message: sensor.enabled
        ? 'Local sensor record is reachable. Physical hardware connectivity is not verified by this check.'
        : 'Sensor is disabled in the local configuration.',
    },
  });
}
