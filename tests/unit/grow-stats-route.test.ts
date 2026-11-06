/** @jest-environment node */

const mockPrisma = {
  plant: {
    count: jest.fn(),
  },
  harvest: {
    findMany: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));

import { GET } from '@/app/api/grow/stats/route';

describe('/api/grow/stats', () => {
  it('does not fabricate yield or efficiency without persisted source data', async () => {
    mockPrisma.plant.count.mockResolvedValue(3);
    mockPrisma.harvest.findMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(expect.objectContaining({
      activePlants: 3,
      totalHarvests: 0,
      avgYield: null,
      efficiency: null,
      unavailableMetrics: ['avgYield', 'efficiency'],
    }));
  });

  it('reports the real persisted harvest count', async () => {
    mockPrisma.plant.count.mockResolvedValue(4);
    mockPrisma.harvest.findMany.mockResolvedValue([
      { wetWeightGrams: null, dryWeightGrams: null },
      { wetWeightGrams: null, dryWeightGrams: null },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalHarvests).toBe(2);
    // Rows without weights still count, but fabricate no metrics.
    expect(body.data.avgYield).toBeNull();
    expect(body.data.efficiency).toBeNull();
  });

  it('computes yield and dry-matter efficiency from persisted weights', async () => {
    mockPrisma.plant.count.mockResolvedValue(4);
    mockPrisma.harvest.findMany.mockResolvedValue([
      { wetWeightGrams: 100, dryWeightGrams: 25 },
      { wetWeightGrams: 200, dryWeightGrams: 40 },
      { wetWeightGrams: null, dryWeightGrams: 10 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalHarvests).toBe(3);
    // avgYield: mean of dry weights (25, 40, 10) = 25.
    expect(body.data.avgYield).toBe(25);
    // efficiency: mean of dry/wet*100 over rows with both (25%, 20%) = 22.5.
    expect(body.data.efficiency).toBe(22.5);
    expect(body.data.unavailableMetrics).toEqual([]);
  });
});
