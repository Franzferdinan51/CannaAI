import { NextRequest, NextResponse } from 'next/server';
import { addDays, addHours, addMonths, addWeeks } from 'date-fns';
import { prisma } from '@/lib/prisma';

// Care schedules (watering / feeding) are ordinary rows in the shared
// Schedule table, distinguished by their `type`. The Schedule model
// already carries everything they need: name, cronExpression, timezone,
// interval, enabled, and a free-form `config` object that holds the
// care-specific details (plantId / roomId / amount / nutrient mix).
// Execution stays with the automation engine + scheduler workstream;
// this module is data + CRUD only, replacing the former 503 stubs at
// /api/water/schedule and /api/nutrients/schedule.

export type CareScheduleType = 'watering' | 'feeding';

const INTERVALS = ['hourly', 'daily', 'weekly', 'monthly'] as const;

const STRING_FIELDS = ['name', 'description', 'cronExpression', 'timezone', 'interval'] as const;

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

// Mirrors the recomputation in src/app/api/automation/engine/route.ts so
// a stored nextRun matches what the engine itself would calculate when
// the row comes due: a cronExpression advances one day (the engine does
// not parse full cron), otherwise the interval steps from now.
function computeNextRun(
  schedule: { cronExpression?: string | null; interval?: string | null },
  from = new Date(),
): Date {
  if (schedule.cronExpression) return addDays(from, 1);
  switch (schedule.interval) {
    case 'hourly':
      return addHours(from, 1);
    case 'weekly':
      return addWeeks(from, 1);
    case 'monthly':
      return addMonths(from, 1);
    default:
      return addDays(from, 1);
  }
}

function parseNextRun(value: unknown): Date {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) throw new Error('nextRun must be a valid date');
  return date;
}

function scheduleDataFromBody(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};

  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) {
      const value = typeof body[field] === 'string' ? (body[field] as string).trim() : body[field];
      data[field] = value === '' ? null : value;
    }
  }
  if (body.interval !== undefined && body.interval !== null && body.interval !== '') {
    if (!INTERVALS.includes(body.interval as (typeof INTERVALS)[number])) {
      throw new Error(`interval must be one of: ${INTERVALS.join(', ')}`);
    }
  }
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.config !== undefined) {
    if (body.config !== null && (typeof body.config !== 'object' || Array.isArray(body.config))) {
      throw new Error('config must be an object');
    }
    data.config = body.config;
  }
  if (body.nextRun !== undefined && body.nextRun !== null && body.nextRun !== '') {
    data.nextRun = parseNextRun(body.nextRun);
  }

  return data;
}

function configPlantId(schedule: { config: unknown }): string | null {
  if (schedule.config && typeof schedule.config === 'object' && !Array.isArray(schedule.config)) {
    const plantId = (schedule.config as Record<string, unknown>).plantId;
    return typeof plantId === 'string' ? plantId : null;
  }
  return null;
}

export async function listCareSchedules(type: CareScheduleType, request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const enabled = request.nextUrl.searchParams.get('enabled');
    const plantId = request.nextUrl.searchParams.get('plantId');

    const where: Record<string, unknown> = { type };
    if (enabled !== null) where.enabled = enabled === 'true';

    let schedules = await prisma.schedule.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
    });
    // plantId lives inside the config JSON (the Schedule table has no
    // plant column), so it is filtered here rather than in the query.
    if (plantId) schedules = schedules.filter((s) => configPlantId(s) === plantId);

    return NextResponse.json({
      success: true,
      data: { schedules, total: schedules.length },
      schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error(`List ${type} schedules error:`, error);
    return errorResponse(error, 'Failed to fetch schedules');
  }
}

export async function createCareSchedule(
  type: CareScheduleType,
  label: string,
  request: NextRequest,
) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 },
      );
    }
    if (typeof body.cronExpression !== 'string' || !body.cronExpression.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cronExpression' },
        { status: 400 },
      );
    }

    const data = scheduleDataFromBody(body);
    const created = await prisma.schedule.create({
      data: {
        name: body.name.trim(),
        description: typeof data.description === 'string' ? data.description : null,
        cronExpression: body.cronExpression.trim(),
        timezone: typeof data.timezone === 'string' && data.timezone ? data.timezone : 'UTC',
        type,
        interval: typeof data.interval === 'string' ? data.interval : null,
        enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
        config: (data.config as never) ?? {},
        nextRun:
          data.nextRun instanceof Date
            ? data.nextRun
            : computeNextRun({ cronExpression: body.cronExpression.trim(), interval: data.interval as string | null }),
      },
    });
    return NextResponse.json(
      { success: true, data: created, schedule: created, message: `${label} created successfully` },
      { status: 201 },
    );
  } catch (error) {
    console.error(`Create ${type} schedule error:`, error);
    return errorResponse(error, 'Failed to create schedule');
  }
}

export async function updateCareSchedule(
  type: CareScheduleType,
  label: string,
  request: NextRequest,
) {
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

    const existing = await prisma.schedule.findFirst({ where: { id, type } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const data = scheduleDataFromBody(body);
    // The type is owned by the route, never by the caller.
    delete data.type;
    if (
      (body.cronExpression !== undefined || body.interval !== undefined) &&
      data.nextRun === undefined
    ) {
      data.nextRun = computeNextRun({
        cronExpression: (data.cronExpression as string | null | undefined) ?? existing.cronExpression,
        interval: (data.interval as string | null | undefined) ?? existing.interval,
      });
    }

    const updated = await prisma.schedule.update({ where: { id }, data: data as never });
    return NextResponse.json({
      success: true,
      data: updated,
      schedule: updated,
      message: `${label} updated successfully`,
    });
  } catch (error) {
    console.error(`Update ${type} schedule error:`, error);
    return errorResponse(error, 'Failed to update schedule');
  }
}

export async function deleteCareSchedule(type: CareScheduleType, request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.schedule.findFirst({ where: { id, type } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const deleted = await prisma.schedule.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      data: deleted,
      schedule: deleted,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error(`Delete ${type} schedule error:`, error);
    return errorResponse(error, 'Failed to delete schedule');
  }
}
