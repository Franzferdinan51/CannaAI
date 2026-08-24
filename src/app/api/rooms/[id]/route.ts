import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: room });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const updates = await request.json();
  const updated = await prisma.room.update({
    where: { id },
    data: updates
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const removed = await prisma.room.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
