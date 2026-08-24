import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const calibration = await request.json().catch(() => ({}));
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({ where: { id } });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  await prisma.sensor.update({
    where: { id },
    data: { calibration, updatedAt: new Date() }
  });
  return NextResponse.json({
    success: true,
    message: `Calibration saved for ${id}`,
    calibration
  });
}
