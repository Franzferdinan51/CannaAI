import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { deletePlantImageFile, publicPlantImage, savePlantImage } from '@/lib/plant-images';

function databaseSetupRequired(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2021');
}

function databaseSetupResponse() {
  return NextResponse.json({
    success: false,
    error: 'Database schema is not initialized. Run `npm run db:push` and try again.',
    setupRequired: true
  }, { status: 503 });
}

export async function GET(request: Request) {
  try {
    await ensureSeedData();
  } catch (error) {
    if (databaseSetupRequired(error)) return databaseSetupResponse();
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  const [plants, total] = await Promise.all([
    prisma.plant.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        strainId: true,
        stage: true,
        age: true,
        plantedDate: true,
        locationId: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        strain: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    }),
    prisma.plant.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      plants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}

function parseJsonValue(value: unknown, fallback: unknown) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function uploadedFiles(formData: FormData | null): File[] {
  if (!formData) return [];
  const files: File[] = [];
  for (const [key, value] of formData.entries()) {
    if ((key === 'image' || key === 'images' || /^images\[\d+\]$/.test(key)) && value instanceof File && value.size > 0) {
      files.push(value);
    }
  }
  return files;
}

async function resolveRoomId(value: unknown): Promise<string | null> {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) return null;
  const byId = await prisma.room.findUnique({ where: { id: candidate } });
  if (byId) return byId.id;
  const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
  const byName = rooms.find((room) => room.name.toLowerCase() === candidate.toLowerCase());
  if (byName) return byName.id;
  throw new Error(`Location "${candidate}" was not found. Choose one of the configured grow rooms.`);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const body: Record<string, unknown> = formData
    ? Object.fromEntries(formData.entries())
    : await request.json().catch(() => ({}));
  try {
    await ensureSeedData();
  } catch (error) {
    if (databaseSetupRequired(error)) return databaseSetupResponse();
    throw error;
  }

  try {
    const strainId = typeof body.strainId === 'string' && body.strainId.trim() ? body.strainId.trim() : null;
    if (strainId) {
      const strain = await prisma.strain.findUnique({ where: { id: strainId } });
      if (!strain) {
        return NextResponse.json({ success: false, error: 'The selected strain was not found.' }, { status: 400 });
      }
    }

    const locationValue = body.locationId || body.location;
    const locationId = await resolveRoomId(
      typeof locationValue === 'object' && locationValue !== null
        ? ((locationValue as { id?: string; name?: string }).id || (locationValue as { name?: string }).name)
        : locationValue,
    );
    const tags = parseJsonValue(body.tags, []);
    const metadata = parseJsonValue(body.metadata, { source: 'seed', isMotherPlant: false });
    const existingImages = parseJsonValue(body.images, []);
    const files = uploadedFiles(formData);

    const plant = await prisma.plant.create({
      data: {
        name: String(body.name || 'New Plant'),
        strainId: strainId || undefined,
        stage: typeof body.stage === 'string' && body.stage ? body.stage : 'vegetative',
        health: {
          score: 80,
          status: 'healthy',
          issues: [],
          recommendations: [],
          warnings: [],
          history: [],
        },
        age: Number(body.age || 0),
        plantedDate: body.plantedDate ? new Date(body.plantedDate as string) : new Date(),
        locationId: locationId || undefined,
        images: Array.isArray(existingImages) ? existingImages : [],
        notes: typeof body.notes === 'string' ? body.notes : '',
        tags: Array.isArray(tags) ? tags : [],
        metadata: metadata && typeof metadata === 'object' ? metadata : { source: 'seed', isMotherPlant: false },
      },
    });

    if (files.length === 0) {
      return NextResponse.json({ success: true, data: plant }, { status: 201 });
    }

    const saved = [] as Awaited<ReturnType<typeof savePlantImage>>[];
    try {
      for (const [index, file] of files.entries()) {
        saved.push(await savePlantImage(plant.id, file, { isPrimary: index === 0 && !Array.isArray(existingImages) }));
      }
      const updated = await prisma.plant.update({
        where: { id: plant.id },
        data: {
          images: [
            ...(Array.isArray(existingImages) ? existingImages : []),
            ...saved,
          ] as never,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(
        {
          success: true,
          data: {
            ...updated,
            images: (Array.isArray(updated.images) ? updated.images : []).map((image) =>
              image && typeof image === 'object' ? publicPlantImage(image as Record<string, unknown>) : image,
            ),
          },
        },
        { status: 201 },
      );
    } catch (imageError) {
      // Do not leave a half-created plant behind when its requested photo
      // could not be stored.
      await Promise.all(saved.map((image) => deletePlantImageFile(image)));
      await prisma.plant.delete({ where: { id: plant.id } }).catch(() => null);
      throw imageError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create plant';
    const status = /not found|Unsupported|larger than|empty|required/i.test(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
