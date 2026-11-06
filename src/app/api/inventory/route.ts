import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Inventory records: supplies and equipment on hand. Replaces the
// former 503 stub at this path.

function parseNumberField(
  field: string,
  value: unknown,
  options: { min?: number } = {},
): number | null {
  if (value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`${field} must be a number`);
  if (options.min !== undefined && num < options.min) {
    throw new Error(`${field} must be at least ${options.min}`);
  }
  return num;
}

function inventoryDataFromBody(body: Record<string, unknown>, isCreate: boolean) {
  const data: Record<string, unknown> = {};

  if (body.name !== undefined || isCreate) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new Error('name is required and must be a non-empty string');
    }
    data.name = body.name.trim();
  }
  if (body.quantity !== undefined) {
    data.quantity = parseNumberField('quantity', body.quantity, { min: 0 });
  }
  if (body.lowStockThreshold !== undefined) {
    data.lowStockThreshold = parseNumberField('lowStockThreshold', body.lowStockThreshold, { min: 0 });
  }
  for (const field of ['category', 'unit', 'notes'] as const) {
    if (body[field] !== undefined) {
      data[field] =
        typeof body[field] === 'string' ? (body[field] as string).trim() || null : body[field];
    }
  }

  return data;
}

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

export async function GET(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    if (id) {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item) {
        return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: item, inventoryItem: item });
    }

    const category = params.get('category');
    let items = await prisma.inventoryItem.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
    });
    if (params.get('lowStock') === 'true') {
      items = items.filter(
        (item) => item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold,
      );
    }
    return NextResponse.json({
      success: true,
      data: { inventoryItems: items, total: items.length },
      inventoryItems: items,
      inventory: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return errorResponse(error, 'Failed to fetch inventory');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = inventoryDataFromBody(body, true);
    const created = await prisma.inventoryItem.create({ data: data as never });
    return NextResponse.json(
      { success: true, data: created, inventoryItem: created, message: 'Inventory item created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create inventory item error:', error);
    return errorResponse(error, 'Failed to create inventory item');
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
    }

    const data = inventoryDataFromBody(body, false);
    const updated = await prisma.inventoryItem.update({ where: { id }, data: data as never });
    return NextResponse.json({
      success: true,
      data: updated,
      inventoryItem: updated,
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    console.error('Update inventory item error:', error);
    return errorResponse(error, 'Failed to update inventory item');
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.BUILD_MODE === 'static') return staticResponse();

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 },
      );
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
    }

    const deleted = await prisma.inventoryItem.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      data: deleted,
      inventoryItem: deleted,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    return errorResponse(error, 'Failed to delete inventory item');
  }
}
