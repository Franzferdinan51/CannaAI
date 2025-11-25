import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  const timeframe = body.timeframe || '24h';
  await ensureSeedData();
  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: params.id },
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  const values = readings.map(r => r.value ?? 0);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  return NextResponse.json({
    success: true,
    data: {
      sensorId: params.id,
      timeframe,
      averages: { reading: avg },
      trends: [],
      anomalies: [],
      uptime: 0.99
    }
  });
}
