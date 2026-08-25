/** @jest-environment node */

const mockGetProviderStatus = jest.fn();
const mockGetCostSummary = jest.fn();
const mockGetCacheStats = jest.fn();

jest.mock('@/lib/ai-providers/unified-ai', () => ({
  getUnifiedAI: () => ({
    getProviderStatus: mockGetProviderStatus,
    getCostSummary: mockGetCostSummary,
    getCacheStats: mockGetCacheStats,
  }),
}));

import { GET } from '@/app/api/ai/analytics/route';

describe('/api/ai/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProviderStatus.mockReturnValue([]);
    mockGetCostSummary.mockReturnValue({ total: 0, totalTokens: 0, byProvider: {} });
    mockGetCacheStats.mockReturnValue({ hitRate: 0 });
  });

  it('returns finite, honest metrics when no requests have run', async () => {
    const response = await GET({} as Request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.performance.reliability).toEqual({
      overallSuccessRate: '0.0%',
      errorRate: 0,
      byProvider: [],
    });
    expect(body.usagePatterns).toEqual({
      peakHours: [],
      mostUsedProvider: 'N/A',
      averageRequestSize: 'unavailable',
      streamingUsage: 'unavailable',
    });
    expect(JSON.stringify(body)).not.toContain('NaN');
  });
});
