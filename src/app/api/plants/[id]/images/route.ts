import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { publicPlantImage, savePlantImage } from '@/lib/plant-images';

type Params = { params: Promise<{ id: string }> };

type PlantImageRecord = Record<string, unknown> & { id?: string; isPrimary?: boolean };

function imageRecords(value: unknown): PlantImageRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((image): image is PlantImageRecord => Boolean(image && typeof image === 'object'));
}

function uploadedFile(formData: FormData): File | null {
  for (const [key, value] of formData.entries()) {
    if ((key === 'image' || key === 'images' || /^images\[\d+\]$/.test(key)) && value instanceof File && value.size > 0) {
      return value;
    }
  }
  return null;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const plant = await prisma.plant.findUnique({ where: { id }, select: { id: true, images: true } });
  if (!plant) {
    return NextResponse.json({ success: false, error: 'Plant not found', plantId: id }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData ? uploadedFile(formData) : null;
  if (!formData || !file) {
    return NextResponse.json(
      { success: false, error: 'An image file is required. Send it as multipart form data in the "image" field.', plantId: id },
      { status: 400 },
    );
  }

  try {
    const existing = imageRecords(plant.images);
    const saved = await savePlantImage(id, file, {
      description: String(formData.get('description') || '') || undefined,
      type: String(formData.get('type') || 'overview'),
      isPrimary: existing.length === 0 || formData.get('isPrimary') === 'true',
    });
    const images = existing.map((image) => (saved.isPrimary ? { ...image, isPrimary: false } : image));
    images.push(saved as unknown as PlantImageRecord);

    await prisma.plant.update({
      where: { id },
      data: { images: images as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
    });

    return NextResponse.json(
      { success: true, available: true, data: publicPlantImage(saved as unknown as Record<string, unknown>), plantId: id },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save plant image';
    const status = /Unsupported|larger than|empty|required/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message, plantId: id }, { status });
  }
}
