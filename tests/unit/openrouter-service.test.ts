import { normalizeOpenRouterImage } from '@/lib/ai/openrouterService';

describe('legacy OpenRouter image normalization', () => {
  test('preserves data URLs from phone and agent captures', () => {
    expect(normalizeOpenRouterImage('data:image/heic;base64,capture')).toBe('data:image/heic;base64,capture');
  });

  test('preserves remote image URLs', () => {
    expect(normalizeOpenRouterImage('https://example.test/plant.jpg')).toBe('https://example.test/plant.jpg');
  });

  test('wraps raw base64 as JPEG for legacy callers', () => {
    expect(normalizeOpenRouterImage('raw-base64')).toBe('data:image/jpeg;base64,raw-base64');
  });
});
