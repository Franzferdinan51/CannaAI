/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/strains/route';

describe('/api/strains contract', () => {
  test('returns one strain when an id is requested', async () => {
    const response = await GET(new NextRequest('http://localhost/api/strains?id=strain_001'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: 'strain_001', name: 'Blue Dream' }),
    }));
  });

  test('updates a strain using the id in the request body', async () => {
    const response = await PUT(new NextRequest('http://localhost/api/strains', {
      method: 'PUT',
      body: JSON.stringify({ id: 'strain_002', description: 'Updated description' }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      strain: expect.objectContaining({ id: 'strain_002', description: 'Updated description' }),
    }));
  });
});
