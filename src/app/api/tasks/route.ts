import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

const MAX_LIMIT = 100;

function clampPagination(searchParams: URLSearchParams) {
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : 20;
  return { page, limit };
}

const TaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  notes: z.string().max(5000).optional(),
  data: z.unknown().optional(),
  plantId: z.string().trim().min(1).max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    await ensureSeedData();

    const { searchParams } = new URL(request.url);
    const { page, limit } = clampPagination(searchParams);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tasks: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Tasks list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSeedData();
    const body = await request.json().catch(() => ({}));
    const parsed = TaskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid task payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
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
        plantId: input.plantId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}
