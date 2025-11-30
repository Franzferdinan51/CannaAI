/**
 * Export Download API Endpoint
 * GET /api/export/[id] - Download export file
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportManager } from '@/lib/export-import-utils';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    const job = exportManager.getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Export job not found'
      }, { status: 404 });
    }

    if (job.status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Export job not completed',
        status: job.status,
        progress: job.progress
      }, { status: 202 });
    }

    if (!job.downloadUrl || !existsSync(job.downloadUrl)) {
      return NextResponse.json({
        success: false,
        error: 'Export file not found'
      }, { status: 404 });
    }

    // Read file
    const fileBuffer = readFileSync(job.downloadUrl);
    const filename = basename(job.downloadUrl);

    // Determine content type based on format
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'xml': 'application/xml',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const contentType = contentTypes[job.format] || 'application/octet-stream';

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Export download failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to download export file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
