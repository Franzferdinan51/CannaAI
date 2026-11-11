/** @jest-environment node */

const mockPrisma = {
  analyticsRecord: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// The route only uses withRequest() for its error path; stub the logger so
// tests don't write log lines / files.
jest.mock('@/lib/logger', () => ({
  withRequest: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/analytics/records/route';

const ROWS = [
  { id: 'rec-1', category: 'ai', eventType: 'analysis', success: true },
  { id: 'rec-2', category: 'sensor', eventType: 'reading', success: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.analyticsRecord.findMany.mockResolvedValue(ROWS);
  mockPrisma.analyticsRecord.count.mockResolvedValue(2);
});

describe('/api/analytics/records', () => {
  it('returns records and total with default pagination', async () => {
    const response = await GET(new NextRequest('http://localhost/api/analytics/records'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toEqual(ROWS);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);

    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({});
    expect(findArg.orderBy).toEqual({ timestamp: 'desc' });
    expect(findArg.take).toBe(50);
    expect(findArg.skip).toBe(0);
    expect(mockPrisma.analyticsRecord.count).toHaveBeenCalledWith({ where: {} });
  });

  it('passes category and eventType filters through to the where clause', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/analytics/records?category=ai&eventType=analysis',
      ),
    );
    expect(response.status).toBe(200);

    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({ category: 'ai', eventType: 'analysis' });
    expect(mockPrisma.analyticsRecord.count).toHaveBeenCalledWith({
      where: { category: 'ai', eventType: 'analysis' },
    });
  });

  it('passes plantId and sensorId filters through to the where clause', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/analytics/records?plantId=plant-1&sensorId=sensor-1',
      ),
    );
    expect(response.status).toBe(200);

    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({ plantId: 'plant-1', sensorId: 'sensor-1' });
  });

  it('parses success=false to boolean false', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/analytics/records?success=false'),
    );
    expect(response.status).toBe(200);

    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({ success: false });
  });

  it('parses success=true to boolean true and ignores other values', async () => {
    await GET(new NextRequest('http://localhost/api/analytics/records?success=true'));
    expect(mockPrisma.analyticsRecord.findMany.mock.calls[0][0].where).toEqual({
      success: true,
    });

    jest.clearAllMocks();
    mockPrisma.analyticsRecord.findMany.mockResolvedValue(ROWS);
    mockPrisma.analyticsRecord.count.mockResolvedValue(2);

    await GET(new NextRequest('http://localhost/api/analytics/records?success=yes'));
    expect(mockPrisma.analyticsRecord.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('clamps limit above 200 down to 200', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/analytics/records?limit=500'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.limit).toBe(200);
    expect(mockPrisma.analyticsRecord.findMany.mock.calls[0][0].take).toBe(200);
  });

  it('clamps limit below 1 and negative offset', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/analytics/records?limit=0&offset=-5'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.take).toBe(1);
    expect(findArg.skip).toBe(0);
  });

  it('applies valid from/to dates as a timestamp range', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/analytics/records?from=2026-11-01T00:00:00.000Z&to=2026-11-02T00:00:00.000Z',
      ),
    );
    expect(response.status).toBe(200);

    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({
      timestamp: {
        gte: new Date('2026-11-01T00:00:00.000Z'),
        lte: new Date('2026-11-02T00:00:00.000Z'),
      },
    });
  });

  it('ignores invalid date params instead of throwing', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost/api/analytics/records?from=not-a-date&to=also-bad',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toEqual(ROWS);
    const findArg = mockPrisma.analyticsRecord.findMany.mock.calls[0][0];
    expect(findArg.where).toEqual({});
    expect(findArg.where.timestamp).toBeUndefined();
  });

  it('returns 500 JSON when prisma fails', async () => {
    mockPrisma.analyticsRecord.findMany.mockRejectedValue(new Error('db down'));

    const response = await GET(new NextRequest('http://localhost/api/analytics/records'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to fetch analytics records' });
  });
});
