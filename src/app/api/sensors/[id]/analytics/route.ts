import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const timeframe = body.timeframe || '24h';
  await ensureSeedData();
  const readings = await prisma.sensorReading.findMany({
    where: { sensorId: id },
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  const values = readings.map(r => r.value ?? 0);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const current = values[0] ?? 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const previous = values[1];
  const trendPercentage = previous && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : 0;

  return NextResponse.json({
    sensorId: id,
    timeframe,
    data: readings.map(reading => ({
      timestamp: reading.timestamp.toISOString(),
      value: reading.value ?? 0,
      quality: 'good'
    })),
    statistics: {
      min,
      max,
      avg,
      current,
      trend: trendPercentage > 1 ? 'rising' : trendPercentage < -1 ? 'falling' : 'stable',
      trendPercentage
    },
    alerts: 0,
    dataQuality: readings.length ? 100 : 0
  });
}
