import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data = {
    status: 'completed',
    completedAt: new Date(),
    ...(typeof body.notes === 'string' ? { notes: body.notes } : {}),
  };
  const task = await prisma.task.update({ where: { id }, data }).catch(() => null);

  if (!task) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: task });
}
