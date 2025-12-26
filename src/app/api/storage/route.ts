import { NextRequest, NextResponse } from 'next/server';
import {
  saveDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  clearDocuments,
  exportAllData,
  importData,
  getDBStats
} from '@/lib/indexedDB';

export const runtime = 'nodejs';

/**
 * Storage API Endpoint
 * Handles document storage, retrieval, and management
 */

// GET /api/storage - Get all documents or stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (action === 'stats') {
      const stats = await getDBStats();
      return NextResponse.json({ success: true, ...stats });
    }

    if (action === 'export') {
      const data = await exportAllData();
      return NextResponse.json({
        success: true,
        data,
        filename: `cannaai-backup-${new Date().toISOString().split('T')[0]}.json`
      });
    }

    if (id) {
      const doc = await getDocument(id);
      if (!doc) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, document: doc });
    }

    const docs = await getDocuments();
    return NextResponse.json({ success: true, documents: docs });

  } catch (error: any) {
    console.error('[STORAGE GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/storage - Save document or import data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, document, data } = body;

    if (action === 'import') {
      await importData(data);
      return NextResponse.json({
        success: true,
        message: 'Data imported successfully'
      });
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document is required' },
        { status: 400 }
      );
    }

    await saveDocument(document);

    return NextResponse.json({
      success: true,
      message: 'Document saved successfully',
      id: document.id
    });

  } catch (error: any) {
    console.error('[STORAGE POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/storage - Delete document or clear all
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clear = searchParams.get('clear');

    if (clear === 'all') {
      await clearDocuments();
      return NextResponse.json({
        success: true,
        message: 'All documents cleared'
      });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    await deleteDocument(id);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error: any) {
    console.error('[STORAGE DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
