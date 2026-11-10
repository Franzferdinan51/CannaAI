import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const updated = await prisma.plant.update({
      where: { id },
      data: { isActive: false },
    }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('plants.archive_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to archive plant' }, { status: 500 });
  }
}
