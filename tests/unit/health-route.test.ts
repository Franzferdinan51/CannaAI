/** @jest-environment node */

const mockDetect = jest.fn();
const mockDescribe = jest.fn();

jest.mock('@/lib/ai-provider-detection', () => ({
  detectAvailableProviders: (...args: unknown[]) => mockDetect(...args),
}));
jest.mock('@/lib/analyze-cache', () => ({
  getAnalyzeCache: () => ({ describe: mockDescribe }),
}));

import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDescribe.mockReturnValue({ entries: 0, totalBytesApprox: 0, stats: {} });
    mockDetect.mockResolvedValue({
      primary: { provider: 'lmstudio' },
      all: [{ provider: 'lmstudio', isAvailable: true }],
    });
  });

  test('reports provider and cache state without leaving a timeout timer behind', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.providers).toEqual({ primary: 'lmstudio', available: ['lmstudio'], unavailable: [], count: 1 });
    expect(body.analyzeCache.entries).toBe(0);
    expect(mockDetect).toHaveBeenCalledTimes(1);
  });
});
