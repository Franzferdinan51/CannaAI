/** @jest-environment node */

const mockPrisma = {
  sensor: { findMany: jest.fn() },
  sensorReading: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn(async () => undefined) }));

import { POST } from '@/app/api/sensors/data/export/route';

const HOUR_MS = 60 * 60 * 1000;

function request() {
  return new Request('http://localhost/api/sensors/data/export', { method: 'POST' });
}

describe('POST /api/sensors/data/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.sensor.findMany.mockResolvedValue([{ id: 'sensor-1' }]);
  });

  it('exports real hourly means from stored readings', async () => {
    const hourStart = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    mockPrisma.sensorReading.findMany.mockResolvedValue([
      // Two readings in the current hour bucket: mean 72.
      { sensorId: 'sensor-1', value: 70, timestamp: new Date(hourStart + 10 * 60000) },
      { sensorId: 'sensor-1', value: 74, timestamp: new Date(hourStart + 20 * 60000) },
      // One reading two buckets earlier.
      { sensorId: 'sensor-1', value: 60, timestamp: new Date(hourStart - 2 * HOUR_MS + 10 * 60000) },
    ]);

    const response = await POST(request());
    expect(response.status).toBe(200);
    const lines = (await response.text()).split('\n');

    expect(lines).toHaveLength(25); // header + 24 hourly buckets
    expect(lines[0]).toBe('timestamp,sensor-1');
    expect(lines[24].endsWith(',72')).toBe(true); // current bucket
    expect(lines[22].endsWith(',60')).toBe(true); // two buckets earlier
  });

  it('leaves buckets with no readings empty instead of fabricating zeros', async () => {
    mockPrisma.sensorReading.findMany.mockResolvedValue([]);

    const response = await POST(request());
    const csv = await response.text();
    const lines = csv.split('\n');

    expect(lines).toHaveLength(25);
    // Every data row is a real bucket timestamp with an empty cell —
    // the pre-wave-9 route filled all 24 rows with 0 values.
    for (const line of lines.slice(1)) {
      expect(line.endsWith(',')).toBe(true);
    }
    expect(csv).not.toContain(',0');
  });
});
