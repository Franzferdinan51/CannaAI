/** @jest-environment node */

const mockPrisma = {
  sensor: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '@/app/api/status/route';

describe('/api/status', () => {
  test('reports measured uptime and sensor freshness without fabricated connectivity', async () => {
    const recent = new Date();
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    mockPrisma.sensor.findMany.mockResolvedValueOnce([
      { enabled: true, lastUpdated: recent },
      { enabled: true, lastUpdated: stale },
      { enabled: false, lastUpdated: recent },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.server.uptime).toEqual(expect.any(Number));
    expect(body.sensors).toEqual(expect.objectContaining({ total: 3, online: 1, offline: 2 }));
    expect(body.websocket).toEqual({ status: 'not-measured', connectedClients: null });
    expect(body.database.lastBackup).toBeNull();
    expect(mockPrisma.sensor.findMany).toHaveBeenCalledWith({
      select: { enabled: true, lastUpdated: true },
    });
  });
});
