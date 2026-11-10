import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

const BatchPlantUpdatesSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  stage: z.string().trim().max(50).optional(),
  health: z.unknown().optional(),
  age: z.number().int().min(0).max(10000).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.unknown().optional(),
  metadata: z.unknown().optional(),
  isActive: z.boolean().optional(),
  plantedDate: z.string().datetime().nullable().optional(),
  strainId: z.string().trim().max(100).nullable().optional(),
  locationId: z.string().trim().max(100).nullable().optional(),
});

const BatchUpdateSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(100)).max(500).default([]),
  updates: BatchPlantUpdatesSchema.default({}),
});

export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    const body = await request.json().catch(() => null);
    const parsed = BatchUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid batch update payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { ids, updates } = parsed.data;
    const data: Record<string, unknown> = { ...updates };
    if (updates.plantedDate !== undefined) {
      data.plantedDate = updates.plantedDate ? new Date(updates.plantedDate) : null;
    }
    const result = await prisma.plant.updateMany({
      where: { id: { in: ids } },
      data: data as never,
    });
    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    log.error('plants.batch_update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update plants' }, { status: 500 });
  }
}
