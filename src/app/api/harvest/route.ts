import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Harvest records: one row per harvest event for a plant (partial
// harvests included). Replaces the former 503 stub at this path.

const DATE_FIELDS = [
  'harvestedAt',
  'dryStartedAt',
  'dryEndedAt',
  'cureStartedAt',
  'cureEndedAt',
] as const;

const NUMBER_FIELDS = ['wetWeightGrams', 'dryWeightGrams'] as const;

const PLANT_SELECT = { id: true, name: true, strainId: true, stage: true } as const;

function parseDateField(field: string, value: unknown): Date | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${field} must be a valid date`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }
  return date;
}

function harvestDataFromBody(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  for (const field of DATE_FIELDS) {
    if (body[field] !== undefined) data[field] = parseDateField(field, body[field]);
  }
  for (const field of NUMBER_FIELDS) {
    if (body[field] !== undefined) {
      if (body[field] === null || body[field] === '') data[field] = null;
      else {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(`${field} must be a non-negative number`);
        }
        data[field] = value;
      }
    }
  }
  if (body.notes !== undefined) {
    data.notes =
      typeof body.notes === 'string' ? (body.notes as string).trim() || null : body.notes;
  }

  return data;
}

function errorResponse(error: unknown, fallback: string, status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  const isValidation = /must be|required/i.test(message);
  return NextResponse.json(
    { success: false, error: message || fallback },
    { status: isValidation ? 400 : status },
  );
}

function staticResponse() {
  return NextResponse.json({
    success: false,
    message: 'This API is handled client-side in static export mode.',
    clientSide: true,
    buildMode: 'static',
  });
}

export async function GET(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const harvest = await prisma.harvest.findUnique({
        where: { id },
        include: { plant: { select: PLANT_SELECT } },
      });
      if (!harvest) {
        return NextResponse.json({ success: false, error: 'Harvest not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: harvest, harvest });
    }

    const plantId = request.nextUrl.searchParams.get('plantId');
    const harvests = await prisma.harvest.findMany({
      where: plantId ? { plantId } : undefined,
      include: { plant: { select: PLANT_SELECT } },
      orderBy: { harvestedAt: 'desc' },
    });
    return NextResponse.json({
      success: true,
      data: { harvests, total: harvests.length },
      harvests,
      count: harvests.length,
    });
  } catch (error) {
    console.error('Get harvests error:', error);
    return errorResponse(error, 'Failed to fetch harvests');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.plantId !== 'string' || !body.plantId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: plantId' },
        { status: 400 },
      );
    }

    const plant = await prisma.plant.findUnique({ where: { id: body.plantId } });
    if (!plant) {
      return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
    }

    const data = harvestDataFromBody(body);
    const created = await prisma.harvest.create({
      data: { ...data, plantId: body.plantId } as never,
      include: { plant: { select: PLANT_SELECT } },
    });
    return NextResponse.json(
      { success: true, data: created, harvest: created, message: 'Harvest created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create harvest error:', error);
    return errorResponse(error, 'Failed to create harvest');
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.harvest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Harvest not found' }, { status: 404 });
    }

    const data = harvestDataFromBody(body);
    if (body.plantId !== undefined) {
      if (typeof body.plantId !== 'string' || !body.plantId.trim()) {
        return NextResponse.json(
          { success: false, error: 'plantId must be a non-empty string' },
          { status: 400 },
        );
      }
      const plant = await prisma.plant.findUnique({ where: { id: body.plantId } });
      if (!plant) {
        return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
      }
      data.plantId = body.plantId;
    }

    const updated = await prisma.harvest.update({
      where: { id },
      data: data as never,
      include: { plant: { select: PLANT_SELECT } },
    });
    return NextResponse.json({
      success: true,
      data: updated,
      harvest: updated,
      message: 'Harvest updated successfully',
    });
  } catch (error) {
    console.error('Update harvest error:', error);
    return errorResponse(error, 'Failed to update harvest');
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.harvest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Harvest not found' }, { status: 404 });
    }

    const deleted = await prisma.harvest.delete({
      where: { id },
      include: { plant: { select: PLANT_SELECT } },
    });
    return NextResponse.json({
      success: true,
      data: deleted,
      harvest: deleted,
      message: 'Harvest deleted successfully',
    });
  } catch (error) {
    console.error('Delete harvest error:', error);
    return errorResponse(error, 'Failed to delete harvest');
  }
}
