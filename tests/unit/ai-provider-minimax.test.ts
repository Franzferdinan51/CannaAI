/**
 * Unit tests for src/lib/ai-provider-minimax.ts
 *
 * Covers:
 *   - checkMiniMax: missing key → unavailable; HTTP 200 → available; HTTP 4xx → error
 *   - executeWithMiniMax: missing key throws; non-vision request body shape;
 *     base64 data:URL prefix is stripped; empty base64 is rejected
 */

import { checkMiniMax, executeWithMiniMax } from '@/lib/ai-provider-minimax';

const ORIGINAL_KEY = process.env.MINIMAX_API_KEY;
const ORIGINAL_URL = process.env.MINIMAX_BASE_URL;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset module cache between tests so env-var captures re-evaluate.
  jest.resetModules();
  process.env.MINIMAX_API_KEY = 'test-key';
  process.env.MINIMAX_BASE_URL = 'https://api.minimax.test/v1';
});

afterAll(() => {
  process.env.MINIMAX_API_KEY = ORIGINAL_KEY;
  process.env.MINIMAX_BASE_URL = ORIGINAL_URL;
});

// checkMiniMax --------------------------------------------------------------

describe('checkMiniMax', () => {
  test('returns unavailable when no API key configured', async () => {
    jest.isolateModules(() => {
      process.env.MINIMAX_API_KEY = '';
    });
    // Re-import inside the isolated module space to get a fresh `key` capture.
    const { checkMiniMax: isolatedCheck } = require('@/lib/ai-provider-minimax');
    const result = await isolatedCheck();
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/not configured/i);
  });

  test('returns available on HTTP 200', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
    });
    const result = await checkMiniMax();
    expect(result.available).toBe(true);
    expect(result.reason).toMatch(/connected/i);
  });

  test('returns unavailable on HTTP 401', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    const result = await checkMiniMax();
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/401/);
  });

  test('returns unavailable on network failure', async () => {
    (global.fetch as jest.Mock) = jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await checkMiniMax();
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/unreachable/i);
  });

  test('passes Authorization header', async () => {
    // The minimax module captures MINIMAX_API_KEY at load time, so we have
    // to isolate the module after setting our test key to a fresh value.
    let capturedAuth: string | undefined;
    let isolatedCheck: typeof import('@/lib/ai-provider-minimax').checkMiniMax;
    jest.isolateModules(() => {
      process.env.MINIMAX_API_KEY = 'fresh-test-key';
      ({ checkMiniMax: isolatedCheck } = require('@/lib/ai-provider-minimax'));
    });
    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
    });
    (global.fetch as any) = fetchSpy;
    await isolatedCheck();
    capturedAuth = (fetchSpy.mock.calls[0][1] as any).headers.Authorization;
    expect(capturedAuth).toBe('Bearer fresh-test-key');
  });
});

// executeWithMiniMax --------------------------------------------------------

describe('executeWithMiniMax', () => {
  test('throws when API key missing', async () => {
    jest.isolateModules(() => {
      process.env.MINIMAX_API_KEY = '';
    });
    const { executeWithMiniMax: isolatedExec } = require('@/lib/ai-provider-minimax');
    await expect(
      isolatedExec([{ role: 'user', content: 'hello' }], {})
    ).rejects.toThrow(/not configured/i);
  });

  test('builds a non-vision request with a single text message', async () => {
    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'mock response' } }],
      }),
    });
    (global.fetch as any) = fetchSpy;

    const result = await executeWithMiniMax(
      [{ role: 'user', content: 'is my plant dying?' }],
      {}
    );
    expect(result.content).toBe('mock response');
    expect(result.provider).toBe('minimax');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/chat\/completions$/);
    const body = JSON.parse((init as any).body);
    expect(body.model).toBeTruthy();
    expect(body.messages[0].content).toBe('is my plant dying?');
  });

  test('strips data: URL prefix from image base64', async () => {
    const fetchSpy = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    (global.fetch as any) = fetchSpy;

    const dirtyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';
    await executeWithMiniMax(
      [{ role: 'user', content: 'describe this plant' }],
      { imageBase64: dirtyBase64 }
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    const lastMsg = body.messages[body.messages.length - 1];
    expect(Array.isArray(lastMsg.content)).toBe(true);
    const imageBlock = lastMsg.content.find((c: any) => c.type === 'image_url');
    expect(imageBlock.image_url.url).toBe(`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD`);
  });

  test('throws on empty base64 after sanitization', async () => {
    await expect(
      executeWithMiniMax(
        [{ role: 'user', content: 'describe' }],
        { imageBase64: 'data:image/png;base64,    ' } // all whitespace after prefix
      )
    ).rejects.toThrow(/empty/i);
  });
});
