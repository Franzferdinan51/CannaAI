import { POST } from '@/app/api/mcp/route';

describe('/api/mcp auth forwarding', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
    (globalThis as any).Response = class {
      body: string;
      status: number;
      headers: Headers;
      constructor(body: string, init: any = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.headers = new Headers(init.headers);
      }
      async json() { return JSON.parse(this.body); }
    };
  });

  test('forwards the inbound API credentials to upstream tool calls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const response = await POST({
      headers: new Headers({
        Authorization: 'Bearer agent-token',
        'X-CannaAI-API-Token': 'agent-token',
        'Content-Type': 'application/json',
      }),
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_status', arguments: {} },
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer agent-token',
          'X-CannaAI-API-Token': 'agent-token',
        }),
      }),
    );
  });
});
