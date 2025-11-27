import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function POST() {
  await ensureSeedData();
  const plants = await prisma.plant.findMany();
  return NextResponse.json({
    success: true,
    data: {
      totalPlants: plants.length,
      avgHealth: plants.reduce((acc, p) => acc + ((p.health as any)?.score || 0), 0) / (plants.length || 1),
      byStage: {},
      byStrain: {}
    }
  });
}
