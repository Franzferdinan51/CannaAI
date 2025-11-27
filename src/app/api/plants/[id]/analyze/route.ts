import { NextRequest, NextResponse } from 'next/server';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    data: {
      result: {
        id: `analysis_${Date.now()}`,
        plantId: params.id,
        diagnosis: 'Healthy',
        urgency: 'LOW',
        confidence: 0.9,
        healthScore: 88,
        causes: [],
        recommendations: ['Maintain current regimen'],
        provider: 'ai',
        metadata: {
          provider: 'local',
          fallbackUsed: false,
          fallbackReason: '',
          processingTime: 50,
          dataPoints: 0,
          confidence: 0.9,
          payload: body
        },
        createdAt: new Date().toISOString()
      }
    }
  });
}
