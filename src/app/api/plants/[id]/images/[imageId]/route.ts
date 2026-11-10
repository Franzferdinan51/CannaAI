import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { deletePlantImageFile, readPlantImage } from '@/lib/plant-images';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string; imageId: string }> };

type PlantImageRecord = Record<string, unknown> & { id?: string };

function imageRecords(value: unknown): PlantImageRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((image): image is PlantImageRecord => Boolean(image && typeof image === 'object'));
}

async function getPlantImages(id: string) {
  return prisma.plant.findUnique({ where: { id }, select: { images: true } });
}

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id, imageId } = await params;
    const plant = await getPlantImages(id);
    if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

    const image = imageRecords(plant.images).find((candidate) => candidate.id === imageId);
    if (!image) return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });

    if (typeof image.storageKey === 'string' && image.storageKey) {
      try {
        const { buffer, contentType } = await readPlantImage(image.storageKey);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'private, max-age=300',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        return NextResponse.json({ success: false, error: 'Stored image file is missing' }, { status: 404 });
      }
    }

    if (typeof image.url === 'string' && /^https?:\/\//i.test(image.url)) {
      return NextResponse.redirect(image.url);
    }

    return NextResponse.json({ success: false, error: 'Image file is not available' }, { status: 404 });
  } catch (error) {
    log.error('plants.image_get_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load plant image' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id, imageId } = await params;
    const plant = await getPlantImages(id);
    if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

    const images = imageRecords(plant.images);
    if (!images.some((image) => image.id === imageId)) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const removed = images.find((image) => image.id === imageId);
    const updated = await prisma.plant.update({
      where: { id },
      data: { images: images.filter((image) => image.id !== imageId) as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
    });
    await deletePlantImageFile(removed);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('plants.image_delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete plant image' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
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
  } catch (error) {
    log.error('plants.image_update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update plant image' }, { status: 500 });
  }
}
