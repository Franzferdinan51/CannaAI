import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({ where: { id } });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });

  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: id },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  const data = readings.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    value: r.value ?? 0,
    quality: 'good',
    sensorId: sensor.id,
    roomName: sensor.room?.name,
    location: sensor.locationId
  }));

  return NextResponse.json({ success: true, data });
}
