/** @jest-environment node */

import { GET } from '@/app/api/lmstudio/models/route';

describe('/api/lmstudio/models explicit URL probes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not require Prisma or scan the local filesystem when the endpoint is unavailable', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));

    const result = await GET(new Request(
      'http://localhost/api/lmstudio/models?url=http%3A%2F%2F127.0.0.1%3A1234',
    ) as any);

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(expect.objectContaining({
      status: 'unavailable',
      lmStudioRunning: false,
      models: [],
      message: 'LM Studio is not reachable at the configured URL.',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
