import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const PlantActionCreateSchema = z.object({
  type: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().trim().max(50).optional(),
  data: z.unknown().optional(),
});

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    await ensureSeedData();
    const actions = await prisma.action.findMany({ where: { plantId: id } });
    return NextResponse.json({ success: true, data: actions });
  } catch (error) {
    log.error('plants.actions_list_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to list plant actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = PlantActionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid action payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    await ensureSeedData();
    const input = parsed.data;
    const action = await prisma.action.create({
      data: {
        plantId: id,
        type: input.type || 'action',
        description: input.description || '',
        status: input.status || 'pending',
        data: input.data as never,
      },
    });
    return NextResponse.json({ success: true, data: action });
  } catch (error) {
    log.error('plants.actions_create_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to create plant action' }, { status: 500 });
  }
}
