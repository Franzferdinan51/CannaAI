/** @jest-environment node */

const mockFindFirst = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    automationSetting: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

import { GET, POST } from '@/app/api/settings/route';

describe('/api/settings durability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirst.mockResolvedValue({ id: 7, config: { aiProvider: 'lm-studio' }, updatedAt: new Date() });
    mockUpsert.mockResolvedValue({ id: 7 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads persisted settings and uses the stored record id for future writes', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.aiProvider).toBe('lm-studio');
    expect(mockFindFirst).toHaveBeenCalledWith({ orderBy: { updatedAt: 'desc' } });
  });

  test('persists provider switches instead of only mutating process memory', async () => {
    const response = await POST(new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'switch_provider', provider: 'hermes' }),
      headers: { 'content-type': 'application/json' },
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.persistence).toBe('database');
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      update: { config: expect.objectContaining({ aiProvider: 'hermes' }) },
    }));
  });

  test('persists an explicitly selected LM Studio model', async () => {
    const response = await POST(new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_provider',
        provider: 'lm-studio',
        config: { model: 'ornith-1.5-35b-a3b' },
      }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { config: expect.objectContaining({
        lmStudio: expect.objectContaining({ model: 'ornith-1.5-35b-a3b' }),
      }) },
    }));
  });

  test('does not duplicate /v1 when discovering LM Studio models', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'ornith-1.5-35b-a3b' }] }),
    } as Response);

    const response = await POST(new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'get_models', provider: 'lm-studio' }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/models');
  });

  test('uses native LM Studio capability metadata for vision models', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ key: 'ornith-1.5-35b-a3b', type: 'llm', capabilities: { vision: true } }],
        }),
      } as Response);

    const response = await POST(new Request('http://localhost/api/settings', {
      method: 'POST',
      body: JSON.stringify({ action: 'get_models', provider: 'lm-studio' }),
      headers: { 'content-type': 'application/json' },
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.models[0]).toEqual(expect.objectContaining({
      id: 'ornith-1.5-35b-a3b',
      capabilities: expect.arrayContaining(['vision', 'image-analysis']),
    }));
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:1234/api/v1/models');
  });
});
