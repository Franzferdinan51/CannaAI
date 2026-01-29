/**
 * @jest-environment node
 */
import { GET, POST } from '../../src/app/api/settings/route';
import { NextRequest, NextResponse } from 'next/server';

// Fully mock next/server without requireActual to avoid missing globals issues
jest.mock('next/server', () => {
  return {
    NextRequest: class {
      public url: string;
      public method: string;
      public body: any;
      public headers: Map<string, string>;

      constructor(url: string, init?: any) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.body = init?.body;
        this.headers = new Map(); // simple mock
      }

      async json() {
        if (typeof this.body === 'string') {
          return JSON.parse(this.body);
        }
        return this.body;
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => {
        return {
            json: async () => body,
            status: init?.status || 200,
            settings: body.settings // helper for test
        } as any;
      },
      next: () => ({}) as any
    }
  };
});

describe('Settings Security', () => {

  // Helper to create POST request
  const createPost = (body: any) => new NextRequest('http://localhost/api/settings', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  it('should mask API keys in GET response', async () => {
    // 1. Set a real key
    const realKey = 'sk-test-secret-key-12345';
    await POST(createPost({
      action: 'update_provider',
      provider: 'openai',
      config: { apiKey: realKey }
    }));

    // 2. Get settings
    const response = await GET();
    const data = await response.json();

    // 3. Verify masking
    // This assertion SHOULD FAIL if vulnerability exists
    expect(data.settings.openai.apiKey).toBe('****************');
    expect(data.settings.openai.apiKey).not.toBe(realKey);
  });

  it('should preserve API keys when updating with mask', async () => {
    // 1. Set a real key
    const realKey = 'sk-preservation-test-key';
    await POST(createPost({
      action: 'update_provider',
      provider: 'openai',
      config: { apiKey: realKey }
    }));

    // 2. Update something else, sending back the mask for apiKey
    await POST(createPost({
      action: 'update_provider',
      provider: 'openai',
      config: { apiKey: '****************', model: 'gpt-4-new' }
    }));

    // 3. Verify preservation by checking internal state (simulated)
    // Since we can't access internal state directly, and we assume GET is masked,
    // we use a fetch spy on 'test_connection' which uses the key.

    // Mock global fetch for this test
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
    });

    await POST(createPost({
      action: 'test_connection',
      provider: 'openai'
    }));

    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    // Headers might be a Headers object or plain object depending on implementation.
    // In node environment with next/server mock, we might need to be careful.
    // The route uses `fetch` from the environment.

    // Check if headers exist
    const options = lastCall[1];
    const authHeader = options.headers['Authorization'];

    expect(authHeader).toBe(`Bearer ${realKey}`);
    expect(authHeader).not.toBe('Bearer ****************');
  });
});
