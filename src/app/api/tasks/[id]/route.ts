import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const updates = await request.json().catch(() => ({}));
  const allowed = ['title', 'description', 'type', 'priority', 'status', 'notes', 'data', 'plantId', 'scheduledAt', 'completedAt'] as const;
  const data = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key as typeof allowed[number])));
  if (data.scheduledAt) data.scheduledAt = new Date(String(data.scheduledAt));
  const updated = await prisma.task.update({ where: { id }, data: { ...data, updatedAt: new Date() } }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await prisma.task.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: deleted });
}
