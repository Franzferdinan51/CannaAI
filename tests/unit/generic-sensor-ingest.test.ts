/** @jest-environment node */

const mockPrisma = {
  sensor: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  sensorReading: { create: jest.fn() },
  room: { findUnique: jest.fn(), findFirst: jest.fn() },
};
const mockEvaluate = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/alert-evaluation', () => ({ evaluateEnvironmentAlerts: mockEvaluate }));

import { POST } from '@/app/api/sensors/route';

function post(body: unknown) {
  return POST(new Request('http://localhost/api/sensors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

const ROOM = { id: 'room-1', name: 'Flower Tent' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.room.findUnique.mockResolvedValue(ROOM);
  mockPrisma.room.findFirst.mockResolvedValue(null);
  mockPrisma.sensor.findUnique.mockResolvedValue(null);
  mockPrisma.sensor.create.mockImplementation(async ({ data }: any) => ({ id: data.id, locationId: null, ...data }));
  mockPrisma.sensor.update.mockImplementation(async ({ data }: any) => ({ id: 'grow-monitor', ...data }));
  mockPrisma.sensorReading.create.mockResolvedValue({ id: 'reading-1' });
  mockEvaluate.mockResolvedValue({ bandAlerts: [], bandAlertsCreated: 0, thresholdAlertsCreated: 0 });
});

describe('POST /api/sensors (generic ingest)', () => {
  it('links a new sensor to its room via locationId', async () => {
    const response = await post({ temperature: 75, humidity: 50, roomId: 'room-1' });
    expect(response.status).toBe(200);
    const createArg = mockPrisma.sensor.create.mock.calls[0][0];
    expect(createArg.data.locationId).toBe('room-1');
  });

  it('evaluates alerts through the shared evaluator and reports persisted count', async () => {
    mockEvaluate.mockResolvedValue({
      bandAlerts: [{ type: 'HIGH_TEMP', value: 95, message: 'Flower Tent temperature is 95°F — above the 82°F target for flowering plants.' }],
      bandAlertsCreated: 1,
      thresholdAlertsCreated: 0,
    });
    const response = await post({ temperature: 95, humidity: 50, roomId: 'room-1', growthStage: 'flowering' });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mockEvaluate).toHaveBeenCalledWith(expect.objectContaining({
      sensorId: 'room-1',
      roomId: 'room-1',
      roomName: 'Flower Tent',
      growthStage: 'flowering',
      values: expect.objectContaining({ temperatureF: 95, humidity: 50 }),
    }));
    // VPD was not reported, so a computed numeric VPD must be supplied.
    const values = mockEvaluate.mock.calls[0][0].values;
    expect(typeof values.vpdKpa).toBe('number');
    expect(values.vpdKpa).toBeGreaterThan(0);
    expect(body.alerts).toHaveLength(1);
    expect(body.persistedAlerts).toBe(1);
  });

  it('still ingests when alert evaluation fails', async () => {
    mockEvaluate.mockRejectedValue(new Error('alert engine down'));
    const response = await post({ temperature: 75, humidity: 50, roomId: 'room-1' });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.persistedAlerts).toBe(0);
    expect(mockPrisma.sensorReading.create).toHaveBeenCalled();
  });
});
