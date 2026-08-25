/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/security';

describe('withSecurity request body handling', () => {
  it('leaves the real NextRequest body available to the route handler', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageData: 'test-image' }),
    });

    const response = await withSecurity(request, async (securedRequest) => {
      const body = await securedRequest.json();
      return NextResponse.json({ received: body });
    }, { enableRateLimit: false });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: { imageData: 'test-image' } });
  });
});
