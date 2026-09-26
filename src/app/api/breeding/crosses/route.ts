import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

const CrossSchema = z.object({
  name: z.string().min(1).max(120),
  generation: z.string().max(20).optional(),
  motherStrainId: z.string().optional(),
  motherPlantId: z.string().optional(),
  fatherStrainId: z.string().optional(),
  fatherPlantId: z.string().optional(),
  fatherDescription: z.string().max(300).optional(),
  resultingStrainId: z.string().optional(),
  /** When true and no resultingStrainId is given, create the Strain record from `name`. */
  createResultingStrain: z.boolean().optional().default(false),
  crossDate: z.string().datetime().optional(),
  seedsHarvested: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (d) => d.motherStrainId || d.motherPlantId || d.fatherStrainId || d.fatherPlantId || d.fatherDescription,
  { message: 'A cross needs at least one recorded parent (mother or father).' },
);

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

const crossInclude = {
  motherStrain: { select: { id: true, name: true } },
  fatherStrain: { select: { id: true, name: true } },
  resultingStrain: { select: { id: true, name: true } },
  motherPlant: { select: { id: true, name: true } },
  fatherPlant: { select: { id: true, name: true } },
};

/**
 * GET /api/breeding/crosses — list recorded crosses, newest first.
 */
export async function GET() {
  const crosses = await prisma.breedingCross.findMany({
    orderBy: { crossDate: 'desc' },
    include: crossInclude,
  });
  return addSecurityHeaders(NextResponse.json({ success: true, crosses }));
}

/**
 * POST /api/breeding/crosses — record a pollination / breeding event.
 */
export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    const body = await request.json();
    const parsed = CrossSchema.safeParse(body);
    if (!parsed.success) {
      return addSecurityHeaders(NextResponse.json(
        { success: false, error: 'Invalid cross payload', details: parsed.error.issues },
        { status: 400 },
      ));
    }
    const data = parsed.data;

    // Verify referenced records exist so we never write dangling ids.
    for (const [field, model] of [
      ['motherStrainId', 'strain'], ['fatherStrainId', 'strain'],
      ['motherPlantId', 'plant'], ['fatherPlantId', 'plant'],
      ['resultingStrainId', 'strain'],
    ] as const) {
      const id = (data as any)[field];
      if (id) {
        const exists = model === 'strain'
          ? await prisma.strain.findUnique({ where: { id }, select: { id: true } })
          : await prisma.plant.findUnique({ where: { id }, select: { id: true } });
        if (!exists) {
          return addSecurityHeaders(NextResponse.json(
            { success: false, error: `${field} does not match a known ${model}` },
            { status: 422 },
          ));
        }
      }
    }

    let resultingStrainId = data.resultingStrainId;
    if (!resultingStrainId && data.createResultingStrain) {
      const strain = await prisma.strain.create({
        data: {
          name: data.name,
          type: 'hybrid',
          lineage: [
            data.motherStrainId ? 'mother tracked' : null,
            data.fatherStrainId ? 'father tracked' : data.fatherDescription,
          ].filter(Boolean).join(' × ') || undefined,
        },
      });
      resultingStrainId = strain.id;
    }

    const cross = await prisma.breedingCross.create({
      data: {
        name: data.name,
        generation: data.generation,
        motherStrainId: data.motherStrainId,
        motherPlantId: data.motherPlantId,
        fatherStrainId: data.fatherStrainId,
        fatherPlantId: data.fatherPlantId,
        fatherDescription: data.fatherDescription,
        resultingStrainId,
        crossDate: data.crossDate ? new Date(data.crossDate) : undefined,
        seedsHarvested: data.seedsHarvested,
        notes: data.notes,
      },
      include: crossInclude,
    });

    log.info('breeding.cross_recorded', { crossId: cross.id, name: cross.name });
    return addSecurityHeaders(NextResponse.json({ success: true, cross }, { status: 201 }));
  } catch (error) {
    log.error('breeding.cross_error', { error: error instanceof Error ? error.message : 'unknown' });
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'Failed to record cross' },
      { status: 500 },
    ));
  }
}
