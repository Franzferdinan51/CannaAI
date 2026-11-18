import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLogger } from '@/lib/logger';

const log = getLogger().child({ tag: '[THRESHOLDS]' });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const enabled = searchParams.get('enabled');

    const whereClause: any = {};
    if (metric) {
      whereClause.metric = metric;
    }
    if (enabled !== null && enabled !== undefined) {
      whereClause.enabled = enabled === 'true';
    }

    const thresholds = await prisma.alertThreshold.findMany({
      where: whereClause,
      orderBy: { metric: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: thresholds,
    });
  } catch (error) {
    log.error('thresholds.list_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alert thresholds',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, metric, condition, value, severity, enabled, roomId, sensorId, metadata } = body;

    if (!name || !metric || !condition || value === undefined || !severity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, metric, condition, value, severity',
        },
        { status: 400 }
      );
    }

    // Check if threshold with this name already exists
    const existing = await prisma.alertThreshold.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'A threshold with this name already exists',
        },
        { status: 409 }
      );
    }

    const threshold = await prisma.alertThreshold.create({
      data: {
        name,
        metric,
        condition,
        value: Number(value),
        severity,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        roomId: roomId || null,
        sensorId: sensorId || null,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    log.error('thresholds.create_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create alert threshold',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, metric, condition, value, severity, enabled, roomId, sensorId, metadata } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id',
        },
        { status: 400 }
      );
    }

    const threshold = await prisma.alertThreshold.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(metric && { metric }),
        ...(condition && { condition }),
        ...(value !== undefined && { value: Number(value) }),
        ...(severity && { severity }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(roomId !== undefined && { roomId }),
        ...(sensorId !== undefined && { sensorId }),
        ...(metadata && { metadata }),
      },
    });

    return NextResponse.json({
      success: true,
      data: threshold,
    });
  } catch (error) {
    log.error('thresholds.update_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update alert threshold',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: id',
        },
        { status: 400 }
      );
    }

    await prisma.alertThreshold.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Alert threshold deleted successfully',
    });
  } catch (error) {
    log.error('thresholds.delete_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete alert threshold',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
