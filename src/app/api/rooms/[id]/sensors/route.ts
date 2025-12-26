import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const sensors = await prisma.sensor.findMany({ where: { locationId: params.id } });
  return NextResponse.json({ success: true, data: sensors });
}
