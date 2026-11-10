import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

export async function POST(request: Request) {
  const log = withRequest(request);
  try {
    await ensureSeedData();
    const plants = await prisma.plant.findMany();
    return NextResponse.json({ success: true, data: plants, exportedAt: new Date().toISOString() });
  } catch (error) {
    log.error('plants.export_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to export plants' }, { status: 500 });
  }
}
