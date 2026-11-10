/** @jest-environment node */

const mockPrisma = {
  sensor: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getLatestRoomClimate } from '@/lib/sensor-metrics';

function sensorWithReading(id: string, name: string, reading: any) {
  return { id, name, readings: reading ? [reading] : [] };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLatestRoomClimate', () => {
  it('returns temp/humidity from the room sensor latest reading', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([
      sensorWithReading('s1', 'Tent controller', {
        value: 77.2,
        data: { temperature: 77.2, humidity: 46.5, vpd: 1.8 },
        timestamp: new Date('2026-11-10T06:00:00Z'),
      }),
    ]);
    const climate = await getLatestRoomClimate('room-1');
    expect(climate).toMatchObject({ temperature: 77.2, humidity: 46.5, sensorId: 's1' });
    expect(mockPrisma.sensor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { locationId: 'room-1' } }),
    );
  });

  it('picks the newest reading across multiple sensors in the room', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([
      sensorWithReading('s-old', 'Old', {
        value: 70, data: { temperature: 70, humidity: 50 },
        timestamp: new Date('2026-11-10T05:00:00Z'),
      }),
      sensorWithReading('s-new', 'New', {
        value: 72, data: { temperature: 72, humidity: 52 },
        timestamp: new Date('2026-11-10T06:00:00Z'),
      }),
    ]);
    const climate = await getLatestRoomClimate('room-1');
    expect(climate).toMatchObject({ temperature: 72, humidity: 52, sensorId: 's-new' });
  });

  it('falls back to the reading value for temperature when the payload omits it', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([
      sensorWithReading('s1', 'Bare', {
        value: 71.5, data: { humidity: 49 },
        timestamp: new Date('2026-11-10T06:00:00Z'),
      }),
    ]);
    const climate = await getLatestRoomClimate('room-1');
    expect(climate).toMatchObject({ temperature: 71.5, humidity: 49 });
  });

  it('returns null when the room has no sensors', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([]);
    expect(await getLatestRoomClimate('room-empty')).toBeNull();
  });

  it('returns null when sensors exist but no reading carries climate data', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([
      sensorWithReading('s1', 'Port-only', {
        value: null, data: { ports: [{ port: 1, on: true }] },
        timestamp: new Date('2026-11-10T06:00:00Z'),
      }),
      sensorWithReading('s2', 'Never reported', null),
    ]);
    expect(await getLatestRoomClimate('room-1')).toBeNull();
  });
});
