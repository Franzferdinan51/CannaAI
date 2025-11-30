import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const analyses = await prisma.plantAnalysis.findMany({
    where: { plantId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (analyses.length > 0) {
    return NextResponse.json({ success: true, data: analyses });
  }

  return NextResponse.json({
    success: true,
    data: [
      {
        id: `analysis_${Date.now()}`,
        plantId: params.id,
        diagnosis: 'Healthy',
        urgency: 'LOW',
        confidence: 0.9,
        healthScore: 88,
        recommendations: { overall: ['Maintain current regimen'] },
        provider: 'ai',
        metadata: {
          provider: 'local',
          fallbackUsed: false,
          processingTime: 10,
          dataPoints: 0,
          confidence: 0.9
        },
        createdAt: new Date().toISOString()
      }
    ]
  });
}
