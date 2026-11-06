import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cloning records: one row per batch of cuttings taken from a mother
// plant. Replaces the former 503 stub at this path.

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

function parseCountField(
  field: string,
  value: unknown,
  options: { required?: boolean; min: number },
): number | null {
  if (value === undefined || value === null || value === '') {
    if (options.required) throw new Error(`${field} is required`);
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < options.min) {
    throw new Error(`${field} must be an integer of at least ${options.min}`);
  }
  return num;
}

function cloneDataFromBody(body: Record<string, unknown>, isCreate: boolean) {
  const data: Record<string, unknown> = {};

  if (body.takenAt !== undefined) data.takenAt = parseDateField('takenAt', body.takenAt);
  if (body.cuttings !== undefined || isCreate) {
    data.cuttings = parseCountField('cuttings', body.cuttings, { required: isCreate, min: 1 });
  }
  if (body.rootedCount !== undefined) {
    data.rootedCount = parseCountField('rootedCount', body.rootedCount, { min: 0 });
  }
  const cuttings = typeof data.cuttings === 'number' ? data.cuttings : undefined;
  const rooted = typeof data.rootedCount === 'number' ? data.rootedCount : undefined;
  if (cuttings !== undefined && rooted !== undefined && rooted > cuttings) {
    throw new Error('rootedCount cannot exceed cuttings');
  }
  for (const field of ['method', 'notes'] as const) {
    if (body[field] !== undefined) {
      data[field] =
        typeof body[field] === 'string' ? (body[field] as string).trim() || null : body[field];
    }
  }

  return data;
}

function errorResponse(error: unknown, fallback: string, status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  const isValidation = /must be|required|cannot exceed/i.test(message);
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
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    if (id) {
      const batch = await prisma.cloneBatch.findUnique({
        where: { id },
        include: { motherPlant: { select: PLANT_SELECT } },
      });
      if (!batch) {
        return NextResponse.json({ success: false, error: 'Clone batch not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: batch, cloneBatch: batch });
    }

    const motherPlantId = params.get('motherPlantId') || params.get('plantId');
    const batches = await prisma.cloneBatch.findMany({
      where: motherPlantId ? { motherPlantId } : undefined,
      include: { motherPlant: { select: PLANT_SELECT } },
      orderBy: { takenAt: 'desc' },
    });
    return NextResponse.json({
      success: true,
      data: { cloneBatches: batches, total: batches.length },
      cloneBatches: batches,
      count: batches.length,
    });
  } catch (error) {
    console.error('Get clone batches error:', error);
    return errorResponse(error, 'Failed to fetch clone batches');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.motherPlantId !== 'string' || !body.motherPlantId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: motherPlantId' },
        { status: 400 },
      );
    }

    const mother = await prisma.plant.findUnique({ where: { id: body.motherPlantId } });
    if (!mother) {
      return NextResponse.json({ success: false, error: 'Mother plant not found' }, { status: 404 });
    }

    const data = cloneDataFromBody(body, true);
    const created = await prisma.cloneBatch.create({
      data: { ...data, motherPlantId: body.motherPlantId } as never,
      include: { motherPlant: { select: PLANT_SELECT } },
    });
    return NextResponse.json(
      { success: true, data: created, cloneBatch: created, message: 'Clone batch created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create clone batch error:', error);
    return errorResponse(error, 'Failed to create clone batch');
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.cloneBatch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Clone batch not found' }, { status: 404 });
    }

    const data = cloneDataFromBody(body, false);
    // Cross-field check against stored values when only one side changes.
    const nextCuttings = typeof data.cuttings === 'number' ? data.cuttings : existing.cuttings;
    const nextRooted = typeof data.rootedCount === 'number' ? data.rootedCount : existing.rootedCount;
    if (nextRooted !== null && nextRooted !== undefined && nextRooted > nextCuttings) {
      return NextResponse.json(
        { success: false, error: 'rootedCount cannot exceed cuttings' },
        { status: 400 },
      );
    }
    if (body.motherPlantId !== undefined) {
      if (typeof body.motherPlantId !== 'string' || !body.motherPlantId.trim()) {
        return NextResponse.json(
          { success: false, error: 'motherPlantId must be a non-empty string' },
          { status: 400 },
        );
      }
      const mother = await prisma.plant.findUnique({ where: { id: body.motherPlantId } });
      if (!mother) {
        return NextResponse.json({ success: false, error: 'Mother plant not found' }, { status: 404 });
      }
      data.motherPlantId = body.motherPlantId;
    }

    const updated = await prisma.cloneBatch.update({
      where: { id },
      data: data as never,
      include: { motherPlant: { select: PLANT_SELECT } },
    });
    return NextResponse.json({
      success: true,
      data: updated,
      cloneBatch: updated,
      message: 'Clone batch updated successfully',
    });
  } catch (error) {
    console.error('Update clone batch error:', error);
    return errorResponse(error, 'Failed to update clone batch');
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.cloneBatch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Clone batch not found' }, { status: 404 });
    }

    const deleted = await prisma.cloneBatch.delete({
      where: { id },
      include: { motherPlant: { select: PLANT_SELECT } },
    });
    return NextResponse.json({
      success: true,
      data: deleted,
      cloneBatch: deleted,
      message: 'Clone batch deleted successfully',
    });
  } catch (error) {
    console.error('Delete clone batch error:', error);
    return errorResponse(error, 'Failed to delete clone batch');
  }
}
