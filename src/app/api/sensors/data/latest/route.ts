import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const sensors = await prisma.sensor.findMany({
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 }, room: true }
  });
  const now = new Date().toISOString();
  const data = sensors.reduce<Record<string, any>>((acc, sensor) => {
    const latest = sensor.readings[0];
    acc[sensor.id] = {
      sensorId: sensor.id,
      roomName: sensor.room?.name,
      location: sensor.locationId,
      lastUpdated: latest?.timestamp.toISOString() ?? now,
      reading: latest?.value ?? 0
    };
    return acc;
  }, {});

  return NextResponse.json({ success: true, data, timestamp: now });
}
