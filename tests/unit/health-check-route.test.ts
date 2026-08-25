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
jest.mock('@/lib/provider-auth', () => ({
  providerAuthStatus: jest.fn(),
}));

import { GET } from '@/app/api/health-check/route';

describe('/api/health-check agent coverage', () => {
  const originalEnvironment = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  beforeEach(() => {
    require('@/lib/ai-provider-lmstudio').checkLMStudio.mockResolvedValue({
      available: true,
      models: ['ornith-1.5-35b-a3b'],
    });
    require('@/lib/ai-provider-openclaw').checkOpenClaw.mockResolvedValue({ isAvailable: true });
    require('@/lib/provider-auth').providerAuthStatus.mockResolvedValue({
      connected: true,
      source: 'hermes-api-server',
      summary: 'Hermes API server is connected and authenticated',
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

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.components.hermes).toEqual({ status: 'ok', source: 'hermes-api-server' });
  });
});
