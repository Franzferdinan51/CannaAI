import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildLineage, pedigreeString, type LineageLoaders } from '@/lib/breeding';

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

/**
 * GET /api/breeding/lineage?strainId=... — family tree for a strain,
 * built by walking breeding crosses backwards. Also returns a readable
 * pedigree string like "(A × B → C F1)".
 */
export async function GET(request: NextRequest) {
  const strainId = request.nextUrl.searchParams.get('strainId');
  if (!strainId) {
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'strainId query param is required' },
      { status: 400 },
    ));
  }

  const loaders: LineageLoaders = {
    getStrain: (id) => prisma.strain.findUnique({ where: { id }, select: { id: true, name: true } }),
    getCrossByResultStrain: (id) => prisma.breedingCross.findFirst({
      where: { resultingStrainId: id },
      orderBy: { crossDate: 'desc' },
      include: {
        motherStrain: { select: { id: true, name: true } },
        fatherStrain: { select: { id: true, name: true } },
      },
    }),
  };

  const tree = await buildLineage(strainId, loaders);
  if (!tree) {
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'Strain not found' },
      { status: 404 },
    ));
  }

  return addSecurityHeaders(NextResponse.json({
    success: true,
    lineage: tree,
    pedigree: pedigreeString(tree),
  }));
}
