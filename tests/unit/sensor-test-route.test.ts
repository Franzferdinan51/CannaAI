/** @jest-environment node */

import { POST } from '@/app/api/sensors/[id]/test/route';
import { prisma } from '@/lib/prisma';

describe('POST /api/sensors/:id/test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports a sensor with a recent reading as healthy', async () => {
    (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
      id: 'sensor-1',
      enabled: true,
      readings: [{
        value: 72.5,
        timestamp: new Date('2026-08-27T12:00:00.000Z'),
        data: { quality: 'good', accuracy: 0.98 },
      }],
    });

    const response = await POST(new Request('http://localhost/api/sensors/sensor-1/test'), {
      params: Promise.resolve({ id: 'sensor-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        status: 'success',
        accuracy: 0.98,
        lastReading: {
          value: 72.5,
          timestamp: '2026-08-27T12:00:00.000Z',
          quality: 'good',
        },
      },
    });
  });

  test('does not claim a configured sensor is healthy without readings', async () => {
    (prisma.sensor.findUnique as jest.Mock).mockResolvedValue({
      id: 'sensor-1',
      enabled: true,
      readings: [],
    });

    const response = await POST(new Request('http://localhost/api/sensors/sensor-1/test'), {
      params: Promise.resolve({ id: 'sensor-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      data: {
        status: 'error',
        message: 'No readings have been received from this sensor',
      },
    });
  });
});
