/** @jest-environment node */

const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    metric: { findMany: mockFindMany, count: mockCount },
    sensorAnalytics: { findMany: mockFindMany, count: mockCount },
    plantHealthAnalytics: { findMany: mockFindMany, count: mockCount },
    aPIPerformanceMetrics: { findMany: mockFindMany, count: mockCount },
    sensorReading: { findMany: mockFindMany },
  },
}));

import { GET as exportAnalytics } from '@/app/api/analytics/export/route';
import { GET as getInsights } from '@/app/api/ai-insights/route';

describe('API input validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it('rejects invalid analytics formats and date ranges before querying', async () => {
    const badFormat = await exportAnalytics(new Request('http://localhost/api/analytics/export?format=xml'));
    expect(badFormat.status).toBe(400);

    const badDates = await exportAnalytics(new Request('http://localhost/api/analytics/export?startDate=nope&endDate=also-nope'));
    expect(badDates.status).toBe(400);

    const reversed = await exportAnalytics(new Request('http://localhost/api/analytics/export?startDate=2026-02-02&endDate=2026-02-01'));
    expect(reversed.status).toBe(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('rejects invalid insight lookback windows', async () => {
    const response = await getInsights(new Request('http://localhost/api/ai-insights?hours=0'));
    expect(response.status).toBe(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
