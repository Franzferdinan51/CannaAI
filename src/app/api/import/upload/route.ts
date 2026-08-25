/**
 * Import Upload API Endpoint
 * POST /api/import/upload - Upload import file
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { basename, join } from 'path';
import { MAX_IMPORT_FILE_SIZE, resolveImportFilePath } from '@/lib/export-import-utils';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_FILE_SIZE + 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'File exceeds the maximum upload size'
      }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    // Avoid relying on a global File constructor: Node versions and test
    // runtimes may provide FormData file parts without exposing File globally.
    const isFileLike = (value: FormDataEntryValue | null): value is File => (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as File).arrayBuffer === 'function' &&
      typeof (value as File).size === 'number'
    );

    if (!isFileLike(file)) {
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

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File exceeds the maximum upload size'
      }, { status: 413 });
    }

    // Create uploads directory if not exists
    const uploadsDir = join(process.cwd(), 'uploads', 'imports');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file with unique name
    const importId = uuidv4();
    const filename = importId;
    const filepath = resolveImportFilePath(importId);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.length > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File exceeds the maximum upload size'
      }, { status: 413 });
    }
    writeFileSync(filepath, fileBuffer, { flag: 'wx', mode: 0o600 });

    return NextResponse.json({
      success: true,
      importId,
      filename,
      originalName: basename(file.name),
      size: fileBuffer.length,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Import upload failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file',
    }, { status: 500 });
  }
}
