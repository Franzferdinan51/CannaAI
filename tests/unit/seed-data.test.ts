/** @jest-environment node */

const mockPrisma = {
  room: { count: jest.fn(), createMany: jest.fn() },
  sensor: { count: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
  sensorReading: { count: jest.fn(), create: jest.fn() },
  strain: { count: jest.fn(), create: jest.fn() },
  plant: { count: jest.fn(), create: jest.fn() },
  automationSetting: { findFirst: jest.fn(), create: jest.fn() },
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

  test('shares one initialization promise for concurrent callers', async () => {
    process.env.CANNAAI_DEMO_SEED_DATA = 'true';
    mockPrisma.room.count.mockResolvedValue(1);
    mockPrisma.sensor.count.mockResolvedValue(1);
    mockPrisma.sensorReading.count.mockResolvedValue(1);
    mockPrisma.strain.count.mockResolvedValue(1);
    mockPrisma.plant.count.mockResolvedValue(1);
    mockPrisma.automationSetting.findFirst.mockResolvedValue({ id: 1 });

    await Promise.all([ensureSeedData(), ensureSeedData(), ensureSeedData()]);

    expect(mockPrisma.room.count).toHaveBeenCalledTimes(1);
  });
});
