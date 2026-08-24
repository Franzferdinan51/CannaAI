/**
 * Import Execute API Endpoint
 * POST /api/import/execute - Execute import
 */

import { NextRequest, NextResponse } from 'next/server';
import { importManager, ImportOptions, resolveImportFilePath, MAX_IMPORT_FILE_SIZE } from '@/lib/export-import-utils';
import { readFileSync, existsSync, unlinkSync, statSync } from 'fs';

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

    let filepath: string;
    try {
      filepath = resolveImportFilePath(fileId);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid file ID' }, { status: 400 });
    }

    if (!existsSync(filepath)) {
      return NextResponse.json({
        success: false,
        error: 'Uploaded file not found'
      }, { status: 404 });
    }

    if (statSync(filepath).size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Uploaded file is too large' }, { status: 413 });
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
      }, { status: 400 });
    }

    // Execute import
    const importOptions: ImportOptions = {
      mergeMode: options?.mergeMode || 'merge',
      validateOnly: false,
      skipErrors: typeof options?.skipErrors === 'boolean' ? options.skipErrors : true,
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
      success: result.errors === 0,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      total: result.imported + result.skipped + result.errors,
      details: result.details,
      summary: {
        success: result.errors === 0,
        message: `Imported ${result.imported} records, skipped ${result.skipped}, errors ${result.errors}`
      }
    }, { status: result.errors > 0 && importOptions.skipErrors === false ? 422 : 200 });
  } catch (error) {
    console.error('Import execution failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute import',
    }, { status: 500 });
  }
}
