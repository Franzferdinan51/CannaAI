import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const sensors = await prisma.sensor.findMany({ where: { locationId: id } });
  return NextResponse.json({ success: true, data: sensors });
}
