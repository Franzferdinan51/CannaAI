import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

// Read-only list of a plant's analysis milestones. The automation engine
// writes these; previously they were only visible inside the trends
// payload, never as their own records.
export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const milestones = await prisma.analysisMilestone.findMany({
    where: { plantId: id },
    orderBy: { detectedAt: 'desc' },
    take: 50
  });

  return NextResponse.json({ success: true, data: milestones });
}
