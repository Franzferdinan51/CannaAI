import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET(request: Request) {
  await ensureSeedData();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
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
}

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json().catch(() => ({}));
  const task = await prisma.task.create({
    data: {
      title: body.title || 'Task',
      description: body.description,
      type: body.type,
      priority: body.priority,
      status: body.status || 'pending',
      notes: body.notes,
      data: body.data,
      plantId: body.plantId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined
    }
  });
  return NextResponse.json({ success: true, data: task });
}
