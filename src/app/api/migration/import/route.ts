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

    // Import migrated data and preserve per-record outcome details.
    const result = await migrationManager.importMigratedData(data);

    return NextResponse.json({
      success: result.errors === 0,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
      sourceVersion: data.sourceVersion,
      targetVersion: data.targetVersion,
      importedAt: new Date().toISOString(),
      message: 'Migration data imported successfully'
    }, { status: result.errors === 0 ? 200 : 422 });
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

    // Migration status is not persisted independently of the artifacts.
    // Never report completion from the presence of an arbitrary identifier.
    return NextResponse.json({
      success: false,
      error: 'Migration status is not persisted; inspect the export job or import response.',
      migrationId,
    }, { status: 501 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve migration status'
    }, { status: 500 });
  }
}
