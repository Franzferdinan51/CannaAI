/** @jest-environment node */

const mockPrisma = {
  document: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { NextRequest } from 'next/server';
import { DELETE, GET, POST } from '@/app/api/storage/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('server storage route', () => {
  it('lists document metadata without payloads', async () => {
    mockPrisma.document.findMany.mockResolvedValue([
      { id: 'd-1', key: 'grow-notes', title: 'Notes', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/storage'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(mockPrisma.document.findMany.mock.calls[0][0].select).not.toHaveProperty('data');
  });

  it('returns one document by key and 404s when absent', async () => {
    mockPrisma.document.findUnique.mockResolvedValue({ id: 'd-1', key: 'k', data: { a: 1 } });
    const ok = await GET(new NextRequest('http://localhost/api/storage?key=k'));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.document.data).toEqual({ a: 1 });

    mockPrisma.document.findUnique.mockResolvedValue(null);
    const missing = await GET(new NextRequest('http://localhost/api/storage?key=nope'));
    expect(missing.status).toBe(404);
  });

  it('creates a document on POST and updates it on a second POST', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);
    mockPrisma.document.create.mockImplementation(async ({ data }: any) => ({ id: 'd-1', ...data }));

    const created = await POST(
      jsonRequest('http://localhost/api/storage', 'POST', { key: 'k', title: 'T', data: { a: 1 } }),
    );
    expect(created.status).toBe(201);

    mockPrisma.document.findUnique.mockResolvedValue({ id: 'd-1', key: 'k' });
    mockPrisma.document.update.mockImplementation(async ({ data }: any) => ({ id: 'd-1', key: 'k', ...data }));
    const updated = await POST(
      jsonRequest('http://localhost/api/storage', 'POST', { key: 'k', data: { a: 2 } }),
    );
    expect(updated.status).toBe(200);
    expect(mockPrisma.document.update.mock.calls[0][0].data.data).toEqual({ a: 2 });
  });

  it('requires key and data on POST', async () => {
    const noKey = await POST(jsonRequest('http://localhost/api/storage', 'POST', { data: {} }));
    expect(noKey.status).toBe(400);

    const noData = await POST(jsonRequest('http://localhost/api/storage', 'POST', { key: 'k' }));
    expect(noData.status).toBe(400);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it('deletes by key and refuses a keyless delete', async () => {
    const keyless = await DELETE(new NextRequest('http://localhost/api/storage'));
    expect(keyless.status).toBe(400);
    expect(mockPrisma.document.delete).not.toHaveBeenCalled();

    mockPrisma.document.findUnique.mockResolvedValue({ id: 'd-1', key: 'k' });
    mockPrisma.document.delete.mockResolvedValue({ id: 'd-1', key: 'k' });
    const ok = await DELETE(new NextRequest('http://localhost/api/storage?key=k'));
    expect(ok.status).toBe(200);
  });
});
