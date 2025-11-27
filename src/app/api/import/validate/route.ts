/**
 * Import Validate API Endpoint
 * POST /api/import/validate - Validate import data
 */

import { NextRequest, NextResponse } from 'next/server';
import { importManager, ImportOptions } from '@/lib/export-import-utils';
import { readFileSync, existsSync } from 'fs';
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

    // Parse based on file type
    try {
      if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
        data = JSON.parse(fileContent);
      } else {
        return NextResponse.json({
          success: false,
          error: 'Invalid file format. Expected JSON, XML, CSV, or ZIP',
          supportedFormats: ['JSON', 'XML', 'CSV', 'ZIP']
        }, { status: 400 });
      }
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse file',
        message: parseError instanceof Error ? parseError.message : 'Invalid JSON/XML'
      }, { status: 400 });
    }

    // Validate data
    const importOptions: ImportOptions = {
      mergeMode: options?.mergeMode || 'merge',
      validateOnly: true,
      skipErrors: options?.skipErrors || false,
      defaultValues: options?.defaultValues || {},
      conflictResolution: options?.conflictResolution || 'keep-existing'
    };

    const validation = importManager.validateImportData(data, importOptions);

    return NextResponse.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      recordCount: validation.recordCount,
      summary: {
        totalRecords: validation.recordCount,
        hasErrors: validation.errors.length > 0,
        hasWarnings: validation.warnings.length > 0
      },
      recommendations: validation.valid ? [
        'Data validation passed',
        'Ready to import'
      ] : [
        'Fix validation errors before importing',
        'Review warnings and proceed with caution'
      ]
    });
  } catch (error) {
    console.error('Import validation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to validate import data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
