import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'auto';
export const revalidate = false;

type StoredHistoryResult = {
  diagnosis?: unknown;
  confidence?: unknown;
  healthScore?: unknown;
  notes?: unknown;
  isPurpleStrain?: unknown;
  analysisData?: unknown;
};

function toHistoryEntry(record: any) {
  const request = (record.request || {}) as { strain?: unknown };
  const result = (record.result || {}) as StoredHistoryResult;

  return {
    id: record.id,
    date: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    strain: typeof request.strain === 'string' ? request.strain : '',
    diagnosis: typeof result.diagnosis === 'string' ? result.diagnosis : '',
    confidence: typeof result.confidence === 'number' ? result.confidence : null,
    healthScore: typeof result.healthScore === 'number' ? result.healthScore : null,
    notes: typeof result.notes === 'string' ? result.notes : '',
    isPurpleStrain: result.isPurpleStrain === true,
    analysisData: result.analysisData ?? null,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
  };
}

function staticExportResponse() {
  return NextResponse.json({
    success: false,
    message: 'This API is handled client-side in static export mode.',
    clientSide: true,
    buildMode: 'static',
  });
}

export async function GET() {
  if (process.env.BUILD_MODE === 'static') return staticExportResponse();

  try {
    const records = await prisma.plantAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const history = records.map(toHistoryEntry);

    return NextResponse.json({ success: true, history, count: history.length });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis history' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticExportResponse();

  try {
    const body = await request.json();
    const { plantId, strain, diagnosis, confidence, healthScore, notes, isPurpleStrain, analysisData } = body;

    if (typeof strain !== 'string' || !strain.trim() || typeof diagnosis !== 'string' || !diagnosis.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: strain and diagnosis' },
        { status: 400 },
      );
    }

    const record = await prisma.plantAnalysis.create({
      data: {
        plantId: typeof plantId === 'string' && plantId.trim() ? plantId.trim() : undefined,
        request: { strain: strain.trim() },
        result: {
          diagnosis: diagnosis.trim(),
          confidence: typeof confidence === 'number' ? confidence : null,
          healthScore: typeof healthScore === 'number' ? healthScore : null,
          notes: typeof notes === 'string' ? notes : '',
          isPurpleStrain: isPurpleStrain === true,
          analysisData: analysisData ?? null,
        },
        provider: 'history-route',
      },
    });

    const entry = toHistoryEntry(record);
    return NextResponse.json({ success: true, entry, message: 'Analysis saved to history successfully' });
  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save analysis to history' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticExportResponse();

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing required parameter: id' }, { status: 400 });
  }

  try {
    const deleted = await prisma.plantAnalysis.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      entry: toHistoryEntry(deleted),
      message: 'Analysis history entry deleted successfully',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'History entry not found' }, { status: 404 });
    }
    console.error('Delete history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete analysis history entry' },
      { status: 500 },
    );
  }
}
