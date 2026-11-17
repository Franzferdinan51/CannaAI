import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLogger } from '@/lib/logger';

const log = getLogger().child({ tag: '[BATCH]' });

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const batches = await prisma.analysisBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: batches
    });
  } catch (error) {
    log.error('batch.list_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch batches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      type,
      plantIds,
      config,
      scheduledAt,
      createdBy
    } = body;

    if (!plantIds || !Array.isArray(plantIds) || plantIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plant IDs array is required' },
        { status: 400 }
      );
    }

    const batch = await prisma.analysisBatch.create({
      data: {
        name,
        description,
        type: type || 'photo',
        plantIds: JSON.stringify(plantIds),
        totalCount: plantIds.length,
        config: config || {},
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy,
        status: scheduledAt ? 'pending' : 'pending'
      }
    });

    // Auto-start batch if no scheduled time
    if (!scheduledAt) {
      // Trigger the batch execution asynchronously
      fetch(`${request.url.replace('/batch', '/run')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'batch', id: batch.id })
      }).catch(err => log.error('batch.auto_start_failed', { error: err instanceof Error ? err.message : String(err) }));
    }

    return NextResponse.json({
      success: true,
      data: batch
    });
  } catch (error) {
    log.error('batch.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const batch = await prisma.analysisBatch.update({
      where: { id },
      data
    });

    return NextResponse.json({
      success: true,
      data: batch
    });
  } catch (error) {
    log.error('batch.update_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    await prisma.analysisBatch.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    log.error('batch.delete_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete batch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
