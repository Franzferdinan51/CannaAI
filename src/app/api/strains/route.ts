import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STRING_FIELDS = [
  'name',
  'type',
  'lineage',
  'description',
  'growingDifficulty',
] as const;

const NUMBER_FIELDS = ['floweringTime', 'thcLevel', 'cbdLevel'] as const;

const JSON_FIELDS = [
  'optimalConditions',
  'commonDeficiencies',
  'characteristics',
  'effects',
  'medicalUses',
  'flavors',
  'aroma',
] as const;

type StrainRecord = Awaited<ReturnType<typeof prisma.strain.findFirst>>;

function serializeStrain(strain: NonNullable<StrainRecord>) {
  const characteristics =
    strain.characteristics && typeof strain.characteristics === 'object' && !Array.isArray(strain.characteristics)
      ? (strain.characteristics as Record<string, unknown>)
      : {};
  return {
    ...strain,
    commonDeficiencies: Array.isArray(strain.commonDeficiencies) ? strain.commonDeficiencies : [],
    specialNotes: typeof characteristics.specialNotes === 'string' ? characteristics.specialNotes : '',
  };
}

function strainDataFromBody(body: Record<string, unknown>, partial: boolean) {
  const data: Record<string, unknown> = {};

  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) {
      const value = typeof body[field] === 'string' ? (body[field] as string).trim() : body[field];
      if (!partial && (field === 'name' || field === 'type') && !value) continue;
      data[field] = value === '' ? null : value;
    }
  }
  for (const field of NUMBER_FIELDS) {
    if (body[field] !== undefined) {
      if (body[field] === null || body[field] === '') data[field] = null;
      else {
        const value = Number(body[field]);
        if (!Number.isFinite(value)) throw new Error(`${field} must be a number`);
        data[field] = field === 'floweringTime' ? Math.round(value) : value;
      }
    }
  }
  for (const field of JSON_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.isPurpleStrain !== undefined) data.isPurpleStrain = Boolean(body.isPurpleStrain);

  // The historical UI used a top-level specialNotes field. The database keeps
  // strain facts in characteristics, so preserve the note there instead of
  // dropping it at the API boundary.
  if (body.specialNotes !== undefined) {
    const existing =
      data.characteristics && typeof data.characteristics === 'object' && !Array.isArray(data.characteristics)
        ? (data.characteristics as Record<string, unknown>)
        : {};
    data.characteristics = { ...existing, specialNotes: body.specialNotes || '' };
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

export async function GET(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static',
    });
  }

  try {
    await ensureSeedData();
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const strain = await prisma.strain.findUnique({ where: { id } });
      if (!strain) {
        return NextResponse.json({ success: false, error: 'Strain not found' }, { status: 404 });
      }
      const serialized = serializeStrain(strain);
      return NextResponse.json({ success: true, data: serialized, strain: serialized });
    }

    const strains = (await prisma.strain.findMany({ orderBy: { name: 'asc' } })).map(serializeStrain);
    return NextResponse.json({
      success: true,
      data: { strains, total: strains.length },
      strains,
      count: strains.length,
    });
  } catch (error) {
    console.error('Get strains error:', error);
    return errorResponse(error, 'Failed to fetch strains');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static',
    });
  }

  try {
    await ensureSeedData();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required field: name' }, { status: 400 });
    }

    const data = strainDataFromBody(body, false);
    const created = await prisma.strain.create({
      data: {
        name: String(data.name),
        type: typeof data.type === 'string' && data.type ? data.type : 'Hybrid',
        lineage: typeof data.lineage === 'string' ? data.lineage : null,
        description: typeof data.description === 'string' ? data.description : null,
        isPurpleStrain: Boolean(data.isPurpleStrain),
        optimalConditions: (data.optimalConditions as never) ?? undefined,
        commonDeficiencies: (data.commonDeficiencies as never) ?? [],
        characteristics: (data.characteristics as never) ?? undefined,
        growingDifficulty: typeof data.growingDifficulty === 'string' ? data.growingDifficulty : null,
        floweringTime: typeof data.floweringTime === 'number' ? data.floweringTime : null,
        thcLevel: typeof data.thcLevel === 'number' ? data.thcLevel : null,
        cbdLevel: typeof data.cbdLevel === 'number' ? data.cbdLevel : null,
        effects: (data.effects as never) ?? undefined,
        medicalUses: (data.medicalUses as never) ?? undefined,
        flavors: (data.flavors as never) ?? undefined,
        aroma: (data.aroma as never) ?? undefined,
      },
    });
    const serialized = serializeStrain(created);
    return NextResponse.json(
      { success: true, data: serialized, strain: serialized, message: 'Strain created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create strain error:', error);
    return errorResponse(error, 'Failed to create strain');
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static',
    });
  }

  try {
    await ensureSeedData();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing required field: id' }, { status: 400 });
    }

    const existing = await prisma.strain.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Strain not found' }, { status: 404 });
    }

    const data = strainDataFromBody(body, true);
    // If only specialNotes changed, merge it into the stored characteristics
    // instead of replacing unrelated characteristics with a one-key object.
    if (body.specialNotes !== undefined && body.characteristics === undefined) {
      const current =
        existing.characteristics && typeof existing.characteristics === 'object' && !Array.isArray(existing.characteristics)
          ? (existing.characteristics as Record<string, unknown>)
          : {};
      data.characteristics = { ...current, specialNotes: body.specialNotes || '' };
    }

    const updated = await prisma.strain.update({ where: { id }, data: data as never });
    const serialized = serializeStrain(updated);
    return NextResponse.json({
      success: true,
      data: serialized,
      strain: serialized,
      message: 'Strain updated successfully',
    });
  } catch (error) {
    console.error('Update strain error:', error);
    return errorResponse(error, 'Failed to update strain');
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static',
    });
  }

  try {
    await ensureSeedData();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.strain.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Strain not found' }, { status: 404 });
    }

    const plantCount = await prisma.plant.count({ where: { strainId: id } });
    if (plantCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `This strain is used by ${plantCount} plant${plantCount === 1 ? '' : 's'} and cannot be removed yet.`,
        },
        { status: 409 },
      );
    }

    const deleted = await prisma.strain.delete({ where: { id } });
    const serialized = serializeStrain(deleted);
    return NextResponse.json({
      success: true,
      data: serialized,
      strain: serialized,
      message: 'Strain deleted successfully',
    });
  } catch (error) {
    console.error('Delete strain error:', error);
    return errorResponse(error, 'Failed to delete strain');
  }
}
