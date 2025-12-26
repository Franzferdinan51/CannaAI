/**
 * Backup Create API Endpoint
 * POST /api/backup/create - Create full database backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupManager } from '@/lib/export-import-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { includeImages = true, type = 'full' } = body;

    // Create backup
    const backupPath = await backupManager.createFullBackup();

    return NextResponse.json({
      success: true,
      backupId: backupPath,
      backupPath,
      type,
      includeImages,
      createdAt: new Date().toISOString(),
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return backup options and information
    return NextResponse.json({
      success: true,
      backupOptions: {
        types: [
          { value: 'full', label: 'Full Backup', description: 'Complete database backup with all data' },
          { value: 'incremental', label: 'Incremental Backup', description: 'Only changed data since last backup' },
          { value: 'selective', label: 'Selective Backup', description: 'Choose specific data to backup' }
        ],
        includeImages: {
          label: 'Include Images',
          description: 'Whether to include plant images in backup'
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve backup options'
    }, { status: 500 });
  }
}
