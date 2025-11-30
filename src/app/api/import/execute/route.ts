/**
 * Import Execute API Endpoint
 * POST /api/import/execute - Execute import
 */

import { NextRequest, NextResponse } from 'next/server';
import { importManager, ImportOptions } from '@/lib/export-import-utils';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, options } = body;

    if (!fileId) {
      return NextResponse.json({
        success: false,
        error: 'File ID required'
      }, { status: 400 });
    }

    const filepath = join(process.cwd(), 'uploads', 'imports', fileId);

    if (!existsSync(filepath)) {
      return NextResponse.json({
        success: false,
        error: 'Uploaded file not found'
      }, { status: 404 });
    }

    // Read file
    const fileContent = readFileSync(filepath, 'utf-8');
    let data: any;

    try {
      if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
        data = JSON.parse(fileContent);
      } else {
        return NextResponse.json({
          success: false,
          error: 'Invalid file format'
        }, { status: 400 });
      }
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse file',
        message: parseError instanceof Error ? parseError.message : 'Invalid JSON'
      }, { status: 400 });
    }

    // Execute import
    const importOptions: ImportOptions = {
      mergeMode: options?.mergeMode || 'merge',
      validateOnly: false,
      skipErrors: options?.skipErrors || true,
      defaultValues: options?.defaultValues || {},
      conflictResolution: options?.conflictResolution || 'keep-existing'
    };

    const result = await importManager.processImport(data, importOptions);

    // Delete uploaded file after processing
    try {
      unlinkSync(filepath);
    } catch (deleteError) {
      console.warn('Failed to delete uploaded file:', deleteError);
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      total: result.imported + result.skipped + result.errors,
      details: result.details,
      summary: {
        success: result.errors === 0,
        message: `Imported ${result.imported} records, skipped ${result.skipped}, errors ${result.errors}`
      }
    });
  } catch (error) {
    console.error('Import execution failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute import',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
