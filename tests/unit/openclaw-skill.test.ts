import { tools } from '../../openclaw-skill/index';

describe('OpenClaw CannaAI skill transport', () => {
  const originalUrl = process.env.CANNAAI_API_URL;
  const originalToken = process.env.CANNAAI_API_TOKEN;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.CANNAAI_API_URL;
    else process.env.CANNAAI_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.CANNAAI_API_TOKEN;
    else process.env.CANNAAI_API_TOKEN = originalToken;
  });

  test('uses the configured remote URL, auth token, and preserves data URLs', async () => {
    process.env.CANNAAI_API_URL = 'https://cannaai.example.ts.net/';
    process.env.CANNAAI_API_TOKEN = 'skill-test-token';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ analysis: { healthScore: 80 } }),
    } as Response);

    await tools.analyze_plant.execute({
      image: 'data:image/png;base64,ZmFrZQ==',
      stage: 'flowering',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cannaai.example.ts.net/api/analyze',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer skill-test-token',
        },
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).image).toBe('data:image/png;base64,ZmFrZQ==');
  });

  test('sends a room filter and auth header for remote environment checks', async () => {
    process.env.CANNAAI_API_URL = 'https://cannaai.example.ts.net';
    process.env.CANNAAI_API_TOKEN = 'skill-test-token';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sensors: {}, rooms: [] }),
    } as Response);

    await tools.get_environment.execute({ roomId: 'flower room/1' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://cannaai.example.ts.net/api/sensors?roomId=flower%20room%2F1',
      { headers: { Authorization: 'Bearer skill-test-token' } },
    );
  });
});
