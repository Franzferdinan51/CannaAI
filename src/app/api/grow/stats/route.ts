import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  
  const plants = await prisma.plant.count({ where: { isActive: true } });
  // Harvest persistence landed with the Harvest model + /api/harvest CRUD,
  // so the count is real now. Yield/efficiency below stay null until they
  // can be computed from persisted harvest + sensor history.
  const harvests = await prisma.harvest.count();

  return NextResponse.json({
    success: true,
    data: {
      activePlants: plants,
      totalHarvests: harvests,
      // These metrics require persisted harvest and sensor history. Do not
      // present hard-coded values as if they were measured in this install.
      avgYield: null,
      efficiency: null,
      unavailableMetrics: ['avgYield', 'efficiency'],
    }
  });
}
