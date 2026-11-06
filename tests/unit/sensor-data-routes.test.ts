/** @jest-environment node */

const mockPrisma = {
  sensor: { findMany: jest.fn() },
  sensorReading: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn(async () => undefined) }));

import { GET as latestGET } from '@/app/api/sensors/data/latest/route';
import { GET as historyGET } from '@/app/api/sensors/data/history/route';

const sensorId = 'ac-infinity-h-eljcp';
const timestamp = new Date('2026-11-06T21:00:00Z');

function reading(value: number, humidity: number, vpd: number, at = timestamp) {
  return {
    id: `reading-${at.toISOString()}`,
    sensorId,
    value,
    data: {
      temperature: value,
      humidity,
      vpd,
      source: 'ac-infinity',
      deviceId: 'H-ELJCP',
      deviceName: '3x3 Tent',
      ports: [{ port: 1, speed: 8, mode: 'OFF', on: false }],
    },
    timestamp: at,
  };
}

describe('sensor data routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('latest returns the full stored climate reading, not only temperature', async () => {
    mockPrisma.sensor.findMany.mockResolvedValue([{
      id: sensorId,
      name: '3x3 Tent',
      type: 'environmental',
      enabled: true,
      locationId: 'room-1',
      lastUpdated: timestamp,
      room: { id: 'room-1', name: '3x3 Tent' },
      readings: [reading(73.5, 48.2, 1.46)],
    }]);

    const response = await latestGET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[sensorId]).toEqual(expect.objectContaining({
      reading: 73.5,
      temperature: 73.5,
      humidity: 48.2,
      vpd: 1.46,
      roomName: '3x3 Tent',
      locationId: 'room-1',
    }));
    expect(body.data[sensorId].ports).toHaveLength(1);
  });

  test('history aggregates real readings instead of fabricating zero rows', async () => {
    mockPrisma.sensorReading.findMany.mockResolvedValue([
      reading(70, 50, 1.1, new Date('2026-11-06T20:05:00Z')),
      reading(74, 46, 1.5, new Date('2026-11-06T20:45:00Z')),
    ]);

    const response = await historyGET(new Request(`http://localhost/api/sensors/data/history?sensors=${sensorId}&timeframe=24h&resolution=1h`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.metadata).toEqual(expect.objectContaining({ totalPoints: 1, resolution: '1h' }));
    expect(body.data[0]).toEqual(expect.objectContaining({
      temperature: 72,
      humidity: 48,
      vpd: 1.3,
      [sensorId]: 72,
      [`${sensorId}_temperature`]: 72,
    }));
  });
});
