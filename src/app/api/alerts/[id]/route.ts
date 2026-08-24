import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const updates = await request.json();
  const updated = await prisma.alert.update({
    where: { id },
    data: updates
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const removed = await prisma.alert.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
