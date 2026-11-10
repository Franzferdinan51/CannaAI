import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const TaskCompleteSchema = z.object({
  notes: z.string().max(5000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = TaskCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid task payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = {
      status: 'completed',
      completedAt: new Date(),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    };
    const task = await prisma.task.update({ where: { id }, data }).catch(() => null);

    if (!task) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    log.error('tasks.complete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to complete task' }, { status: 500 });
  }
}
