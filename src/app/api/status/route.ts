import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checkedAt = new Date();
  const sensors = await prisma.sensor.findMany({
    select: { enabled: true, lastUpdated: true },
  });
  const sensorFreshnessMs = Number(process.env.SENSOR_ONLINE_WINDOW_MS || 5 * 60 * 1000);
  const onlineSensors = sensors.filter((sensor) => (
    sensor.enabled &&
    sensor.lastUpdated instanceof Date &&
    checkedAt.getTime() - sensor.lastUpdated.getTime() <= sensorFreshnessMs
  )).length;

  return NextResponse.json({
    success: true,
    server: {
      status: 'online',
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    },
    database: { status: 'connected', size: 'sqlite', lastBackup: null },
    websocket: { status: 'not-measured', connectedClients: null },
    sensors: {
      total: sensors.length,
      online: onlineSensors,
      offline: sensors.length - onlineSensors,
      lastUpdate: checkedAt.toISOString(),
    },
  });
}
