/** @jest-environment node */

import { GET, POST, DELETE } from '@/app/api/storage/route';

describe('server storage route', () => {
  test.each([
    ['GET', GET],
    ['POST', POST],
    ['DELETE', DELETE],
  ])('%s reports that browser-only storage is unavailable', async (_method, handler) => {
    const response = await handler({} as never);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual(expect.objectContaining({
      success: false,
      available: false,
      feature: 'Server document storage',
    }));
  });
});
