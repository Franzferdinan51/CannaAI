import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const analyses = await prisma.plantAnalysis.findMany({
    where: { plantId: id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json({ success: true, data: analyses });
}
