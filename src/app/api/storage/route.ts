import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Server-backed document storage, keyed by a unique document key.
 *
 * This route used to import the browser-only IndexedDB store into the
 * Node runtime and return a misleading 500. The Document model now
 * backs it for real: POST upserts a JSON document under its key, GET
 * lists document metadata or returns one document by ?key=, DELETE
 * removes one document by ?key= (there is deliberately no clear-all).
 */

function errorResponse(error: unknown, fallback: string, status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  const isValidation = /must be|required/i.test(message);
  return NextResponse.json(
    { success: false, error: message || fallback },
    { status: isValidation ? 400 : status },
  );
}

function staticResponse() {
  return NextResponse.json({
    success: false,
    message: 'This API is handled client-side in static export mode.',
    clientSide: true,
    buildMode: 'static',
  });
}

// GET /api/storage - list document metadata, or one document with ?key=
export async function GET(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const key = new URL(request.url).searchParams.get('key');
    if (key) {
      const document = await prisma.document.findUnique({ where: { key } });
      if (!document) {
        return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: document, document });
    }

    const documents = await prisma.document.findMany({
      select: { id: true, key: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({
      success: true,
      data: { documents, total: documents.length },
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return errorResponse(error, 'Failed to fetch documents');
  }
}

// POST /api/storage - upsert a document by key: { key, title?, data }
export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.key !== 'string' || !body.key.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: key' },
        { status: 400 },
      );
    }
    if (body.data === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: data' },
        { status: 400 },
      );
    }
    const title =
      typeof body.title === 'string' ? body.title.trim() || null : body.title === null ? null : undefined;

    const existing = await prisma.document.findUnique({ where: { key: body.key } });
    if (existing) {
      const updated = await prisma.document.update({
        where: { key: body.key },
        data: { data: body.data as never, ...(title !== undefined ? { title } : {}) },
      });
      return NextResponse.json({
        success: true,
        data: updated,
        document: updated,
        message: 'Document updated successfully',
      });
    }

    const created = await prisma.document.create({
      data: { key: body.key, title: title ?? null, data: body.data as never },
    });
    return NextResponse.json(
      { success: true, data: created, document: created, message: 'Document created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Save document error:', error);
    return errorResponse(error, 'Failed to save document');
  }
}

// DELETE /api/storage?key= - delete one document by key
export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const key = new URL(request.url).searchParams.get('key');
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: key' },
        { status: 400 },
      );
    }

    const existing = await prisma.document.findUnique({ where: { key } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const deleted = await prisma.document.delete({ where: { key } });
    return NextResponse.json({
      success: true,
      data: deleted,
      document: deleted,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return errorResponse(error, 'Failed to delete document');
  }
}
