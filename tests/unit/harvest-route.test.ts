/** @jest-environment node */

const mockPrisma = {
  plant: {
    findUnique: jest.fn(),
  },
  harvest: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/harvest/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const PLANT = { id: 'plant-1', name: 'Test Plant', strainId: 'strain-1', stage: 'flowering' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.plant.findUnique.mockResolvedValue(PLANT);
});

describe('/api/harvest', () => {
  it('creates a harvest for an existing plant and parses weights and dates', async () => {
    mockPrisma.harvest.create.mockImplementation(async ({ data }: any) => ({ id: 'h-1', ...data }));

    const response = await POST(
      jsonRequest('http://localhost/api/harvest', 'POST', {
        plantId: 'plant-1',
        harvestedAt: '2026-11-01T10:00:00.000Z',
        wetWeightGrams: '420.5',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    const createArg = mockPrisma.harvest.create.mock.calls[0][0];
    expect(createArg.data.plantId).toBe('plant-1');
    expect(createArg.data.wetWeightGrams).toBe(420.5);
    expect(createArg.data.harvestedAt).toBeInstanceOf(Date);
  });

  it('rejects a create without plantId', async () => {
    const response = await POST(jsonRequest('http://localhost/api/harvest', 'POST', {}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockPrisma.harvest.create).not.toHaveBeenCalled();
  });

  it('rejects a create for a plant that does not exist', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue(null);

    const response = await POST(
      jsonRequest('http://localhost/api/harvest', 'POST', { plantId: 'nope' }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Plant not found');
    expect(mockPrisma.harvest.create).not.toHaveBeenCalled();
  });

  it('rejects a negative weight as a validation error', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/harvest', 'POST', {
        plantId: 'plant-1',
        wetWeightGrams: -5,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/non-negative number/);
  });

  it('lists harvests filtered by plantId', async () => {
    mockPrisma.harvest.findMany.mockResolvedValue([{ id: 'h-1' }, { id: 'h-2' }]);

    const response = await GET(new NextRequest('http://localhost/api/harvest?plantId=plant-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(2);
    expect(mockPrisma.harvest.findMany.mock.calls[0][0].where).toEqual({ plantId: 'plant-1' });
  });

  it('returns 404 for a missing harvest id', async () => {
    mockPrisma.harvest.findUnique.mockResolvedValue(null);

    const response = await GET(new NextRequest('http://localhost/api/harvest?id=missing'));
    expect(response.status).toBe(404);
  });

  it('updates only the provided fields on PUT', async () => {
    mockPrisma.harvest.findUnique.mockResolvedValue({ id: 'h-1', plantId: 'plant-1' });
    mockPrisma.harvest.update.mockImplementation(async ({ data }: any) => ({ id: 'h-1', ...data }));

    const response = await PUT(
      jsonRequest('http://localhost/api/harvest', 'PUT', {
        id: 'h-1',
        dryWeightGrams: 95,
        cureStartedAt: '2026-11-20T00:00:00.000Z',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    const updateArg = mockPrisma.harvest.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'h-1' });
    expect(updateArg.data).toEqual({
      dryWeightGrams: 95,
      cureStartedAt: new Date('2026-11-20T00:00:00.000Z'),
    });
  });

  it('deletes by query id and 404s when missing', async () => {
    mockPrisma.harvest.findUnique.mockResolvedValue({ id: 'h-1', plantId: 'plant-1' });
    mockPrisma.harvest.delete.mockResolvedValue({ id: 'h-1', plantId: 'plant-1' });

    const ok = await DELETE(new NextRequest('http://localhost/api/harvest?id=h-1'));
    expect(ok.status).toBe(200);
    expect(mockPrisma.harvest.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'h-1' } }),
    );

    const missing = await DELETE(new NextRequest('http://localhost/api/harvest'));
    expect(missing.status).toBe(400);
  });
});
