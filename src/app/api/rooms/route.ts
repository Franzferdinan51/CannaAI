import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

const RoomCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  temp: z.number().finite().optional(),
  humidity: z.number().finite().min(0).max(100).optional(),
  co2: z.number().finite().min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await ensureSeedData();
    const data = await prisma.room.findMany();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Rooms list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list rooms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeedData();
    const body = await request.json().catch(() => null);
    const parsed = RoomCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid room payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const created = await prisma.room.create({
      data: {
        name: input.name,
        temp: input.temp,
        humidity: input.humidity,
        co2: input.co2,
        active: input.active ?? true,
      },
    });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Room create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create room' }, { status: 500 });
  }
}
