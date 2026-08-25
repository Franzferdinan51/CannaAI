/** @jest-environment node */

const mockPrisma = {
  room: { count: jest.fn() },
  sensor: { count: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { ensureSeedData } from '@/lib/seed-data';

describe('demo seed data', () => {
  afterEach(() => {
    delete process.env.CANNAAI_DEMO_SEED_DATA;
    jest.clearAllMocks();
  });

  test('does not create fabricated records unless explicitly enabled', async () => {
    delete process.env.CANNAAI_DEMO_SEED_DATA;

    await expect(ensureSeedData()).resolves.toBeUndefined();
    expect(mockPrisma.room.count).not.toHaveBeenCalled();
    expect(mockPrisma.sensor.count).not.toHaveBeenCalled();
  });
});
