/**
 * Migration Import API Endpoint
 * POST /api/migration/import - Import migrated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrationManager } from '@/lib/export-import-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Migration data required'
      }, { status: 400 });
    }

    // Import migrated data
    await migrationManager.importMigratedData(data);

    return NextResponse.json({
      success: true,
      imported: true,
      sourceVersion: data.sourceVersion,
      targetVersion: data.targetVersion,
      importedAt: new Date().toISOString(),
      message: 'Migration data imported successfully'
    });
  } catch (error) {
    console.error('Migration import failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to import migration data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const migrationId = searchParams.get('migrationId');

    if (!migrationId) {
      return NextResponse.json({
        success: false,
        error: 'Migration ID required'
      }, { status: 400 });
    }

    // Return migration status
    return NextResponse.json({
      success: true,
      migrationId,
      status: 'completed',
      importedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve migration status'
    }, { status: 500 });
  }
}
