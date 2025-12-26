/**
 * Test Helpers for API Integration Tests
 */

export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  parseJson?: boolean;
}

export function createMockRequest(
  method: string,
  path: string,
  body?: any,
  options: MockRequestOptions = {}
) {
  const {
    headers = {},
    parseJson = true
  } = options;

  const req = {
    method,
    url: path,
    headers: new Map(Object.entries(headers)),
    json: async () => body,
    body: body,
    ip: '127.0.0.1'
  };

  if (!parseJson) {
    req.json = async () => {
      throw new Error('Invalid JSON');
    };
  }

  return req as any;
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: new Map(),
    body: null as any,
    status: function(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json: function(data: any) {
      this.body = data;
      return this;
    },
    setHeader: function(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },
    getHeader: function(name: string) {
      return this.headers.get(name);
    }
  };

  return res as any;
}

export function createMockNextRequest(
  method: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  return {
    method,
    headers: new Map(Object.entries({
      'Content-Type': 'application/json',
      ...headers
    })),
    json: async () => body,
    body,
    ip: '127.0.0.1'
  } as any;
}

export function createMockNextResponse() {
  const headers = new Map();
  const cookies = new Map();

  return {
    status: function(statusCode: number) {
      return {
        json: (data: any) => this.json(data),
        headers: this.headers
      };
    },
    json: function(data: any) {
      return {
        status: this.status,
        headers: this.headers
      };
    },
    setHeader: function(name: string, value: string) {
      headers.set(name, value);
      return this;
    },
    getHeader: function(name: string) {
      return headers.get(name);
    },
    headers,
    cookies
  } as any;
}

export async function simulateApiCall(
  handler: (req: any, context?: any) => Promise<any>,
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const request = createMockRequest(method, path, body, { headers });
  const response = await handler(request);

  return {
    status: response.status || response.statusCode || 200,
    data: response.body || response
  };
}

export async function simulateNextApiCall(
  handler: (req: any) => Promise<any>,
  method: string,
  body?: any,
  headers: Record<string, string> = {}
) {
  const request = createMockNextRequest(method, body, headers);
  const response = await handler(request);

  return response;
}

export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function createTestUser(userId: string = 'test-user-id') {
  return {
    id: userId,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

export function createTestImage(
  width: number = 100,
  height: number = 100,
  format: 'jpeg' | 'png' | 'heic' = 'jpeg'
): string {
  const formats = {
    jpeg: 'data:image/jpeg;base64,',
    png: 'data:image/png;base64,',
    heic: 'data:image/heic;base64,'
  };

  // In a real implementation, generate proper image
  return formats[format] + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

export function validateResponseStructure(response: any, expectedFields: string[]) {
  for (const field of expectedFields) {
    expect(response).toHaveProperty(field);
  }
}

export function expectSuccessResponse(response: any) {
  expect(response.success).toBe(true);
  expect(response).toHaveProperty('timestamp');
}

export function expectErrorResponse(response: any, expectedStatus?: number) {
  if (expectedStatus) {
    expect(response.status || response.statusCode).toBe(expectedStatus);
  }
  expect(response.success).toBe(false);
  expect(response).toHaveProperty('error');
}

export async function waitForDbOperation(
  operation: () => Promise<any>,
  maxRetries: number = 10,
  delayMs: number = 100
) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      await waitFor(delayMs);
    }
  }
}

export function createMockFetchResponse(data: any, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Map(Object.entries({
      'Content-Type': 'application/json'
    }))
  };
}

export function mockFetchImplementation(responses: Array<{ data: any; status?: number }>) {
  let callCount = 0;

  return (url: string, options: any) => {
    const response = responses[callCount] || { data: {}, status: 200 };
    callCount++;

    return Promise.resolve(createMockFetchResponse(response.data, response.status));
  };
}

export function setupEnvironmentForTest() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.OPENROUTER_API_KEY = 'test-api-key';
  process.env.LM_STUDIO_URL = 'http://localhost:1234';
}

export function teardownEnvironmentAfterTest() {
  delete process.env.DATABASE_URL;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.LM_STUDIO_URL;
}
