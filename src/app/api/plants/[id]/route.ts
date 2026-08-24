import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const plant = await prisma.plant.findUnique({ where: { id } });
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: plant });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const updates = await request.json().catch(() => ({}));
  const updated = await prisma.plant.update({
    where: { id },
    data: { ...updates, updatedAt: new Date() }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const removed = await prisma.plant.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
