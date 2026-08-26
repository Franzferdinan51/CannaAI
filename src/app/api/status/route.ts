import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STATUS_DATABASE_TIMEOUT_MS = 2000;

async function readSensorsWithTimeout(): Promise<{ sensors: Array<{ enabled: boolean; lastUpdated: Date | null }>; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('database status check timed out')), STATUS_DATABASE_TIMEOUT_MS);
      timer.unref?.();
    });
    const sensors = await Promise.race([
      prisma.sensor.findMany({ select: { enabled: true, lastUpdated: true } }),
      timeout,
    ]);
    return { sensors, timedOut: false };
  } catch {
    return { sensors: [], timedOut: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const checkedAt = new Date();
  const { sensors, timedOut: databaseTimedOut } = await readSensorsWithTimeout();
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
    database: {
      status: databaseTimedOut ? 'degraded' : 'connected',
      size: 'sqlite',
      lastBackup: null,
    },
    websocket: { status: 'not-measured', connectedClients: null },
    sensors: {
      total: sensors.length,
      online: onlineSensors,
      offline: sensors.length - onlineSensors,
      lastUpdate: checkedAt.toISOString(),
      status: databaseTimedOut ? 'unavailable' : 'available',
    },
  });
}
