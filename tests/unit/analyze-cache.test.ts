import { getAnalyzeCache } from '@/lib/analyze-cache';

describe('analysis cache identity', () => {
  test('separates results for different local models and endpoints', () => {
    const cache = getAnalyzeCache();
    const shared = {
      imageBase64: 'data:image/jpeg;base64,abc',
      strain: 'test strain',
      leafSymptoms: 'yellowing',
    };

    expect(cache.buildKey({
      ...shared,
      model: 'ornith-1.5-35b-a3b',
      baseUrl: 'http://localhost:1234',
    })).not.toBe(cache.buildKey({
      ...shared,
      model: 'lfm2.5-vl-3b',
      baseUrl: 'http://localhost:1234',
    }));

    expect(cache.buildKey({
      ...shared,
      model: 'ornith-1.5-35b-a3b',
      baseUrl: 'http://localhost:1234',
    })).not.toBe(cache.buildKey({
      ...shared,
      model: 'ornith-1.5-35b-a3b',
      baseUrl: 'http://192.168.1.50:1234',
    }));
  });
});
