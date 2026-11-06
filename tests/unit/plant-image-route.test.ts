/** @jest-environment node */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockPrisma = {
  plant: { findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { POST } from '@/app/api/plants/[id]/images/route';

const params = { params: Promise.resolve({ id: 'plant-1' }) };

describe('/api/plants/[id]/images', () => {
  let imageDir = '';
  const previousImageDir = process.env.CANNAAI_PLANT_IMAGE_DIR;

  beforeEach(() => {
    jest.clearAllMocks();
    imageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cannaai-plant-images-'));
    process.env.CANNAAI_PLANT_IMAGE_DIR = imageDir;
    mockPrisma.plant.findUnique.mockResolvedValue({ id: 'plant-1', images: [] });
    mockPrisma.plant.update.mockImplementation(async ({ data }: any) => ({ id: 'plant-1', images: data.images }));
  });

  afterEach(() => {
    fs.rmSync(imageDir, { recursive: true, force: true });
    if (previousImageDir === undefined) delete process.env.CANNAAI_PLANT_IMAGE_DIR;
    else process.env.CANNAAI_PLANT_IMAGE_DIR = previousImageDir;
  });

  it('rejects a request without an image instead of claiming one was saved', async () => {
    const response = await POST(new Request('http://localhost/api/plants/plant-1/images'), params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('image file is required');
    expect(mockPrisma.plant.update).not.toHaveBeenCalled();
  });

  it('stores an uploaded image on disk and records it on the plant', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([(globalThis as any).mockImageBuffer], { type: 'image/png' }), 'leaf.png');
    formData.append('description', 'Day 0 tent photo');

    const response = await POST(new Request('http://localhost/api/plants/plant-1/images', {
      method: 'POST',
      body: formData,
    }), params);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expect.objectContaining({
      filename: 'leaf.png',
      description: 'Day 0 tent photo',
      isPrimary: true,
      url: expect.stringContaining('/api/plants/plant-1/images/'),
    }));
    expect(body.data.storageKey).toBeUndefined();

    const updateArg = mockPrisma.plant.update.mock.calls[0][0];
    const stored = updateArg.data.images[0];
    expect(stored.storageKey).toContain('plant-1/');
    expect(fs.existsSync(path.join(imageDir, stored.storageKey))).toBe(true);
  });
});
