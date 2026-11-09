/** @jest-environment node */

const mockPrisma = {
  task: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  room: { findMany: jest.fn(), create: jest.fn() },
  action: { findMany: jest.fn(), create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));

import { NextRequest } from 'next/server';
import { GET as getTasks, POST as postTask } from '@/app/api/tasks/route';
import { POST as postRoom } from '@/app/api/rooms/route';
import { POST as postAction } from '@/app/api/actions/route';

function jsonRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.task.findMany.mockResolvedValue([]);
  mockPrisma.task.count.mockResolvedValue(0);
  mockPrisma.task.create.mockImplementation(async ({ data }: any) => ({ id: 't-1', ...data }));
  mockPrisma.room.create.mockImplementation(async ({ data }: any) => ({ id: 'r-1', ...data }));
  mockPrisma.action.create.mockImplementation(async ({ data }: any) => ({ id: 'a-1', ...data }));
});

describe('tasks pagination clamping', () => {
  it('clamps an oversized limit and floors an invalid page', async () => {
    const response = await getTasks(new Request('http://localhost/api/tasks?page=-3&limit=99999'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(100);
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  it('falls back to defaults for non-numeric pagination', async () => {
    const response = await getTasks(new Request('http://localhost/api/tasks?page=abc&limit=xyz'));
    const body = await response.json();
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 20 });
  });
});

describe('core CRUD validation', () => {
  it('rejects a task with a non-string title as JSON 400, never reaching Prisma', async () => {
    const response = await postTask(jsonRequest('http://localhost/api/tasks', { title: 42 }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  it('rejects a task with an invalid scheduledAt as 400', async () => {
    const response = await postTask(jsonRequest('http://localhost/api/tasks', { title: 'Water', scheduledAt: 'not-a-date' }));
    expect(response.status).toBe(400);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  it('creates a valid task and parses scheduledAt', async () => {
    const response = await postTask(jsonRequest('http://localhost/api/tasks', {
      title: 'Water the plants',
      scheduledAt: '2026-11-10T10:00:00.000Z',
    }));
    expect(response.status).toBe(200);
    const createArg = mockPrisma.task.create.mock.calls[0][0];
    expect(createArg.data.title).toBe('Water the plants');
    expect(createArg.data.scheduledAt).toBeInstanceOf(Date);
  });

  it('rejects a room without a name and a room with out-of-range humidity as 400', async () => {
    const noName = await postRoom(jsonRequest('http://localhost/api/rooms', {}));
    expect(noName.status).toBe(400);
    const badHumidity = await postRoom(jsonRequest('http://localhost/api/rooms', { name: 'Tent', humidity: 140 }));
    expect(badHumidity.status).toBe(400);
    expect(mockPrisma.room.create).not.toHaveBeenCalled();
  });

  it('creates a valid room', async () => {
    const response = await postRoom(jsonRequest('http://localhost/api/rooms', { name: 'Dry Room', humidity: 55 }));
    expect(response.status).toBe(200);
    expect(mockPrisma.room.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Dry Room', active: true }) }),
    );
  });

  it('rejects an action with a non-string type as 400', async () => {
    const response = await postAction(jsonRequest('http://localhost/api/actions', { type: { bad: true } }));
    expect(response.status).toBe(400);
    expect(mockPrisma.action.create).not.toHaveBeenCalled();
  });

  it('returns a JSON 500 (not a throw) when the DB fails', async () => {
    mockPrisma.room.create.mockRejectedValue(new Error('db down'));
    const response = await postRoom(jsonRequest('http://localhost/api/rooms', { name: 'Tent' }));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
