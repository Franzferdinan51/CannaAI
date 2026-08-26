/** @jest-environment node */

const mockDetectAvailableProviders = jest.fn();
const mockExecuteChatWithFallback = jest.fn();

jest.mock('@/lib/ai-provider-detection', () => ({
  detectAvailableProviders: (...args: unknown[]) => mockDetectAvailableProviders(...args),
  executeChatWithFallback: (...args: unknown[]) => mockExecuteChatWithFallback(...args),
  getProviderConfig: jest.fn(() => ({ url: '', model: '', apiKey: '', timeout: 300000 })),
  AIProviderUnavailableError: class AIProviderUnavailableError extends Error {
    recommendations = [];
    availableProviders = [];
    setupRequired = true;
  },
}));

jest.mock('@/lib/ai-provider-minimax', () => ({
  executeWithMiniMaxStream: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  withRequest: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { POST } from '@/app/api/chat/route';

describe('/api/chat vision routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectAvailableProviders.mockResolvedValue({
      primary: {
        provider: 'lmstudio',
        isAvailable: true,
        reason: 'LM Studio is running',
      },
      fallback: [],
      recommendations: [],
    });
    mockExecuteChatWithFallback.mockResolvedValue({
      result: 'local vision answer',
      content: 'local vision answer',
      provider: 'lmstudio',
      processingTime: 42,
    });
  });

  test('passes the submitted image into the local-first provider chain', async () => {
    const result = await POST({
      url: 'http://localhost/api/chat',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        message: 'What do you see on this leaf?',
        image: 'data:image/jpeg;base64,abc123',
        mode: 'chat',
        context: {},
        sensorData: {},
        model: 'ornith-1.5-35b-a3b',
        primaryProvider: 'lmstudio',
      }),
    } as any);

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      response: 'local vision answer',
      provider: 'lmstudio',
    }));
    expect(mockExecuteChatWithFallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        primaryProvider: 'lmstudio',
        model: 'ornith-1.5-35b-a3b',
        image: 'data:image/jpeg;base64,abc123',
      }),
    );
  });

  test('does not silently drop an image when streaming is requested', async () => {
    const result = await POST({
      url: 'http://localhost/api/chat?stream=1',
      headers: new Headers({
        'content-type': 'application/json',
        accept: 'text/event-stream',
      }),
      json: async () => ({
        message: 'Inspect this leaf',
        image: 'data:image/jpeg;base64,abc123',
        mode: 'chat',
        context: {},
        sensorData: {},
      }),
    } as any);

    expect(result.headers.get('content-type')).not.toContain('text/event-stream');
    expect(result.status).toBe(200);
    expect(mockExecuteChatWithFallback).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ image: 'data:image/jpeg;base64,abc123' }),
    );
  });

  test('uses the requested LM Studio URL when testing a provider', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);

    const result = await POST({
      url: 'http://localhost/api/chat',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        message: 'Test message',
        testProvider: 'lmstudio',
        baseUrl: 'http://192.168.1.50:1234/v1',
      }),
    } as any);

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.50:1234/v1/models',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    fetchMock.mockRestore();
  });
});
