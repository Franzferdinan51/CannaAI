import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({ where: { id: params.id } });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: sensor });
}

export async function PUT(request: Request, { params }: Params) {
  const updates = await request.json();
  const updated = await prisma.sensor.update({
    where: { id: params.id },
    data: { ...updates }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const removed = await prisma.sensor.delete({ where: { id: params.id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
