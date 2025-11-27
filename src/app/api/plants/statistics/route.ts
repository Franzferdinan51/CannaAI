import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function POST() {
  await ensureSeedData();

  const [plants, stats] = await Promise.all([
    prisma.plant.findMany({
      select: {
        health: true,
      },
    }),
    Promise.all([
      // Group by stage
      prisma.plant.groupBy({
        by: ['stage'],
        _count: { stage: true },
      }),
      // Group by strain
      prisma.plant.groupBy({
        by: ['strainId'],
        _count: { strainId: true },
      }),
      // Average health calculation
      prisma.plant.aggregate({
        _avg: {
          // Can't directly aggregate JSON fields, so we'll calculate from fetched data
        },
      }),
    ]),
  ]);

  // Calculate average health from fetched data
  const totalHealthScore = plants.reduce(
    (acc, p) => acc + (((p.health as any)?.score) || 0),
    0
  );
  const avgHealth = plants.length > 0 ? totalHealthScore / plants.length : 0;

  // Process stage distribution
  const byStage = stats[0].reduce((acc, item) => {
    acc[item.stage || 'unknown'] = item._count.stage;
    return acc;
  }, {} as Record<string, number>);

  // Get strain information for strain distribution
  const strainIds = stats[1]
    .filter(item => item.strainId)
    .map(item => item.strainId) as string[];

  const strains = strainIds.length > 0
    ? await prisma.strain.findMany({
        where: { id: { in: strainIds } },
        select: { id: true, name: true },
      })
    : [];

  const strainMap = new Map(strains.map(s => [s.id, s.name]));

  // Process strain distribution with names
  const byStrain = stats[1].reduce((acc, item) => {
    if (item.strainId) {
      const strainName = strainMap.get(item.strainId) || 'Unknown';
      acc[strainName] = item._count.strainId;
    }
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    success: true,
    data: {
      totalPlants: plants.length,
      avgHealth,
      byStage,
      byStrain,
    },
  });
}
