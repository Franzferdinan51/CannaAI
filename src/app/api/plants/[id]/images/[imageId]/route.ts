import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type Params = { params: Promise<{ id: string; imageId: string }> };

type PlantImageRecord = Record<string, unknown> & { id?: string };

function imageRecords(value: unknown): PlantImageRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((image): image is PlantImageRecord => Boolean(image && typeof image === 'object'));
}

async function getPlantImages(id: string) {
  return prisma.plant.findUnique({ where: { id }, select: { images: true } });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id, imageId } = await params;
  const plant = await getPlantImages(id);
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

  const images = imageRecords(plant.images);
  if (!images.some((image) => image.id === imageId)) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const updated = await prisma.plant.update({
    where: { id },
    data: { images: images.filter((image) => image.id !== imageId) as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function PUT(_: Request, { params }: Params) {
  const { id, imageId } = await params;
  const plant = await getPlantImages(id);
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

  const images = imageRecords(plant.images);
  if (!images.some((image) => image.id === imageId)) {
    return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
  }

  const updated = await prisma.plant.update({
    where: { id },
    data: {
      images: images.map((image) => ({ ...image, isPrimary: image.id === imageId })) as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}
