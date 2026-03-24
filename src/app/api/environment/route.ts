import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  
  const readings = await prisma.sensorReading.findMany({
    orderBy: { timestamp: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    data: {
      readings,
      environment: {
        location: 'grow-tent',
        timestamp: new Date().toISOString(),
      }
    }
  });
}
