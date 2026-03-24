import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  // Calculate VPD from temp and humidity
  const temp = await prisma.sensorReading.findFirst({ 
    where: { sensorId: 'sensor_temp' },
    orderBy: { timestamp: 'desc' }
  });
  const humidity = await prisma.sensorReading.findFirst({ 
    where: { sensorId: 'sensor_humidity' },
    orderBy: { timestamp: 'desc' }
  });
  
  if (!temp || !humidity) return NextResponse.json({ success: false, error: 'Sensors not found' });
  
  // Simple VPD calculation (kPa)
  const vpd = ((100 - humidity.value) / 100) * (0.61078 * Math.exp((17.27 * temp.value) / (temp.value + 237.3)));
  
  return NextResponse.json({ success: true, value: vpd.toFixed(2), unit: 'kPa' });
}
