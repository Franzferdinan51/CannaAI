/** @jest-environment node */

const mockPrisma = {
  schedule: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import * as waterRoute from '@/app/api/water/schedule/route';
import * as nutrientsRoute from '@/app/api/nutrients/schedule/route';

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

describe('care schedule routes (Schedule-backed)', () => {
  it('creates a watering schedule as a Schedule row with type watering', async () => {
    mockPrisma.schedule.create.mockImplementation(async ({ data }: any) => ({ id: 's-1', ...data }));

    const response = await waterRoute.POST(
      jsonRequest('http://localhost/api/water/schedule', 'POST', {
        name: 'Tent watering',
        cronExpression: '0 8 * * *',
        config: { plantId: 'plant-1', amountMl: 500 },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    const createArg = mockPrisma.schedule.create.mock.calls[0][0];
    expect(createArg.data.type).toBe('watering');
    expect(createArg.data.timezone).toBe('UTC');
    expect(createArg.data.config).toEqual({ plantId: 'plant-1', amountMl: 500 });
    expect(createArg.data.nextRun).toBeInstanceOf(Date);
  });

  it('creates a feeding schedule with type feeding via the nutrients route', async () => {
    mockPrisma.schedule.create.mockImplementation(async ({ data }: any) => ({ id: 's-2', ...data }));

    const response = await nutrientsRoute.POST(
      jsonRequest('http://localhost/api/nutrients/schedule', 'POST', {
        name: 'Weekly feed',
        cronExpression: '0 9 * * 1',
        interval: 'weekly',
        config: { roomId: 'room-1', nutrientMix: { npk: '3-1-2' } },
      }),
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.schedule.create.mock.calls[0][0].data.type).toBe('feeding');
  });

  it('rejects a create without cronExpression', async () => {
    const response = await waterRoute.POST(
      jsonRequest('http://localhost/api/water/schedule', 'POST', { name: 'No cron' }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/cronExpression/);
    expect(mockPrisma.schedule.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown interval', async () => {
    const response = await waterRoute.POST(
      jsonRequest('http://localhost/api/water/schedule', 'POST', {
        name: 'Bad interval',
        cronExpression: '0 8 * * *',
        interval: 'fortnightly',
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.schedule.create).not.toHaveBeenCalled();
  });

  it('lists only rows of the route type and filters plantId from config', async () => {
    mockPrisma.schedule.findMany.mockResolvedValue([
      { id: 's-1', type: 'watering', config: { plantId: 'plant-1' } },
      { id: 's-2', type: 'watering', config: { plantId: 'plant-2' } },
    ]);

    const all = await waterRoute.GET(new NextRequest('http://localhost/api/water/schedule'));
    const allBody = await all.json();
    expect(mockPrisma.schedule.findMany.mock.calls[0][0].where).toEqual({ type: 'watering' });
    expect(allBody.count).toBe(2);

    const filtered = await waterRoute.GET(
      new NextRequest('http://localhost/api/water/schedule?plantId=plant-2'),
    );
    const filteredBody = await filtered.json();
    expect(filteredBody.count).toBe(1);
    expect(filteredBody.schedules[0].id).toBe('s-2');
  });

  it('does not let the water route delete a feeding schedule', async () => {
    mockPrisma.schedule.findFirst.mockResolvedValue(null);

    const response = await waterRoute.DELETE(
      new NextRequest('http://localhost/api/water/schedule?id=s-9'),
    );

    expect(response.status).toBe(404);
    expect(mockPrisma.schedule.findFirst).toHaveBeenCalledWith({
      where: { id: 's-9', type: 'watering' },
    });
    expect(mockPrisma.schedule.delete).not.toHaveBeenCalled();
  });

  it('recomputes nextRun when the schedule timing changes on PUT', async () => {
    mockPrisma.schedule.findFirst.mockResolvedValue({
      id: 's-1',
      type: 'watering',
      cronExpression: '0 8 * * *',
      interval: null,
    });
    mockPrisma.schedule.update.mockImplementation(async ({ data }: any) => ({ id: 's-1', ...data }));

    const response = await waterRoute.PUT(
      jsonRequest('http://localhost/api/water/schedule', 'PUT', {
        id: 's-1',
        cronExpression: '0 6 * * *',
      }),
    );

    expect(response.status).toBe(200);
    const updateArg = mockPrisma.schedule.update.mock.calls[0][0];
    expect(updateArg.data.cronExpression).toBe('0 6 * * *');
    expect(updateArg.data.nextRun).toBeInstanceOf(Date);
    // The route owns the type; a caller-supplied type must not survive.
    expect(updateArg.data.type).toBeUndefined();
  });
});
