import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const [plants, alerts, actions] = await Promise.all([
    prisma.plant.findMany(),
    prisma.alert.count(),
    prisma.action.count()
  ]);
  const healthAvg = plants.length
    ? plants.reduce((acc, p) => acc + ((p.health as any)?.score || 0), 0) / plants.length
    : 0;
  return NextResponse.json({
    success: true,
    data: {
      sensors: { uptime: 0.99, anomalies: alerts },
      plants: { healthAvg, issuesOpen: 0 },
      automation: { actionsToday: actions }
    }
  });
}
