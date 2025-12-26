/**
 * Backup List API Endpoint
 * GET /api/backup/list - List available backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const backupsDir = join(process.cwd(), 'backups');

    if (!existsSync(backupsDir)) {
      return NextResponse.json({
        success: true,
        backups: [],
        total: 0
      });
    }

    const backups = readdirSync(backupsDir)
      .filter(name => statSync(join(backupsDir, name)).isDirectory())
      .map(name => {
        const fullPath = join(backupsDir, name);
        const stats = statSync(fullPath);
        return {
          id: name,
          name: name,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
          type: 'full'
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      backups,
      total: backups.length
    });
  } catch (error) {
    console.error('Backup list retrieval failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve backup list',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
