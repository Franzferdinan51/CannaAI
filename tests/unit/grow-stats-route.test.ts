/** @jest-environment node */

const mockPrisma = {
  plant: {
    count: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));

import { GET } from '@/app/api/grow/stats/route';

describe('/api/grow/stats', () => {
  it('does not fabricate yield or efficiency without persisted source data', async () => {
    mockPrisma.plant.count.mockResolvedValue(3);

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
});
