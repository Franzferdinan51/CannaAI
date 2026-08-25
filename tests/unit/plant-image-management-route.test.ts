/** @jest-environment node */

const mockPrisma = {
  plant: { findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { DELETE, PUT } from '@/app/api/plants/[id]/images/[imageId]/route';

const params = { params: Promise.resolve({ id: 'plant-1', imageId: 'image-1' }) };

describe('plant image management routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('removes the requested persisted image and reports the updated plant', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue({
      id: 'plant-1',
      images: [
        { id: 'image-1', url: 'https://example.test/one.jpg', isPrimary: true },
        { id: 'image-2', url: 'https://example.test/two.jpg', isPrimary: false },
      ],
    });
    mockPrisma.plant.update.mockResolvedValue({ id: 'plant-1', images: [{ id: 'image-2' }] });

    const response = await DELETE(new Request('http://localhost'), params);

    expect(response.status).toBe(200);
    expect(mockPrisma.plant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plant-1' },
      data: expect.objectContaining({ images: [{ id: 'image-2', url: 'https://example.test/two.jpg', isPrimary: false }] }),
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ success: true }));
  });

  test('marks one persisted image primary and clears the flag on the others', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue({
      id: 'plant-1',
      images: [
        { id: 'image-1', url: 'https://example.test/one.jpg', isPrimary: false },
        { id: 'image-2', url: 'https://example.test/two.jpg', isPrimary: true },
      ],
    });
    mockPrisma.plant.update.mockResolvedValue({ id: 'plant-1', images: [] });

    const response = await PUT(new Request('http://localhost'), params);

    expect(response.status).toBe(200);
    expect(mockPrisma.plant.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        images: [
          { id: 'image-1', url: 'https://example.test/one.jpg', isPrimary: true },
          { id: 'image-2', url: 'https://example.test/two.jpg', isPrimary: false },
        ],
      }),
    }));
  });

  test('returns not found instead of claiming success for an unknown image', async () => {
    mockPrisma.plant.findUnique.mockResolvedValue({ id: 'plant-1', images: [] });

    const response = await DELETE(new Request('http://localhost'), params);

    expect(response.status).toBe(404);
    expect(mockPrisma.plant.update).not.toHaveBeenCalled();
  });
});
