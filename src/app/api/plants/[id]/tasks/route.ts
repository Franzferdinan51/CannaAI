import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const tasks = await prisma.task.findMany({ where: { plantId: id } });
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  await ensureSeedData();
  const task = await prisma.task.create({
    data: {
      title: body.title || 'Task',
      description: body.description,
      type: body.type,
      priority: body.priority,
      status: body.status || 'pending',
      notes: body.notes,
      data: body.data,
      plantId: id
    }
  });
  return NextResponse.json({ success: true, data: task });
}
