import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const PlantTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  notes: z.string().max(5000).optional(),
  data: z.unknown().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    await ensureSeedData();
    const tasks = await prisma.task.findMany({ where: { plantId: id } });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    log.error('plants.tasks_list_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to list plant tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = PlantTaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid task payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    await ensureSeedData();
    const input = parsed.data;
    const task = await prisma.task.create({
      data: {
        title: input.title || 'Task',
        description: input.description,
        type: input.type,
        priority: input.priority,
        status: input.status || 'pending',
        notes: input.notes,
        data: input.data as never,
        plantId: id,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    log.error('plants.tasks_create_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to create plant task' }, { status: 500 });
  }
}
