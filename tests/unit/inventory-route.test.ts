/** @jest-environment node */

const mockPrisma = {
  inventoryItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/inventory/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('/api/inventory', () => {
  it('creates an item and parses quantity', async () => {
    mockPrisma.inventoryItem.create.mockImplementation(async ({ data }: any) => ({ id: 'i-1', ...data }));

    const response = await POST(
      jsonRequest('http://localhost/api/inventory', 'POST', {
        name: 'Coco coir brick',
        quantity: '6',
        unit: 'brick',
        lowStockThreshold: 2,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    const data = mockPrisma.inventoryItem.create.mock.calls[0][0].data;
    expect(data.quantity).toBe(6);
    expect(data.name).toBe('Coco coir brick');
  });

  it('requires a name and a non-negative quantity', async () => {
    const noName = await POST(jsonRequest('http://localhost/api/inventory', 'POST', { quantity: 1 }));
    expect(noName.status).toBe(400);

    const negative = await POST(
      jsonRequest('http://localhost/api/inventory', 'POST', { name: 'Tape', quantity: -1 }),
    );
    expect(negative.status).toBe(400);
    expect(mockPrisma.inventoryItem.create).not.toHaveBeenCalled();
  });

  it('filters low stock by threshold', async () => {
    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      { id: 'i-1', name: 'A', quantity: 1, lowStockThreshold: 2 },
      { id: 'i-2', name: 'B', quantity: 9, lowStockThreshold: 2 },
      { id: 'i-3', name: 'C', quantity: 0, lowStockThreshold: null },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/inventory?lowStock=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.inventoryItems[0].id).toBe('i-1');
  });

  it('returns 404 for a missing item id', async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue(null);
    const response = await GET(new NextRequest('http://localhost/api/inventory?id=missing'));
    expect(response.status).toBe(404);
  });

  it('updates quantity on PUT and deletes by query id', async () => {
    mockPrisma.inventoryItem.findUnique.mockResolvedValue({ id: 'i-1', name: 'A', quantity: 3 });
    mockPrisma.inventoryItem.update.mockImplementation(async ({ data }: any) => ({ id: 'i-1', ...data }));

    const updated = await PUT(jsonRequest('http://localhost/api/inventory', 'PUT', { id: 'i-1', quantity: 2 }));
    expect(updated.status).toBe(200);
    expect(mockPrisma.inventoryItem.update.mock.calls[0][0].data).toEqual({ quantity: 2 });

    mockPrisma.inventoryItem.delete.mockResolvedValue({ id: 'i-1' });
    const deleted = await DELETE(new NextRequest('http://localhost/api/inventory?id=i-1'));
    expect(deleted.status).toBe(200);
  });
});
