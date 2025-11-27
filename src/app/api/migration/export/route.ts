/**
 * Migration Export API Endpoint
 * POST /api/migration/export - Export data for migration
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrationManager } from '@/lib/export-import-utils';
import { z } from 'zod';

const MigrationSchema = z.object({
  sourceVersion: z.string(),
  targetVersion: z.string(),
  includeImages: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceVersion, targetVersion, includeImages = true } = MigrationSchema.parse(body);

    const migrationData = await migrationManager.exportForMigration(
      sourceVersion,
      targetVersion
    );

    return NextResponse.json({
      success: true,
      migrationId: migrationData.migrationId,
      sourceVersion,
      targetVersion,
      timestamp: migrationData.timestamp,
      includeImages,
      message: 'Migration export created successfully'
    });
  } catch (error) {
    console.error('Migration export failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create migration export',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return migration information
    return NextResponse.json({
      success: true,
      currentVersion: '1.0.0',
      availableVersions: ['1.0.0'],
      migrationPaths: [
        { from: '1.0.0', to: '1.0.0', description: 'Current version' }
      ]
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve migration information'
    }, { status: 500 });
  }
}
