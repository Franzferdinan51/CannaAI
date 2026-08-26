/** @jest-environment node */

import { GET } from '@/app/api/providers/route';

describe('/api/providers redirect', () => {
  test('preserves the incoming origin for proxied and remote clients', () => {
    const response = GET(new Request('https://phone.example:5174/api/providers') as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://phone.example:5174/api/ai/providers');
  });
});
