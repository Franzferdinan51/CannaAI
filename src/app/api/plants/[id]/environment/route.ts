import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const sensor = await prisma.sensorReading.findFirst({ orderBy: { timestamp: 'desc' } });
  return NextResponse.json({
    success: true,
    data: {
      plantId: params.id,
      environment: { lastUpdated: sensor?.timestamp?.toISOString?.() }
    }
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  await ensureSeedData();
  await prisma.sensorReading.create({
    data: {
      sensorId: 'sensor_temp',
      value: body.temperature
    }
  });
  return NextResponse.json({ success: true, data: { plantId: params.id, environment: body } });
}
