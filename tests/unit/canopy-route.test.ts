/** @jest-environment node */

const mockPrisma = {
  plant: { findUnique: jest.fn() },
  room: { findUnique: jest.fn() },
  canopyMeasurement: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/canopy/route';

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

describe('/api/canopy', () => {
  it('creates a measurement for a room', async () => {
    mockPrisma.canopyMeasurement.create.mockImplementation(async ({ data }: any) => ({ id: 'm-1', ...data }));

    const response = await POST(
      jsonRequest('http://localhost/api/canopy', 'POST', { roomId: 'room-1', coveragePercent: 62.5 }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockPrisma.canopyMeasurement.create.mock.calls[0][0].data.coveragePercent).toBe(62.5);
  });

  it('requires a plantId or a roomId', async () => {
    const response = await POST(jsonRequest('http://localhost/api/canopy', 'POST', { coveragePercent: 40 }));
    expect(response.status).toBe(400);
    expect(mockPrisma.canopyMeasurement.create).not.toHaveBeenCalled();
  });

  it('rejects coverage outside 0-100', async () => {
    const response = await POST(
      jsonRequest('http://localhost/api/canopy', 'POST', { plantId: 'plant-1', coveragePercent: 140 }),
    );
    expect(response.status).toBe(400);
  });

  it('404s when the linked plant does not exist', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue(null);
    const response = await POST(
      jsonRequest('http://localhost/api/canopy', 'POST', { plantId: 'nope', heightCm: 30 }),
    );
    expect(response.status).toBe(404);
  });

  it('lists measurements filtered by plantId', async () => {
    mockPrisma.canopyMeasurement.findMany.mockResolvedValue([{ id: 'm-1' }]);

    const response = await GET(new NextRequest('http://localhost/api/canopy?plantId=plant-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(mockPrisma.canopyMeasurement.findMany.mock.calls[0][0].where).toEqual({ plantId: 'plant-1' });
  });

  it('updates on PUT and deletes by query id', async () => {
    mockPrisma.canopyMeasurement.findUnique.mockResolvedValue({ id: 'm-1', plantId: 'plant-1' });
    mockPrisma.canopyMeasurement.update.mockImplementation(async ({ data }: any) => ({ id: 'm-1', ...data }));

    const updated = await PUT(jsonRequest('http://localhost/api/canopy', 'PUT', { id: 'm-1', heightCm: 45 }));
    expect(updated.status).toBe(200);
    expect(mockPrisma.canopyMeasurement.update.mock.calls[0][0].data).toEqual({ heightCm: 45 });

    mockPrisma.canopyMeasurement.delete.mockResolvedValue({ id: 'm-1' });
    const deleted = await DELETE(new NextRequest('http://localhost/api/canopy?id=m-1'));
    expect(deleted.status).toBe(200);
  });
});
