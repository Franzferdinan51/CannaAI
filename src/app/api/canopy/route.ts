import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Canopy measurements: one row per measurement of a plant or a room.
// Replaces the former 503 stub at this path.

const PLANT_SELECT = { id: true, name: true, strainId: true, stage: true } as const;
const ROOM_SELECT = { id: true, name: true } as const;
const INCLUDE = { plant: { select: PLANT_SELECT }, room: { select: ROOM_SELECT } } as const;

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

function canopyDataFromBody(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  if (body.measuredAt !== undefined) data.measuredAt = parseDateField('measuredAt', body.measuredAt);
  if (body.coveragePercent !== undefined) {
    if (body.coveragePercent === null || body.coveragePercent === '') data.coveragePercent = null;
    else {
      const value = Number(body.coveragePercent);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error('coveragePercent must be a number between 0 and 100');
      }
      data.coveragePercent = value;
    }
  }
  if (body.heightCm !== undefined) {
    if (body.heightCm === null || body.heightCm === '') data.heightCm = null;
    else {
      const value = Number(body.heightCm);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('heightCm must be a non-negative number');
      }
      data.heightCm = value;
    }
  }
  for (const field of ['plantId', 'roomId'] as const) {
    if (body[field] !== undefined) {
      if (body[field] === null || body[field] === '') data[field] = null;
      else if (typeof body[field] !== 'string') throw new Error(`${field} must be a string`);
      else data[field] = body[field];
    }
  }
  if (body.notes !== undefined) {
    data.notes = typeof body.notes === 'string' ? body.notes.trim() || null : body.notes;
  }

  return data;
}

async function assertLinksExist(data: Record<string, unknown>) {
  if (typeof data.plantId === 'string') {
    const plant = await prisma.plant.findUnique({ where: { id: data.plantId } });
    if (!plant) return 'Plant not found';
  }
  if (typeof data.roomId === 'string') {
    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) return 'Room not found';
  }
  return null;
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
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    if (id) {
      const measurement = await prisma.canopyMeasurement.findUnique({ where: { id }, include: INCLUDE });
      if (!measurement) {
        return NextResponse.json({ success: false, error: 'Canopy measurement not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: measurement, canopyMeasurement: measurement });
    }

    const where: Record<string, unknown> = {};
    const plantId = params.get('plantId');
    if (plantId) where.plantId = plantId;
    const roomId = params.get('roomId');
    if (roomId) where.roomId = roomId;

    const measurements = await prisma.canopyMeasurement.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: INCLUDE,
      orderBy: { measuredAt: 'desc' },
    });
    return NextResponse.json({
      success: true,
      data: { canopyMeasurements: measurements, total: measurements.length },
      canopyMeasurements: measurements,
      count: measurements.length,
    });
  } catch (error) {
    console.error('Get canopy measurements error:', error);
    return errorResponse(error, 'Failed to fetch canopy measurements');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = canopyDataFromBody(body);
    if (!data.plantId && !data.roomId) {
      return NextResponse.json(
        { success: false, error: 'A canopy measurement must name a plantId or a roomId' },
        { status: 400 },
      );
    }
    const linkError = await assertLinksExist(data);
    if (linkError) {
      return NextResponse.json({ success: false, error: linkError }, { status: 404 });
    }

    const created = await prisma.canopyMeasurement.create({ data: data as never, include: INCLUDE });
    return NextResponse.json(
      { success: true, data: created, canopyMeasurement: created, message: 'Canopy measurement created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create canopy measurement error:', error);
    return errorResponse(error, 'Failed to create canopy measurement');
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

    const existing = await prisma.canopyMeasurement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Canopy measurement not found' }, { status: 404 });
    }

    const data = canopyDataFromBody(body);
    const linkError = await assertLinksExist(data);
    if (linkError) {
      return NextResponse.json({ success: false, error: linkError }, { status: 404 });
    }

    const updated = await prisma.canopyMeasurement.update({
      where: { id },
      data: data as never,
      include: INCLUDE,
    });
    return NextResponse.json({
      success: true,
      data: updated,
      canopyMeasurement: updated,
      message: 'Canopy measurement updated successfully',
    });
  } catch (error) {
    console.error('Update canopy measurement error:', error);
    return errorResponse(error, 'Failed to update canopy measurement');
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

    const existing = await prisma.canopyMeasurement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Canopy measurement not found' }, { status: 404 });
    }

    const deleted = await prisma.canopyMeasurement.delete({ where: { id }, include: INCLUDE });
    return NextResponse.json({
      success: true,
      data: deleted,
      canopyMeasurement: deleted,
      message: 'Canopy measurement deleted successfully',
    });
  } catch (error) {
    console.error('Delete canopy measurement error:', error);
    return errorResponse(error, 'Failed to delete canopy measurement');
  }
}
