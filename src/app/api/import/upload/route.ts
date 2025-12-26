/**
 * Import Upload API Endpoint
 * POST /api/import/upload - Upload import file
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded'
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/json',
      'text/csv',
      'application/xml',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported file type',
        supportedTypes: allowedTypes
      }, { status: 400 });
    }

    // Create uploads directory if not exists
    const uploadsDir = join(process.cwd(), 'uploads', 'imports');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file with unique name
    const importId = uuidv4();
    const timestamp = Date.now();
    const filename = `import_${importId}_${timestamp}_${file.name}`;
    const filepath = join(uploadsDir, filename);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filepath, fileBuffer);

    return NextResponse.json({
      success: true,
      importId,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Import upload failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
