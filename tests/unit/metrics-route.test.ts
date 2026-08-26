/** @jest-environment node */

const mockDescribe = jest.fn();
const mockDetect = jest.fn();

jest.mock('@/lib/analyze-cache', () => ({
  getAnalyzeCache: () => ({ describe: mockDescribe }),
}));
jest.mock('@/lib/ai-provider-detection', () => ({
  detectAvailableProviders: (...args: unknown[]) => mockDetect(...args),
}));

import { GET } from '@/app/api/metrics/route';

describe('/api/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDescribe.mockReturnValue({ entries: 2, totalBytesApprox: 128, stats: { hits: 3, misses: 4, evictions: 1, errors: 0 } });
    mockDetect.mockResolvedValue({
      primary: { provider: 'lmstudio' },
      all: [{ provider: 'lmstudio', isAvailable: true }, { provider: 'hermes', isAvailable: false }],
    });
  });

  test('measures runtime state during each request', async () => {
    const first = await GET();
    const firstBody = await first.text();
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(firstBody).toContain('cannaai_uptime_seconds');
    expect(firstBody).toContain('cannaai_providers_detected{provider="lmstudio",status="available"} 1');
    expect(firstBody).toContain('cannaai_providers_detected{provider="hermes",status="unavailable"} 0');
    expect(mockDetect).toHaveBeenCalledWith({ fastLocal: true });

    mockDetect.mockResolvedValueOnce({ primary: { provider: 'hermes' }, all: [{ provider: 'hermes', isAvailable: true }] });
    const second = await GET();
    const secondBody = await second.text();
    expect(mockDetect).toHaveBeenCalledTimes(2);
    expect(secondBody).toContain('cannaai_providers_detected{provider="hermes",status="available"} 1');
    expect(secondBody).not.toContain('provider="lmstudio"');
    expect(mockDescribe).toHaveBeenCalledTimes(2);
  });
});
