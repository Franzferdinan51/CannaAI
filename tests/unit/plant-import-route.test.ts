/** @jest-environment node */

const mockPrisma = {
  plant: { create: jest.fn(), findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn() }));

import { POST } from '@/app/api/plants/import/route';

describe('plant import route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.plant.findMany.mockResolvedValue([]);
  });

  test('reads the uploaded JSON file and creates its plants', async () => {
    const file = new File([JSON.stringify({ plants: [{ name: 'Imported plant', stage: 'veg' }] })], 'plants.json', {
      type: 'application/json',
    });
    mockPrisma.plant.create.mockResolvedValue({ id: 'plant-1', name: 'Imported plant' });

    const form = new FormData();
    form.append('file', file);
    const response = await POST(new Request('http://localhost', { method: 'POST', body: form }) as any);

    expect(mockPrisma.plant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'Imported plant', stage: 'veg' }),
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ success: true, imported: 1 }));
  });

  test('rejects an uploaded file that is not valid plant JSON', async () => {
    const form = new FormData();
    form.append('file', new File(['not json'], 'plants.txt', { type: 'text/plain' }));

    const response = await POST(new Request('http://localhost', { method: 'POST', body: form }) as any);

    expect(response.status).toBe(400);
    expect(mockPrisma.plant.create).not.toHaveBeenCalled();
  });
});
