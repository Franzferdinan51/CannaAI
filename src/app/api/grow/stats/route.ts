import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  
  const [plants, harvests] = await Promise.all([
    prisma.plant.count({ where: { isActive: true } }),
    prisma.harvest.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      activePlants: plants,
      totalHarvests: harvests,
      avgYield: 120,
      efficiency: 92,
    }
  });
}
