/** @jest-environment node */

const mockPrisma = {
  strain: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  plant: { count: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST, PUT } from '@/app/api/strains/route';

const blueDream = {
  id: 'strain_001',
  name: 'Blue Dream',
  type: 'Hybrid',
  lineage: 'Blueberry x Haze',
  description: 'Stored strain',
  isPurpleStrain: false,
  optimalConditions: null,
  commonDeficiencies: ['Magnesium'],
  characteristics: null,
  growingDifficulty: 'medium',
  floweringTime: 65,
  thcLevel: 18,
  cbdLevel: 1,
  effects: null,
  medicalUses: null,
  flavors: null,
  aroma: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('/api/strains contract', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns one stored strain when an id is requested', async () => {
    mockPrisma.strain.findUnique.mockResolvedValue(blueDream);
    const response = await GET(new NextRequest('http://localhost/api/strains?id=strain_001'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: 'strain_001', name: 'Blue Dream' }),
    }));
  });

  test('lists only strains stored in the database', async () => {
    mockPrisma.strain.findMany.mockResolvedValue([blueDream]);
    const response = await GET(new NextRequest('http://localhost/api/strains'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.strains).toHaveLength(1);
    expect(body.data.strains[0].name).toBe('Blue Dream');
    expect(body.count).toBe(1);
  });

  test('creates a strain in the database', async () => {
    mockPrisma.strain.create.mockImplementation(async ({ data }: any) => ({ ...blueDream, ...data, id: 'strain_new' }));
    const response = await POST(new NextRequest('http://localhost/api/strains', {
      method: 'POST',
      body: JSON.stringify({ name: 'PK2', type: 'Autoflower', lineage: 'Purple Sunshine Auto x Kazakhstan' }),
      headers: { 'content-type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(mockPrisma.strain.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'PK2', type: 'Autoflower' }),
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: 'strain_new', name: 'PK2' }),
    }));
  });

  test('updates a strain using the id in the request body', async () => {
    mockPrisma.strain.findUnique.mockResolvedValue({ ...blueDream, id: 'strain_002' });
    mockPrisma.strain.update.mockResolvedValue({ ...blueDream, id: 'strain_002', description: 'Updated description' });
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

  test('does not delete a strain that plants still use', async () => {
    mockPrisma.strain.findUnique.mockResolvedValue(blueDream);
    mockPrisma.plant.count.mockResolvedValue(4);
    const response = await DELETE(new NextRequest('http://localhost/api/strains?id=strain_001', { method: 'DELETE' }));

    expect(response.status).toBe(409);
    expect(mockPrisma.strain.delete).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('used by 4 plants'),
    }));
  });
});
