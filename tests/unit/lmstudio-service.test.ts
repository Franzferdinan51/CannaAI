/** @jest-environment jsdom */

import { analyzeWithLMStudio } from '@/lib/ai/lmstudioService';

describe('legacy LM Studio vision client', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('preserves an image data URL supplied by a phone capture', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: 'Healthy plant' }) } }],
      }),
    } as Response);

    await analyzeWithLMStudio(
      'Inspect this plant',
      ['data:image/heic;base64,phone-capture'],
      'http://127.0.0.1:1234',
      undefined,
      'ornith-1.5-35b-a3b',
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toEqual(expect.arrayContaining([
      { type: 'image_url', image_url: { url: 'data:image/heic;base64,phone-capture' } },
    ]));
  });

  test('normalizes raw base64 images for vision models', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    } as Response);

    await analyzeWithLMStudio('Inspect this plant', ['raw-base64'], 'http://localhost:1234', undefined, 'vision-model');

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toEqual(expect.arrayContaining([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,raw-base64' } },
    ]));
  });

  test('normalizes an LM Studio endpoint that already includes /v1', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    } as Response);

    await analyzeWithLMStudio('Inspect this plant', [], 'http://localhost:1234/v1/', undefined, 'vision-model');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:1234/v1/chat/completions');
  });
});
