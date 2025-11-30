import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const plant = await prisma.plant.findUnique({ where: { id: params.id } });
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: plant });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const updates = await request.json().catch(() => ({}));
  const updated = await prisma.plant.update({
    where: { id: params.id },
    data: { ...updates, updatedAt: new Date() }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const removed = await prisma.plant.delete({ where: { id: params.id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
