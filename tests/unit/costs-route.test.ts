/** @jest-environment node */

const mockPrisma = {
  plant: { findUnique: jest.fn() },
  room: { findUnique: jest.fn() },
  costRecord: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/costs/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.plant.findUnique.mockResolvedValue({ id: 'plant-1' });
  mockPrisma.room.findUnique.mockResolvedValue({ id: 'room-1' });
});

describe('/api/costs', () => {
  it('creates a cost record with a parsed amount', async () => {
    mockPrisma.costRecord.create.mockImplementation(async ({ data }: any) => ({ id: 'k-1', ...data }));

    const response = await POST(
      jsonRequest('http://localhost/api/costs', 'POST', { category: 'nutrients', amount: '59.99' }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockPrisma.costRecord.create.mock.calls[0][0].data.amount).toBe(59.99);
  });

  it('requires category and amount', async () => {
    const noCategory = await POST(jsonRequest('http://localhost/api/costs', 'POST', { amount: 10 }));
    expect(noCategory.status).toBe(400);

    const noAmount = await POST(jsonRequest('http://localhost/api/costs', 'POST', { category: 'media' }));
    expect(noAmount.status).toBe(400);
    expect(mockPrisma.costRecord.create).not.toHaveBeenCalled();
  });

  it('404s when a linked plant does not exist', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue(null);

    const response = await POST(
      jsonRequest('http://localhost/api/costs', 'POST', { category: 'media', amount: 20, plantId: 'nope' }),
    );
    expect(response.status).toBe(404);
    expect(mockPrisma.costRecord.create).not.toHaveBeenCalled();
  });

  it('lists records with totals by category', async () => {
    mockPrisma.costRecord.findMany.mockResolvedValue([
      { id: 'k-1', category: 'nutrients', amount: 30 },
      { id: 'k-2', category: 'nutrients', amount: 10.5 },
      { id: 'k-3', category: 'utilities', amount: 80 },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/costs'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(3);
    expect(body.data.totals.amount).toBe(120.5);
    expect(body.data.totals.byCategory).toEqual({ nutrients: 40.5, utilities: 80 });
  });

  it('updates only provided fields on PUT', async () => {
    mockPrisma.costRecord.findUnique.mockResolvedValue({ id: 'k-1', category: 'media', amount: 20 });
    mockPrisma.costRecord.update.mockImplementation(async ({ data }: any) => ({ id: 'k-1', ...data }));

    const response = await PUT(jsonRequest('http://localhost/api/costs', 'PUT', { id: 'k-1', amount: 25 }));
    expect(response.status).toBe(200);
    expect(mockPrisma.costRecord.update.mock.calls[0][0].data).toEqual({ amount: 25 });
  });

  it('deletes by query id and 404s when missing', async () => {
    mockPrisma.costRecord.findUnique.mockResolvedValue(null);
    const missing = await DELETE(new NextRequest('http://localhost/api/costs?id=nope'));
    expect(missing.status).toBe(404);

    mockPrisma.costRecord.findUnique.mockResolvedValue({ id: 'k-1' });
    mockPrisma.costRecord.delete.mockResolvedValue({ id: 'k-1' });
    const ok = await DELETE(new NextRequest('http://localhost/api/costs?id=k-1'));
    expect(ok.status).toBe(200);
  });
});
