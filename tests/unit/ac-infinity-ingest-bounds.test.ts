/** @jest-environment node */

const mockPrisma = {
  room: { findMany: jest.fn() },
  sensor: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  sensorReading: { create: jest.fn() },
  sensorAnalytics: { create: jest.fn() },
};
const mockEvaluate = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/alert-evaluation', () => ({ evaluateEnvironmentAlerts: mockEvaluate }));

import { POST } from '@/app/api/sensors/ac-infinity/route';

function post(body: unknown) {
  const request = new Request('http://localhost/api/sensors/ac-infinity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(request as any);
}

const BASE = {
  deviceId: 'TEST-1',
  deviceName: 'Test Tent',
  temperature: 77,
  temperatureUnit: 'F',
  humidity: 55,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.room.findMany.mockResolvedValue([{ id: 'room-1', name: 'Test Tent' }]);
  mockPrisma.sensor.findUnique.mockResolvedValue(null);
  mockPrisma.sensor.create.mockImplementation(async ({ data }: any) => ({ ...data }));
  mockPrisma.sensor.update.mockResolvedValue({});
  mockPrisma.sensorReading.create.mockResolvedValue({ id: 'reading-1' });
  mockPrisma.sensorAnalytics.create.mockResolvedValue({});
  mockEvaluate.mockResolvedValue({ bandAlerts: [], bandAlertsCreated: 0, thresholdAlertsCreated: 0 });
});

describe('POST /api/sensors/ac-infinity bounds', () => {
  it('rejects a port above the 1-8 hardware range with a JSON 400', async () => {
    const response = await post({ ...BASE, ports: [{ port: 9, speed: 5, on: true }] });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(mockPrisma.sensorReading.create).not.toHaveBeenCalled();
  });

  it('rejects port 0 with a JSON 400', async () => {
    const response = await post({ ...BASE, ports: [{ port: 0, on: false }] });
    expect(response.status).toBe(400);
    expect(mockPrisma.sensorReading.create).not.toHaveBeenCalled();
  });

  it('accepts the boundary port 8', async () => {
    const response = await post({ ...BASE, ports: [{ port: 8, speed: 10, on: true }] });
    expect(response.status).toBe(201);
    expect(mockPrisma.sensorReading.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a timestamp far in the future with a JSON 400', async () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const response = await post({ ...BASE, timestamp: future });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/future/i);
    expect(mockPrisma.sensorReading.create).not.toHaveBeenCalled();
  });

  it('accepts a timestamp within the 10-minute future-skew allowance', async () => {
    const soon = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const response = await post({ ...BASE, timestamp: soon });
    expect(response.status).toBe(201);
    expect(mockPrisma.sensorReading.create).toHaveBeenCalledTimes(1);
  });

  it('accepts a payload with no timestamp at all', async () => {
    const response = await post({ ...BASE });
    expect(response.status).toBe(201);
  });
});
