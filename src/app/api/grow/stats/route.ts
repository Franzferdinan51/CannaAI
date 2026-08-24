import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  
  const plants = await prisma.plant.count({ where: { isActive: true } });
  // Harvests are currently managed by the legacy in-memory harvest endpoint;
  // there is no Harvest model in the Prisma schema. Return an honest zero
  // until harvest persistence is migrated instead of failing the whole route.
  const harvests = 0;

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
