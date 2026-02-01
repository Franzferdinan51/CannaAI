import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  // Optimize: Select only necessary fields to reduce payload size
  const plants = await prisma.plant.findMany({
    select: {
      isActive: true,
      health: true,
    },
  });
  return NextResponse.json({
    success: true,
    data: {
      inventory: {
        totalPlants: plants.length,
        activePlants: plants.filter(p => p.isActive).length,
        archivedPlants: plants.filter(p => !p.isActive).length,
        byStage: {},
        byHealth: {},
        byLocation: {},
        byStrain: {},
        estimatedYield: 0,
        averageHealth: plants.reduce((acc, p) => acc + ((p.health as any)?.score || 0), 0) / (plants.length || 1),
        upcomingTasks: 0,
        overdueTasks: 0
      }
    }
  });
}
