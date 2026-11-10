import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const RoomUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  temp: z.number().finite().optional(),
  humidity: z.number().finite().min(0).max(100).optional(),
  co2: z.number().finite().min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    await ensureSeedData();
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: room });
  } catch (error) {
    log.error('rooms.get_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load room' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = RoomUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid room payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const updated = await prisma.room.update({
      where: { id },
      data: parsed.data,
    }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('rooms.update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update room' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const removed = await prisma.room.delete({ where: { id } }).catch(() => null);
    if (!removed) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('rooms.delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete room' }, { status: 500 });
  }
}
