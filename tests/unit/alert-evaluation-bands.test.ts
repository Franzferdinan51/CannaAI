/** @jest-environment node */

const mockPrisma = {
  plant: { findMany: jest.fn() },
  alert: { findFirst: jest.fn(), create: jest.fn() },
  alertThreshold: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { evaluateEnvironmentAlerts } from '@/lib/alert-evaluation';

function seedlingRoom() {
  mockPrisma.plant.findMany.mockResolvedValue([
    { stage: 'seedling', strain: null },
  ]);
}

describe('evaluateEnvironmentAlerts stage bands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.alert.findFirst.mockResolvedValue(null);
    mockPrisma.alert.create.mockResolvedValue({});
    mockPrisma.alertThreshold.findMany.mockResolvedValue([]);
  });

  it('does not fire HIGH_HUMIDITY for a seedling room at 50.1% RH', async () => {
    // Regression for the 2026-11-06 incident: the old seedling band
    // topped out at 50% RH, so a 50.1% reading — dry air for a
    // seedling — persisted a HIGH_HUMIDITY alert. Seedlings target
    // 65–75% RH, so 50.1% is a LOW humidity breach now.
    seedlingRoom();
    const result = await evaluateEnvironmentAlerts({
      sensorId: 'sensor-1',
      roomId: 'room-1',
      roomName: 'Tent',
      values: { temperatureF: 75, humidity: 50.1, vpdKpa: 0.6 },
    });

    const types = result.bandAlerts.map((a) => a.type);
    expect(types).not.toContain('HIGH_HUMIDITY');
    expect(types).toContain('LOW_HUMIDITY');
    expect(result.bandAlertsCreated).toBe(1);
    expect(mockPrisma.alert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'LOW_HUMIDITY', sensorId: 'sensor-1' }),
    });
  });

  it('stays silent inside the seedling band', async () => {
    seedlingRoom();
    const result = await evaluateEnvironmentAlerts({
      sensorId: 'sensor-1',
      roomId: 'room-1',
      roomName: 'Tent',
      values: { temperatureF: 75, humidity: 70, vpdKpa: 0.6 },
    });
    expect(result.bandAlerts).toEqual([]);
    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
  });

  it('still fires HIGH_HUMIDITY above the seedling band', async () => {
    seedlingRoom();
    const result = await evaluateEnvironmentAlerts({
      sensorId: 'sensor-1',
      roomId: 'room-1',
      roomName: 'Tent',
      values: { temperatureF: 75, humidity: 82, vpdKpa: 0.6 },
    });
    expect(result.bandAlerts.map((a) => a.type)).toContain('HIGH_HUMIDITY');
  });

  it('evaluates a vegetative room against the veg band, not the seedling band', async () => {
    mockPrisma.plant.findMany.mockResolvedValue([
      { stage: 'vegetative', strain: null },
    ]);
    const result = await evaluateEnvironmentAlerts({
      sensorId: 'sensor-1',
      roomId: 'room-1',
      roomName: 'Tent',
      values: { temperatureF: 77, humidity: 50, vpdKpa: 1.0 },
    });
    // 50% RH is inside the seedling band's neighborhood but below the
    // veg floor of 55% — a low-humidity breach for veg plants.
    expect(result.bandAlerts.map((a) => a.type)).toEqual(['LOW_HUMIDITY']);
  });
});
