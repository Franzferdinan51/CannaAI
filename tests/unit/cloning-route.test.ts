/** @jest-environment node */

const mockPrisma = {
  plant: {
    findUnique: jest.fn(),
  },
  cloneBatch: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/cloning/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const MOTHER = { id: 'plant-1', name: 'Mother', strainId: 'strain-1', stage: 'vegetative' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.plant.findUnique.mockResolvedValue(MOTHER);
});

describe('/api/cloning', () => {
  it('creates a clone batch for an existing mother plant', async () => {
    mockPrisma.cloneBatch.create.mockImplementation(async ({ data }: any) => ({ id: 'c-1', ...data }));

    const response = await POST(
      jsonRequest('http://localhost/api/cloning', 'POST', {
        motherPlantId: 'plant-1',
        cuttings: '12',
        method: 'rockwool',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    const createArg = mockPrisma.cloneBatch.create.mock.calls[0][0];
    expect(createArg.data.motherPlantId).toBe('plant-1');
    expect(createArg.data.cuttings).toBe(12);
  });

  it('requires cuttings of at least 1', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/cloning', 'POST', { motherPlantId: 'plant-1', cuttings: 0 }),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.cloneBatch.create).not.toHaveBeenCalled();
  });

  it('rejects a create for a mother plant that does not exist', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue(null);

    const response = await POST(
      jsonRequest('http://localhost/api/cloning', 'POST', { motherPlantId: 'nope', cuttings: 4 }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Mother plant not found');
  });

  it('rejects rootedCount above cuttings', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/cloning', 'POST', {
        motherPlantId: 'plant-1',
        cuttings: 4,
        rootedCount: 9,
      }),
    );
    expect(response.status).toBe(400);
  });

  it('lists batches filtered by motherPlantId', async () => {
    mockPrisma.cloneBatch.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);

    const response = await GET(new NextRequest('http://localhost/api/cloning?motherPlantId=plant-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(2);
    expect(mockPrisma.cloneBatch.findMany.mock.calls[0][0].where).toEqual({ motherPlantId: 'plant-1' });
  });

  it('updates rootedCount on PUT and guards it against stored cuttings', async () => {
    mockPrisma.cloneBatch.findUnique.mockResolvedValue({ id: 'c-1', motherPlantId: 'plant-1', cuttings: 10, rootedCount: 0 });
    mockPrisma.cloneBatch.update.mockImplementation(async ({ data }: any) => ({ id: 'c-1', ...data }));

    const ok = await PUT(jsonRequest('http://localhost/api/cloning', 'PUT', { id: 'c-1', rootedCount: 8 }));
    expect(ok.status).toBe(200);
    expect(mockPrisma.cloneBatch.update.mock.calls[0][0].data).toEqual({ rootedCount: 8 });

    const tooMany = await PUT(jsonRequest('http://localhost/api/cloning', 'PUT', { id: 'c-1', rootedCount: 11 }));
    expect(tooMany.status).toBe(400);
  });

  it('deletes by query id and 400s without one', async () => {
    mockPrisma.cloneBatch.findUnique.mockResolvedValue({ id: 'c-1' });
    mockPrisma.cloneBatch.delete.mockResolvedValue({ id: 'c-1' });

    const ok = await DELETE(new NextRequest('http://localhost/api/cloning?id=c-1'));
    expect(ok.status).toBe(200);

    const missing = await DELETE(new NextRequest('http://localhost/api/cloning'));
    expect(missing.status).toBe(400);
  });
});
