import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const SensorUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  locationId: z.string().max(100).nullable().optional(),
  roomId: z.string().max(100).optional(),
  roomName: z.string().max(200).optional(),
  calibration: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    await ensureSeedData();
    const sensor = await prisma.sensor.findUnique({ where: { id } });
    if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: sensor });
  } catch (error) {
    log.error('sensors.get_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load sensor' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = SensorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid sensor payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const updates = parsed.data;
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (typeof updates.locationId === 'string') data.locationId = updates.locationId.trim() || null;
    if (updates.roomId !== undefined) data.locationId = updates.roomId.trim() || null;
    if (updates.roomName !== undefined && updates.roomName.trim()) {
      const room = await prisma.room.findFirst({ where: { name: updates.roomName.trim() } });
      if (room) data.locationId = room.id;
    }
    if (updates.calibration !== undefined) {
      data.calibration = updates.calibration;
    }
    const updated = await prisma.sensor.update({
      where: { id },
      data: data as never,
    }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('sensors.update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update sensor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const removed = await prisma.sensor.delete({ where: { id } }).catch(() => null);
    if (!removed) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('sensors.delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete sensor' }, { status: 500 });
  }
}
