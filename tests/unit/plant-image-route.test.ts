/** @jest-environment node */

import { POST } from '@/app/api/plants/[id]/images/route';

describe('/api/plants/[id]/images', () => {
  it('does not claim a placeholder image was saved', async () => {
    const response = await POST(new Request('http://localhost/api/plants/plant-1/images'), {
      params: Promise.resolve({ id: 'plant-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      success: false,
      available: false,
      error: 'Plant image storage is not configured; no image was saved.',
      plantId: 'plant-1',
    });
  });
});
