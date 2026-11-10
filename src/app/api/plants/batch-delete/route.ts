import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

const BatchDeleteSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(100)).max(500).default([]),
});

export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    const body = await request.json().catch(() => null);
    const parsed = BatchDeleteSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid batch delete payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const result = await prisma.plant.deleteMany({ where: { id: { in: parsed.data.ids } } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    log.error('plants.batch_delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete plants' }, { status: 500 });
  }
}
