import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const tasks = await prisma.task.findMany({ where: { plantId: params.id } });
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(request: NextRequest, { params }: Params) {
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
      plantId: params.id
    }
  });
  return NextResponse.json({ success: true, data: task });
}
