import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { publicPlantImage } from '@/lib/plant-images';

type Params = { params: Promise<{ id: string }> };

function serializePlant<T extends { images?: unknown; room?: { id: string; name: string } | null }>(plant: T) {
  return {
    ...plant,
    images: Array.isArray(plant.images)
      ? plant.images.map((image) =>
          image && typeof image === 'object' ? publicPlantImage(image as Record<string, unknown>) : image,
        )
      : plant.images,
    location: plant.room ? { id: plant.room.id, name: plant.room.name, type: 'tent', environment: {} } : null,
  };
}

async function resolveRoomId(value: unknown): Promise<string | null | undefined> {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) return undefined;
  const byId = await prisma.room.findUnique({ where: { id: candidate } });
  if (byId) return byId.id;
  const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
  const byName = rooms.find((room) => room.name.toLowerCase() === candidate.toLowerCase());
  if (byName) return byName.id;
  throw new Error(`Location "${candidate}" was not found. Choose one of the configured grow rooms.`);
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  await ensureSeedData();
  const plant = await prisma.plant.findUnique({
    where: { id },
    include: { strain: true, room: true },
  });
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: serializePlant(plant) });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const updates = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const existing = await prisma.plant.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

  try {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of ['name', 'stage', 'health', 'age', 'notes', 'tags', 'metadata', 'isActive'] as const) {
      if (updates[field] !== undefined) data[field] = updates[field];
    }
    if (updates.plantedDate !== undefined) {
      data.plantedDate = updates.plantedDate ? new Date(String(updates.plantedDate)) : null;
    }
    if (updates.strainId !== undefined) {
      if (updates.strainId === null || updates.strainId === '') data.strainId = null;
      else {
        const strain = await prisma.strain.findUnique({ where: { id: String(updates.strainId) } });
        if (!strain) return NextResponse.json({ success: false, error: 'The selected strain was not found.' }, { status: 400 });
        data.strainId = strain.id;
      }
    }
    const locationValue =
      updates.locationId !== undefined
        ? updates.locationId
        : updates.location && typeof updates.location === 'object'
          ? ((updates.location as { id?: string; name?: string }).id || (updates.location as { name?: string }).name)
          : undefined;
    const locationId = await resolveRoomId(locationValue);
    if (locationId !== undefined) data.locationId = locationId;
    if (updates.images !== undefined) data.images = updates.images;

    const updated = await prisma.plant.update({
      where: { id },
      data: data as never,
      include: { strain: true, room: true },
    });
    return NextResponse.json({ success: true, data: serializePlant(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update plant';
    const status = /not found/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const removed = await prisma.plant.delete({ where: { id } }).catch(() => null);
  if (!removed) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
