import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const sensor = await prisma.sensor.findUnique({ where: { id } });
  if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: sensor });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const updates = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof updates.name === 'string') data.name = updates.name.trim();
  if (typeof updates.type === 'string') data.type = updates.type.trim();
  if (typeof updates.enabled === 'boolean') data.enabled = updates.enabled;
  if (typeof updates.locationId === 'string') data.locationId = updates.locationId.trim() || null;
  if (updates.calibration && typeof updates.calibration === 'object' && !Array.isArray(updates.calibration)) {
    data.calibration = updates.calibration;
  }
  const updated = await prisma.sensor.update({
    where: { id },
    data,
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const removed = await prisma.sensor.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
