/**
 * Import History API Endpoint
 * GET /api/import/history - Get import history
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const requestedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
    const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

    const [imports, total] = await Promise.all([
      prisma.importHistory.findMany({ orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.importHistory.count()
    ]);

    return NextResponse.json({
      success: true,
      imports,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    getLogger().error('import_history_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve import history'
    }, { status: 500 });
  }
}
