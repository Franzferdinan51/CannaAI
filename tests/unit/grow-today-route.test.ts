/** @jest-environment node */

/**
 * /api/grow/today — the dashboard's core aggregate endpoint.
 *
 * First route tests for this endpoint (2026-11-27 audit found it had zero
 * test mentions despite being the live health-check target). Pins the
 * honesty contracts the dashboard relies on:
 *  - empty state serves nulls / zero-count stats, never fabricated values;
 *  - room climate comes from each room's latest linked sensor reading,
 *    and a probe-less room keeps honest nulls;
 *  - plant location type is null (the Room model has no type column —
 *    the old payload fabricated 'tent');
 *  - image storageKey (a server-side filesystem locator) never leaks;
 *  - the grower-picked primary photo wins latestPhoto over a newer upload;
 *  - climate exposes device-reported VPD and computed VPD separately,
 *    and a reading whose stored VPD was itself computed reports
 *    vpdDevice: null instead of dressing the computed value up as the
 *    device's own;
 *  - 24h stats/points come only from the primary (newest climate)
 *    sensor, in chronological order, ignoring non-climate readings.
 */

const mockGetLatestRoomClimate = jest.fn();

const mockPrisma = {
  room: { findMany: jest.fn() },
  plant: { findMany: jest.fn() },
  task: { findMany: jest.fn() },
  alert: { findMany: jest.fn() },
  action: { findMany: jest.fn() },
  plantAnalysis: { findMany: jest.fn() },
  sensorReading: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/sensor-metrics', () => ({ getLatestRoomClimate: mockGetLatestRoomClimate }));

import { GET } from '@/app/api/grow/today/route';
import { calculateVPD, toCelsius } from '@/lib/ac-infinity';

function reading(sensorId: string, iso: string, data: Record<string, unknown>, value = 0) {
  return { sensorId, timestamp: new Date(iso), value, data };
}

function baseMocks() {
  mockPrisma.room.findMany.mockResolvedValue([]);
  mockPrisma.plant.findMany.mockResolvedValue([]);
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.alert.findMany.mockResolvedValue([]);
  mockPrisma.action.findMany.mockResolvedValue([]);
  mockPrisma.plantAnalysis.findMany.mockResolvedValue([]);
  mockPrisma.sensorReading.findMany.mockResolvedValue([]);
  mockGetLatestRoomClimate.mockResolvedValue(null);
}

describe('/api/grow/today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    baseMocks();
  });

  it('serves an honest empty state when nothing is stored', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.rooms).toEqual([]);
    expect(body.data.plants).toEqual([]);
    expect(body.data.primaryPlant).toBeNull();
    expect(body.data.climate).toBeNull();
    expect(body.data.latestPhoto).toBeNull();
    expect(body.data.analyses).toEqual([]);
    expect(body.data.last24Hours.temperature).toEqual({ min: null, max: null, average: null, count: 0 });
    expect(body.data.last24Hours.points).toEqual([]);
    // No plants -> no plant analyses query is issued at all.
    expect(mockPrisma.plantAnalysis.findMany).not.toHaveBeenCalled();
    // No primary plant -> targets fall back to the default (vegetative) stage band.
    expect(body.data.targets).toEqual({ temperatureF: [72, 82], humidity: [55, 65], vpd: [0.8, 1.2] });
  });

  it('fills room climate from linked sensors, keeps probe-less rooms null, and never fabricates a room type', async () => {
    mockPrisma.room.findMany.mockResolvedValue([
      { id: 'room-1', name: 'Tent A', temp: null, humidity: null },
      { id: 'room-2', name: 'Dry Room', temp: null, humidity: null },
    ]);
    mockGetLatestRoomClimate.mockImplementation(async (roomId: string) =>
      roomId === 'room-1'
        ? { temperature: 77.2, humidity: 56.5, sensorId: 's-1', sensorName: 'Tent probe', timestamp: '2026-11-27T07:00:00.000Z' }
        : null,
    );
    mockPrisma.plant.findMany.mockResolvedValue([
      {
        id: 'plant-1',
        name: 'Plant One',
        stage: 'seedling',
        isActive: true,
        images: [],
        strain: { id: 'strain-1', name: 'Some Strain', optimalConditions: null },
        room: { id: 'room-1', name: 'Tent A' },
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const [tent, dry] = body.data.rooms;
    expect(tent.temp).toBe(77.2);
    expect(tent.humidity).toBe(56.5);
    expect(dry.temp).toBeNull();
    expect(dry.humidity).toBeNull();
    // Location type is null — Room has no type column; 'tent' was fabricated.
    expect(body.data.plants[0].location).toEqual({ id: 'room-1', name: 'Tent A', type: null, environment: {} });
    // Primary plant is a seedling with no strain conditions -> seedling band.
    expect(body.data.targets).toEqual({ temperatureF: [72, 78], humidity: [65, 75], vpd: [0.4, 0.8] });
  });

  it('strips image storageKey and picks the primary photo over a newer upload for latestPhoto', async () => {
    mockPrisma.plant.findMany.mockResolvedValue([
      {
        id: 'plant-1',
        name: 'Plant One',
        stage: 'vegetative',
        isActive: true,
        images: [
          { id: 'img-new', url: '/api/plants/plant-1/images/img-new/file', capturedAt: '2026-11-26T10:00:00.000Z', isPrimary: false, storageKey: '/secret/path/new.jpg' },
          { id: 'img-primary', url: '/api/plants/plant-1/images/img-primary/file', capturedAt: '2026-11-20T10:00:00.000Z', isPrimary: true, storageKey: '/secret/path/primary.jpg' },
        ],
        strain: null,
        room: null,
      },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    for (const image of body.data.plants[0].images) {
      expect(image).not.toHaveProperty('storageKey');
    }
    expect(body.data.latestPhoto.plantId).toBe('plant-1');
    expect(body.data.latestPhoto.image.id).toBe('img-primary');
    expect(body.data.latestPhoto.image).not.toHaveProperty('storageKey');
    // A plant with no room reports a null location, not an invented one.
    expect(body.data.plants[0].location).toBeNull();
  });

  it('builds climate + 24h stats from the newest climate sensor only, separating device and computed VPD', async () => {
    // Route queries newest-first; the newest climate reading's sensor is primary.
    mockPrisma.sensorReading.findMany.mockResolvedValue([
      // Non-climate reading (no temp/RH in data) must be ignored entirely,
      // even though it is the newest row overall.
      reading('sensor-a', '2026-11-27T07:30:00.000Z', { co2: 900 }, 900),
      reading('sensor-a', '2026-11-27T07:00:00.000Z', { temperature: 77, humidity: 55, vpd: 1.07, deviceName: 'Tent controller', source: 'ac-infinity' }, 77),
      reading('sensor-a', '2026-11-27T06:00:00.000Z', { temperature: 76, humidity: 56, vpd: 1.02 }, 76),
      reading('sensor-b', '2026-11-27T06:00:00.000Z', { temperature: 99, humidity: 99, vpd: 9.9 }, 99),
      reading('sensor-a', '2026-11-27T05:00:00.000Z', { temperature: 75, humidity: 57, vpd: 0.98 }, 75),
    ]);
    mockPrisma.task.findMany.mockResolvedValue([{ id: 'task-1', title: 'Water' }]);
    mockPrisma.alert.findMany.mockResolvedValue([{ id: 'alert-1', type: 'HIGH_VPD' }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const climate = body.data.climate;
    expect(climate.sensorId).toBe('sensor-a');
    expect(climate.sensorName).toBe('Tent controller');
    expect(climate.temperature).toBe(77);
    expect(climate.humidity).toBe(55);
    expect(climate.vpd).toBe(1.07);
    expect(climate.vpdDevice).toBe(1.07);
    expect(climate.vpdCalculated).toBe(calculateVPD(toCelsius(77), 55));
    expect(climate.source).toBe('ac-infinity');

    // Points: primary sensor only, chronological, non-climate rows excluded.
    expect(body.data.last24Hours.points.map((p: { temperature: number }) => p.temperature)).toEqual([75, 76, 77]);
    expect(body.data.last24Hours.temperature).toEqual({ min: 75, max: 77, average: 76, count: 3 });
    expect(body.data.last24Hours.humidity).toEqual({ min: 55, max: 57, average: 56, count: 3 });

    // Tasks / alerts pass through untouched.
    expect(body.data.tasks).toEqual([{ id: 'task-1', title: 'Water' }]);
    expect(body.data.alerts).toEqual([{ id: 'alert-1', type: 'HIGH_VPD' }]);
  });

  it('reports vpdDevice null when the stored VPD was computed at ingest, and names analyses after their plant', async () => {
    mockPrisma.sensorReading.findMany.mockResolvedValue([
      reading('sensor-a', '2026-11-27T07:00:00.000Z', { temperature: 77, humidity: 55, vpd: 1.04, vpdComputed: true }, 77),
    ]);
    mockPrisma.plant.findMany.mockResolvedValue([
      { id: 'plant-1', name: 'Plant One', stage: 'flowering', isActive: true, images: [], strain: null, room: null },
    ]);
    mockPrisma.plantAnalysis.findMany.mockResolvedValue([
      { id: 'an-1', plantId: 'plant-1', score: 88 },
      { id: 'an-2', plantId: 'plant-gone', score: 40 },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.climate.vpd).toBe(1.04);
    expect(body.data.climate.vpdDevice).toBeNull();
    expect(body.data.climate.vpdCalculated).toBe(calculateVPD(toCelsius(77), 55));
    expect(body.data.analyses).toEqual([
      { id: 'an-1', plantId: 'plant-1', score: 88, plantName: 'Plant One' },
      { id: 'an-2', plantId: 'plant-gone', score: 40, plantName: null },
    ]);
  });
});
