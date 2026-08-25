/** @jest-environment node */

const mockPrisma = {
  plant: { deleteMany: jest.fn(), updateMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { POST as batchDelete } from '@/app/api/plants/batch-delete/route';
import { POST as batchUpdate } from '@/app/api/plants/batch-update/route';

describe('plant batch routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('reports the database delete count', async () => {
    mockPrisma.plant.deleteMany.mockResolvedValue({ count: 2 });
    const response = await batchDelete(new Request('http://localhost', {
      method: 'POST', body: JSON.stringify({ ids: ['one', 'two', 'missing'] }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    await expect(response.json()).resolves.toEqual({ success: true, deleted: 2 });
  });

  test('reports the database update count', async () => {
    mockPrisma.plant.updateMany.mockResolvedValue({ count: 1 });
    const response = await batchUpdate(new Request('http://localhost', {
      method: 'POST', body: JSON.stringify({ ids: ['one', 'two'], updates: { stage: 'flower' } }),
      headers: { 'content-type': 'application/json' },
    }) as any);

    await expect(response.json()).resolves.toEqual({ success: true, updated: 1 });
  });
});
