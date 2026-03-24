import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  
  const [plants, sensors, readings] = await Promise.all([
    prisma.plant.count({ where: { isActive: true } }),
    prisma.sensor.count({ where: { enabled: true } }),
    prisma.sensorReading.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      activePlants: plants,
      activeSensors: sensors,
      totalReadings: readings,
      timestamp: new Date().toISOString(),
    }
  });
}
