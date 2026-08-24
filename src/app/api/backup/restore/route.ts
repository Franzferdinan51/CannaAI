/**
 * Backup Restore API Endpoint
 * POST /api/backup/restore - Restore from backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupManager, isOpaqueId } from '@/lib/export-import-utils';
import { z } from 'zod';

const RestoreSchema = z.object({
  backupId: z.string(),
  verifyOnly: z.boolean().optional(),
  createBackupBeforeRestore: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backupId, verifyOnly = false, createBackupBeforeRestore = true } = RestoreSchema.parse(body);
    if (!isOpaqueId(backupId)) {
      return NextResponse.json({ success: false, error: 'Invalid backup ID' }, { status: 400 });
    }

    if (verifyOnly) {
      await backupManager.verifyBackup(backupId);
      return NextResponse.json({
        success: true,
        verified: true,
        backupId,
        message: 'Backup verified successfully'
      });
    }

    // Create backup before restore if requested
    if (createBackupBeforeRestore) {
      await backupManager.createFullBackup();
    }

    // Restore from backup
    await backupManager.restoreFromBackup(backupId);

    return NextResponse.json({
      success: true,
      restored: true,
      backupId,
      restoredAt: new Date().toISOString(),
      message: 'Database restored successfully from backup'
    });
  } catch (error) {
    console.error('Backup restore failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to restore from backup',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return NextResponse.json({
        success: false,
        error: 'Backup ID required'
      }, { status: 400 });
    }
    if (!isOpaqueId(backupId)) {
      return NextResponse.json({ success: false, error: 'Invalid backup ID' }, { status: 400 });
    }

    await backupManager.verifyBackup(backupId);
    return NextResponse.json({
      success: true,
      verified: true,
      backupId,
      message: 'Backup is valid and ready to restore'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to verify backup',
    }, { status: 500 });
  }
}
