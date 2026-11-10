import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const TaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  notes: z.string().max(5000).optional(),
  data: z.unknown().optional(),
  plantId: z.string().trim().max(100).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function PUT(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = TaskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid task payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const data: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.scheduledAt) data.scheduledAt = new Date(input.scheduledAt);
    if (input.completedAt) data.completedAt = new Date(input.completedAt);
    const updated = await prisma.task.update({ where: { id }, data: data as never }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('tasks.update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const deleted = await prisma.task.delete({ where: { id } }).catch(() => null);
    if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    log.error('tasks.delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
  }
}
