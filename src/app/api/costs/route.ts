import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cost and revenue records: one row per entry. Replaces the former 503
// stub at this path. Amounts are in the grow's operating currency;
// negative amounts read as refunds/credits.

const PLANT_SELECT = { id: true, name: true, strainId: true, stage: true } as const;
const ROOM_SELECT = { id: true, name: true } as const;

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

function costDataFromBody(body: Record<string, unknown>, isCreate: boolean) {
  const data: Record<string, unknown> = {};

  if (body.occurredAt !== undefined) data.occurredAt = parseDateField('occurredAt', body.occurredAt);
  if (body.category !== undefined || isCreate) {
    if (typeof body.category !== 'string' || !body.category.trim()) {
      throw new Error('category is required and must be a non-empty string');
    }
    data.category = body.category.trim();
  }
  if (body.amount !== undefined || isCreate) {
    const value = Number(body.amount);
    if (body.amount === undefined || body.amount === null || body.amount === '' || !Number.isFinite(value)) {
      throw new Error('amount is required and must be a number');
    }
    data.amount = value;
  }
  if (body.note !== undefined) {
    data.note = typeof body.note === 'string' ? body.note.trim() || null : body.note;
  }
  for (const field of ['plantId', 'roomId'] as const) {
    if (body[field] !== undefined) {
      if (body[field] === null || body[field] === '') data[field] = null;
      else if (typeof body[field] !== 'string') throw new Error(`${field} must be a string`);
      else data[field] = body[field];
    }
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

const INCLUDE = { plant: { select: PLANT_SELECT }, room: { select: ROOM_SELECT } } as const;

export async function GET(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    if (id) {
      const record = await prisma.costRecord.findUnique({ where: { id }, include: INCLUDE });
      if (!record) {
        return NextResponse.json({ success: false, error: 'Cost record not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: record, costRecord: record });
    }

    const where: Record<string, unknown> = {};
    const category = params.get('category');
    if (category) where.category = category;
    const plantId = params.get('plantId');
    if (plantId) where.plantId = plantId;
    const roomId = params.get('roomId');
    if (roomId) where.roomId = roomId;

    const records = await prisma.costRecord.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: INCLUDE,
      orderBy: { occurredAt: 'desc' },
    });

    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const record of records) {
      total += record.amount;
      byCategory[record.category] = (byCategory[record.category] ?? 0) + record.amount;
    }
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        costRecords: records,
        total: records.length,
        totals: {
          amount: round2(total),
          byCategory: Object.fromEntries(
            Object.entries(byCategory).map(([k, v]) => [k, round2(v)]),
          ),
        },
      },
      costRecords: records,
      count: records.length,
    });
  } catch (error) {
    console.error('Get cost records error:', error);
    return errorResponse(error, 'Failed to fetch cost records');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = costDataFromBody(body, true);
    const linkError = await assertLinksExist(data);
    if (linkError) {
      return NextResponse.json({ success: false, error: linkError }, { status: 404 });
    }

    const created = await prisma.costRecord.create({ data: data as never, include: INCLUDE });
    return NextResponse.json(
      { success: true, data: created, costRecord: created, message: 'Cost record created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create cost record error:', error);
    return errorResponse(error, 'Failed to create cost record');
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

    const existing = await prisma.costRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cost record not found' }, { status: 404 });
    }

    const data = costDataFromBody(body, false);
    const linkError = await assertLinksExist(data);
    if (linkError) {
      return NextResponse.json({ success: false, error: linkError }, { status: 404 });
    }

    const updated = await prisma.costRecord.update({
      where: { id },
      data: data as never,
      include: INCLUDE,
    });
    return NextResponse.json({
      success: true,
      data: updated,
      costRecord: updated,
      message: 'Cost record updated successfully',
    });
  } catch (error) {
    console.error('Update cost record error:', error);
    return errorResponse(error, 'Failed to update cost record');
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

    const existing = await prisma.costRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cost record not found' }, { status: 404 });
    }

    const deleted = await prisma.costRecord.delete({ where: { id }, include: INCLUDE });
    return NextResponse.json({
      success: true,
      data: deleted,
      costRecord: deleted,
      message: 'Cost record deleted successfully',
    });
  } catch (error) {
    console.error('Delete cost record error:', error);
    return errorResponse(error, 'Failed to delete cost record');
  }
}
