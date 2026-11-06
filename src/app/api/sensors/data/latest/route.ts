import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function GET() {
  await ensureSeedData();
  const sensors = await prisma.sensor.findMany({
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 }, room: true },
    orderBy: { name: 'asc' },
  });

  const data = sensors.reduce<Record<string, unknown>>((acc, sensor) => {
    const latest = sensor.readings[0];
    const details = record(latest?.data);
    const temperature = numberOrNull(details.temperature) ?? numberOrNull(latest?.value);
    const humidity = numberOrNull(details.humidity);
    const vpd = numberOrNull(details.vpd);
    acc[sensor.id] = {
      sensorId: sensor.id,
      name: sensor.name,
      type: sensor.type,
      enabled: sensor.enabled,
      roomName: sensor.room?.name ?? null,
      location: sensor.locationId,
      locationId: sensor.locationId,
      lastUpdated: latest?.timestamp.toISOString() ?? sensor.lastUpdated?.toISOString() ?? null,
      // `reading` and `value` preserve the historical single-value contract.
      reading: latest?.value ?? null,
      value: latest?.value ?? null,
      data: latest?.data ?? null,
      temperature,
      humidity,
      vpd,
      ports: Array.isArray(details.ports) ? details.ports : [],
      source: typeof details.source === 'string' ? details.source : null,
      deviceId: typeof details.deviceId === 'string' ? details.deviceId : null,
      deviceName: typeof details.deviceName === 'string' ? details.deviceName : null,
    };
    return acc;
  }, {});

  return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
}
