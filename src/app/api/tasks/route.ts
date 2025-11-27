import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const data = await prisma.task.findMany();
  return NextResponse.json({ success: true, data });
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
