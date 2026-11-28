/** @jest-environment node */

/**
 * Sensor shortcut routes — /api/sensors/{co2,humidity,light,temperature,vpd}.
 *
 * Each of these five thin GET handlers does the same thing:
 *  - await ensureSeedData();
 *  - const metric = await getLatestSensorMetric('<metric>');
 *  - if metric is null, serve unavailableApiResponse('<Label> sensing')
 *    (503, { success: false, available: false, feature: '<Label> sensing' });
 *  - otherwise serve 200 { success: true, value, unit, sensorId, timestamp }.
 *
 * These tests pin, for every route:
 *  - the success payload (value, per-route unit, sensorId, timestamp) and
 *    that getLatestSensorMetric was called with the route's own metric key;
 *  - the unavailable contract via the REAL '@/lib/unavailable-api' helper
 *    (deliberately not mocked, so the 503 shape is pinned end-to-end).
 *
 * Mock note: implementations are (re-)set in beforeEach, AFTER
 * jest.clearAllMocks(), because clearAllMocks strips mockResolvedValue
 * implementations set in a jest.mock factory.
 */

const mockGetLatestSensorMetric = jest.fn();
const mockEnsureSeedData = jest.fn();

jest.mock('@/lib/seed-data', () => ({
  ensureSeedData: mockEnsureSeedData,
}));

jest.mock('@/lib/sensor-metrics', () => ({
  getLatestSensorMetric: mockGetLatestSensorMetric,
}));

// NOTE: '@/lib/unavailable-api' is intentionally NOT mocked — the real
// unavailableApiResponse helper builds the 503 body these tests assert.

import { GET as getCo2 } from '@/app/api/sensors/co2/route';
import { GET as getHumidity } from '@/app/api/sensors/humidity/route';
import { GET as getLight } from '@/app/api/sensors/light/route';
import { GET as getTemperature } from '@/app/api/sensors/temperature/route';
import { GET as getVpd } from '@/app/api/sensors/vpd/route';

const TIMESTAMP = '2026-11-28T00:00:00.000Z';

type RouteCase = {
  name: string;
  metric: string;
  unit: string;
  feature: string;
  value: number;
  handler: () => Promise<Response>;
};

const ROUTES: RouteCase[] = [
  { name: 'co2', metric: 'co2', unit: 'ppm', feature: 'CO2 sensing', value: 900, handler: getCo2 },
  { name: 'humidity', metric: 'humidity', unit: '%', feature: 'Humidity sensing', value: 58.5, handler: getHumidity },
  { name: 'light', metric: 'light', unit: 'PPFD', feature: 'Light sensing', value: 450, handler: getLight },
  { name: 'temperature', metric: 'temperature', unit: '°F', feature: 'Temperature sensing', value: 74.2, handler: getTemperature },
  { name: 'vpd', metric: 'vpd', unit: 'kPa', feature: 'VPD sensing', value: 1.05, handler: getVpd },
];

describe('sensor shortcut routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set implementations after clearAllMocks (it strips them).
    mockEnsureSeedData.mockResolvedValue(undefined);
    mockGetLatestSensorMetric.mockResolvedValue(null);
  });

  for (const routeCase of ROUTES) {
    const { name, metric, unit, feature, value, handler } = routeCase;

    describe(`/api/sensors/${name}`, () => {
      it('serves the latest metric with its own unit when one is stored', async () => {
        mockGetLatestSensorMetric.mockResolvedValue({
          value,
          sensorId: 'sensor-1',
          sensorName: 'Tent sensor',
          timestamp: TIMESTAMP,
        });

        const response = await handler();
        const body = await response.json();

        expect(mockEnsureSeedData).toHaveBeenCalledTimes(1);
        expect(mockGetLatestSensorMetric).toHaveBeenCalledTimes(1);
        expect(mockGetLatestSensorMetric).toHaveBeenCalledWith(metric);
        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.value).toBe(value);
        expect(body.unit).toBe(unit);
        expect(body.sensorId).toBe('sensor-1');
        expect(body.timestamp).toBe(TIMESTAMP);
      });

      it('serves 503 unavailable when no metric is stored', async () => {
        mockGetLatestSensorMetric.mockResolvedValue(null);

        const response = await handler();
        const body = await response.json();

        expect(mockEnsureSeedData).toHaveBeenCalledTimes(1);
        expect(mockGetLatestSensorMetric).toHaveBeenCalledTimes(1);
        expect(mockGetLatestSensorMetric).toHaveBeenCalledWith(metric);
        expect(response.status).toBe(503);
        expect(body.success).toBe(false);
        expect(body.available).toBe(false);
        expect(body.feature).toBe(feature);
        expect(body.error).toBe(`${feature} is unavailable`);
      });
    });
  }
});
