/** @jest-environment node */

const mockPrisma = {
  task: { update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { POST } from '@/app/api/tasks/[id]/complete/route';

describe('POST /api/tasks/:id/complete', () => {
  beforeEach(() => jest.clearAllMocks());

  test('marks a task complete and preserves optional notes', async () => {
    mockPrisma.task.update.mockResolvedValue({ id: 'task-1', status: 'completed' });

    const response = await POST(
      new Request('http://localhost/api/tasks/task-1/complete', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Finished inspection' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'task-1' }) },
    );

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({ status: 'completed', notes: 'Finished inspection', completedAt: expect.any(Date) }),
    });
    await expect(response.json()).resolves.toEqual({ success: true, data: { id: 'task-1', status: 'completed' } });
  });

  test('returns not found when the task does not exist', async () => {
    mockPrisma.task.update.mockRejectedValue(new Error('missing'));

    const response = await POST(
      new Request('http://localhost/api/tasks/missing/complete', { method: 'POST' }),
      { params: Promise.resolve({ id: 'missing' }) },
    );

    expect(response.status).toBe(404);
  });
});
