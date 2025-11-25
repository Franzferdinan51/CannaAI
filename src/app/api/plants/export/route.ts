import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function POST() {
  await ensureSeedData();
  const plants = await prisma.plant.findMany();
  return NextResponse.json({ success: true, data: plants, exportedAt: new Date().toISOString() });
}
