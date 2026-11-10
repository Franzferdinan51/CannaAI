/** @jest-environment node */

jest.mock('@/lib/ai-provider-lmstudio', () => ({
  checkLMStudio: jest.fn(),
}));

import { getLiveLmStudioStatus } from '@/lib/lmstudio-status';
import { checkLMStudio } from '@/lib/ai-provider-lmstudio';

const mockCheck = checkLMStudio as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getLiveLmStudioStatus', () => {
  it('reports connected with the live model count when the probe succeeds', async () => {
    mockCheck.mockResolvedValue({ available: true, models: ['a', 'b', 'c'] });
    const status = await getLiveLmStudioStatus();
    expect(status.connected).toBe(true);
    expect(status.modelsAvailable).toBe(3);
    expect(status.statusSource).toBe('live-probe');
  });

  it('reports disconnected when the probe says unavailable', async () => {
    mockCheck.mockResolvedValue({ available: false, models: [] });
    const status = await getLiveLmStudioStatus();
    expect(status.connected).toBe(false);
    expect(status.modelsAvailable).toBe(0);
  });

  it('fails closed (disconnected, unknown count) when the probe throws', async () => {
    mockCheck.mockRejectedValue(new Error('tunnel down'));
    const status = await getLiveLmStudioStatus();
    expect(status.connected).toBe(false);
    expect(status.modelsAvailable).toBeNull();
  });
});
