import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET(request: Request) {
  await ensureSeedData();
  const { searchParams } = new URL(request.url);
  const sensorsParam = searchParams.get('sensors');
  const sensors = sensorsParam
    ? sensorsParam.split(',')
    : (await prisma.sensor.findMany({ select: { id: true } })).map(s => s.id);

  const now = Date.now();
  const data = Array.from({ length: 24 }).map((_, idx) => {
    const timestamp = new Date(now - idx * 60 * 60 * 1000).toISOString();
    const row: any = { timestamp };
    sensors.forEach(id => {
      row[id] = 0;
    });
    return row;
  });

  return NextResponse.json({
    success: true,
    data,
    metadata: {
      sensors,
      timeframe: searchParams.get('timeframe') || '24h',
      resolution: searchParams.get('resolution') || '1h',
      totalPoints: data.length
    }
  });
}
