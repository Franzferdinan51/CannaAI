/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn().mockResolvedValue([]) },
}));
jest.mock('@/lib/ai-provider-lmstudio', () => ({
  checkLMStudio: jest.fn(),
}));
jest.mock('@/lib/ai-provider-openclaw', () => ({
  checkOpenClaw: jest.fn(),
}));
jest.mock('@/lib/ai-provider-hermes', () => ({
  checkHermes: jest.fn(),
}));

import { GET } from '@/app/api/health-check/route';
import { checkLMStudio } from '@/lib/ai-provider-lmstudio';
import { checkOpenClaw } from '@/lib/ai-provider-openclaw';
import { checkHermes } from '@/lib/ai-provider-hermes';

const mockCheckLMStudio = checkLMStudio as jest.Mock;
const mockCheckOpenClaw = checkOpenClaw as jest.Mock;
const mockCheckHermes = checkHermes as jest.Mock;

describe('/api/health-check agent coverage', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  beforeEach(() => {
    mockCheckLMStudio.mockResolvedValue({
      available: true,
      models: ['ornith-1.5-35b-a3b'],
    });
    mockCheckOpenClaw.mockResolvedValue({ isAvailable: true });
    mockCheckHermes.mockResolvedValue({
      isAvailable: false,
      provider: 'hermes',
      reason: 'Hermes API server or authenticated proxy is not reachable',
    });
  });

  test('reports Hermes as unconfigured without degrading the core health result', async () => {
    delete process.env.HERMES_API_KEY;
    delete process.env.HERMES_API_SERVER_KEY;
    delete process.env.HERMES_AGENT_COMMAND;

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.components.hermes).toEqual({ status: 'unconfigured' });
  });

  test('includes authenticated Hermes API-server health when configured', async () => {
    process.env.HERMES_API_KEY = 'test-key';
    mockCheckHermes.mockResolvedValue({
      isAvailable: true,
      provider: 'hermes',
      reason: 'Hermes API server or authenticated proxy is reachable',
      config: { transport: 'api-server' },
    });

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.components.hermes).toEqual({ status: 'ok', source: 'hermes-api-server' });
  });

  test('reports an authenticated Hermes proxy even without API-key environment variables', async () => {
    mockCheckHermes.mockResolvedValue({
      isAvailable: true,
      provider: 'hermes',
      reason: 'Hermes API server or authenticated proxy is reachable',
      config: { transport: 'legacy-proxy' },
    });

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.components.hermes).toEqual({ status: 'ok', source: 'hermes-proxy' });
  });
});
