import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();

  const plants = await prisma.plant.count({ where: { isActive: true } });

  // Yield metrics are computed from persisted Harvest rows:
  // - avgYield: mean dry weight (grams) across harvests that recorded one.
  // - efficiency: mean dry-matter yield, dry / wet * 100 (percent), across
  //   harvests that recorded both weights.
  // A metric with no qualifying rows stays null and is listed as
  // unavailable rather than being presented as a measured zero.
  const harvests = await prisma.harvest.findMany({
    select: { wetWeightGrams: true, dryWeightGrams: true },
  });

  const dryWeights = harvests
    .map((h) => h.dryWeightGrams)
    .filter((v): v is number => typeof v === 'number');
  const avgYield = dryWeights.length
    ? Math.round((dryWeights.reduce((a, b) => a + b, 0) / dryWeights.length) * 10) / 10
    : null;

  const ratios = harvests
    .filter(
      (h) =>
        typeof h.dryWeightGrams === 'number' &&
        typeof h.wetWeightGrams === 'number' &&
        h.wetWeightGrams > 0,
    )
    .map((h) => ((h.dryWeightGrams as number) / (h.wetWeightGrams as number)) * 100);
  const efficiency = ratios.length
    ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 10) / 10
    : null;

  const unavailableMetrics: string[] = [];
  if (avgYield === null) unavailableMetrics.push('avgYield');
  if (efficiency === null) unavailableMetrics.push('efficiency');

  return NextResponse.json({
    success: true,
    data: {
      activePlants: plants,
      totalHarvests: harvests.length,
      avgYield,
      efficiency,
      unavailableMetrics,
    }
  });
}
