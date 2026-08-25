import { AgentCommandProvider, normalizeAgentImage } from '@/lib/ai-providers/agent-command-provider';

describe('AgentCommandProvider Hermes proxy resilience', () => {
  const originalProvider = process.env.HERMES_PROXY_PROVIDER;
  const originalApiUrl = process.env.HERMES_API_URL;
  const originalApiKey = process.env.HERMES_API_KEY;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalProvider === undefined) delete process.env.HERMES_PROXY_PROVIDER;
    else process.env.HERMES_PROXY_PROVIDER = originalProvider;
    if (originalApiUrl === undefined) delete process.env.HERMES_API_URL;
    else process.env.HERMES_API_URL = originalApiUrl;
    if (originalApiKey === undefined) delete process.env.HERMES_API_KEY;
    else process.env.HERMES_API_KEY = originalApiKey;
  });

  test('preserves image data URLs and remote URLs while normalizing raw base64', () => {
    expect(normalizeAgentImage('data:image/heic;base64,abc')).toBe('data:image/heic;base64,abc');
    expect(normalizeAgentImage('https://phone.example/plant.jpg')).toBe('https://phone.example/plant.jpg');
    expect(normalizeAgentImage('abc')).toBe('data:image/png;base64,abc');
  });

  test('falls back from an unavailable Nous model to authenticated xAI', async () => {
    delete process.env.HERMES_PROXY_PROVIDER;
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const port = url.includes(':8646') ? 8646 : 8645;

      if (url.endsWith('/health')) return { ok: true, status: 200, json: async () => ({ status: 'ok' }) } as Response;
      if (url.endsWith('/v1/models')) {
        return { ok: true, status: 200, json: async () => ({ data: port === 8645
          ? [{ id: 'paid/model', pricing: { prompt: '0.00001', completion: '0.00001' } }]
          : [{ id: 'grok-4.20-0309-non-reasoning' }] }) } as Response;
      }
      if (url.endsWith('/v1/chat/completions')) {
        const body = JSON.parse(String(init?.body));
        if (port === 8645) {
          return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({ message: `Model '${body.model}' requires available credits` }) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({
          model: body.model,
          choices: [{ message: { content: 'HERMES_XAI_FALLBACK_OK' } }]
        }) } as Response;
      }
      return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as Response;
    });

    const provider = new AgentCommandProvider('hermes', { timeout: 1000 });
    jest.spyOn(provider as any, 'ensureHermesProxy').mockResolvedValue(undefined);
    const response = await provider.execute({
      messages: [{ role: 'user', content: 'Analyze this plant.' }],
      model: 'auto'
    });

    expect(response.choices[0].message.content).toBe('HERMES_XAI_FALLBACK_OK');
    expect(response.metadata?.modelUsed).toBe('grok-4.20-0309-non-reasoning');
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(':8645'))).toBe(true);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes(':8646'))).toBe(true);
  });

  test('uses the full Hermes API server for native vision and model discovery', async () => {
    process.env.HERMES_API_URL = 'http://127.0.0.1:8642/v1';
    process.env.HERMES_API_KEY = 'hermes-test-key';
    const fetchMock = jest.spyOn(global, 'fetch');
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/health')) {
        return { ok: true, status: 200, json: async () => ({ status: 'ok' }) } as Response;
      }
      if (url.endsWith('/v1/models')) {
        return { ok: true, status: 200, json: async () => ({ data: [{ id: 'hermes-agent' }] }) } as Response;
      }
      if (url.endsWith('/v1/chat/completions')) {
        const body = JSON.parse(String(init?.body));
        expect(init?.headers).toMatchObject({ authorization: 'Bearer hermes-test-key' });
        expect(body.model).toBe('hermes-agent');
        expect(body.messages.at(-1).content).toEqual([
          { type: 'text', text: 'What is shown?' },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,ZmFrZQ==', detail: 'high' } },
        ]);
        return {
          ok: true,
          status: 200,
          json: async () => ({ model: 'hermes-agent', choices: [{ message: { content: [
            { type: 'text', text: 'Native Hermes ' },
            { type: 'image', image_url: 'ignored-in-text-result' },
            { type: 'text', text: 'vision answer' },
          ] } }] }),
        } as Response;
      }
      return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as Response;
    });

    const provider = new AgentCommandProvider('hermes', { timeout: 1000 });
    expect(await provider.isAvailable()).toBe(true);
    const response = await provider.execute({
      messages: [{ role: 'user', content: 'What is shown?', image: 'data:image/jpeg;base64,ZmFrZQ==' }],
      model: 'auto',
    });

    expect(response.choices[0].message.content).toBe('Native Hermes vision answer');
    expect(response.metadata?.provider).toBe('hermes');
  });
});
