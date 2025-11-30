/**
 * Import History API Endpoint
 * GET /api/import/history - Get import history
 */

import { NextRequest, NextResponse } from 'next/server';

// In a real implementation, store import history in database
const importHistory: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const paginatedHistory = importHistory.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      imports: paginatedHistory,
      total: importHistory.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < importHistory.length
      }
    });
  } catch (error) {
    console.error('Import history retrieval failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve import history'
    }, { status: 500 });
  }
}
