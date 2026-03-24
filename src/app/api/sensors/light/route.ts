import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const reading = await prisma.sensorReading.findFirst({ 
    where: { sensorId: 'sensor_light' },
    orderBy: { timestamp: 'desc' }
  });
  if (!reading) return NextResponse.json({ success: false, error: 'Light sensor not found' });
  return NextResponse.json({ success: true, value: reading.value, unit: 'PPFD' });
}
