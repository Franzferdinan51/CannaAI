/**
 * Export History API Endpoint
 * GET /api/export/history - List export history
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportManager } from '@/lib/export-import-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const jobs = exportManager.listJobs();
    const paginatedJobs = jobs.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      jobs: paginatedJobs,
      total: jobs.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < jobs.length
      }
    });
  } catch (error) {
    console.error('Export history retrieval failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve export history',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
