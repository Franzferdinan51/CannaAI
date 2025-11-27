import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const totalSensors = await prisma.sensor.count();
  return NextResponse.json({
    success: true,
    server: { status: 'online', uptime: 86400, version: 'local', environment: process.env.NODE_ENV || 'development' },
    database: { status: 'connected', size: 'sqlite', lastBackup: new Date().toISOString() },
    websocket: { status: 'connected', connectedClients: 1 },
    sensors: { total: totalSensors, online: totalSensors, offline: 0, lastUpdate: new Date().toISOString() }
  });
}
