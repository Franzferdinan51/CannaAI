/** @jest-environment node */

const mockPrisma = {
  alert: { update: jest.fn(), delete: jest.fn() },
  room: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
  task: { update: jest.fn(), delete: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  notification: { update: jest.fn(), delete: jest.fn() },
  plant: {
    findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(),
    deleteMany: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(),
  },
  strain: { findUnique: jest.fn() },
  action: { create: jest.fn(), findMany: jest.fn() },
  sensor: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
  sensorReading: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  customReport: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
    count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/seed-data', () => ({ ensureSeedData: jest.fn().mockResolvedValue(undefined) }));

import { NextRequest } from 'next/server';
import { PUT as putAlert } from '@/app/api/alerts/[id]/route';
import { GET as getRoom, PUT as putRoom } from '@/app/api/rooms/[id]/route';
import { PUT as putTask } from '@/app/api/tasks/[id]/route';
import { POST as completeTask } from '@/app/api/tasks/[id]/complete/route';
import { POST as acknowledgeNotification } from '@/app/api/notifications/[id]/acknowledge/route';
import { PUT as putPlant } from '@/app/api/plants/[id]/route';
import { POST as postPlantTask } from '@/app/api/plants/[id]/tasks/route';
import { POST as postPlantAction } from '@/app/api/plants/[id]/actions/route';
import { POST as postPlantEnvironment } from '@/app/api/plants/[id]/environment/route';
import { POST as archivePlant } from '@/app/api/plants/[id]/archive/route';
import { POST as batchDelete } from '@/app/api/plants/batch-delete/route';
import { POST as batchUpdate } from '@/app/api/plants/batch-update/route';
import { POST as searchPlants } from '@/app/api/plants/search/route';
import { POST as createReport } from '@/app/api/reports/route';
import { PUT as putReportSegment, POST as postReportSegment } from '@/app/api/reports/[...segments]/route';
import { PUT as putSensor } from '@/app/api/sensors/[id]/route';
import { POST as calibrateSensor } from '@/app/api/sensors/[id]/calibrate/route';
import { POST as sensorAnalytics } from '@/app/api/sensors/[id]/analytics/route';

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function idParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function segmentParams(...segments: string[]) {
  return { params: Promise.resolve({ segments }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('alerts/[id] validation', () => {
  it('rejects a non-boolean acknowledged as JSON 400 and writes nothing', async () => {
    const response = await putAlert(
      jsonRequest('http://localhost/api/alerts/a-1', 'PUT', { acknowledged: 'yes' }),
      idParams('a-1'),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.details).toBeDefined();
    expect(mockPrisma.alert.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown-field-only payload shape error (severity as number)', async () => {
    const response = await putAlert(
      jsonRequest('http://localhost/api/alerts/a-1', 'PUT', { severity: 3 }),
      idParams('a-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.alert.update).not.toHaveBeenCalled();
  });

  it('updates a valid alert', async () => {
    mockPrisma.alert.update.mockResolvedValue({ id: 'a-1', acknowledged: true });
    const response = await putAlert(
      jsonRequest('http://localhost/api/alerts/a-1', 'PUT', { acknowledged: true }),
      idParams('a-1'),
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.alert.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { acknowledged: true } }),
    );
  });
});

describe('rooms/[id] validation', () => {
  it('rejects out-of-range humidity as 400 and writes nothing', async () => {
    const response = await putRoom(
      jsonRequest('http://localhost/api/rooms/r-1', 'PUT', { humidity: 140 }),
      idParams('r-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.room.update).not.toHaveBeenCalled();
  });

  it('returns a JSON 500 (not a throw) when the DB fails on GET', async () => {
    mockPrisma.room.findUnique.mockRejectedValue(new Error('db down'));
    const response = await getRoom(new Request('http://localhost/api/rooms/r-1'), idParams('r-1'));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe('tasks/[id] + complete validation', () => {
  it('rejects a non-string title on update as 400', async () => {
    const response = await putTask(
      jsonRequest('http://localhost/api/tasks/t-1', 'PUT', { title: 42 }),
      idParams('t-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid scheduledAt on update as 400', async () => {
    const response = await putTask(
      jsonRequest('http://localhost/api/tasks/t-1', 'PUT', { scheduledAt: 'not-a-date' }),
      idParams('t-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it('converts a valid scheduledAt to a Date on update', async () => {
    mockPrisma.task.update.mockResolvedValue({ id: 't-1' });
    const response = await putTask(
      jsonRequest('http://localhost/api/tasks/t-1', 'PUT', { scheduledAt: '2026-11-12T09:00:00.000Z' }),
      idParams('t-1'),
    );
    expect(response.status).toBe(200);
    const arg = mockPrisma.task.update.mock.calls[0][0];
    expect(arg.data.scheduledAt).toBeInstanceOf(Date);
  });

  it('rejects non-string notes on complete as 400', async () => {
    const response = await completeTask(
      jsonRequest('http://localhost/api/tasks/t-1/complete', 'POST', { notes: 42 }),
      idParams('t-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });
});

describe('notifications acknowledge wrapper', () => {
  it('acknowledges an existing notification', async () => {
    mockPrisma.notification.update.mockResolvedValue({ id: 'n-1', acknowledged: true });
    const response = await acknowledgeNotification(
      new Request('http://localhost/api/notifications/n-1/acknowledge', { method: 'POST' }),
      idParams('n-1'),
    );
    expect(response.status).toBe(200);
  });

  it('returns a JSON 404 when the notification does not exist', async () => {
    mockPrisma.notification.update.mockRejectedValue(new Error('missing'));
    const response = await acknowledgeNotification(
      new Request('http://localhost/api/notifications/nope/acknowledge', { method: 'POST' }),
      idParams('nope'),
    );
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });
});

describe('plants/[id] family validation', () => {
  it('rejects a non-numeric age on plant update as 400 and writes nothing', async () => {
    const response = await putPlant(
      jsonRequest('http://localhost/api/plants/p-1', 'PUT', { age: 'old' }),
      idParams('p-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.plant.update).not.toHaveBeenCalled();
  });

  it('rejects a non-string title on plant task create as 400', async () => {
    const response = await postPlantTask(
      jsonRequest('http://localhost/api/plants/p-1/tasks', 'POST', { title: 42 }),
      idParams('p-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  it('rejects a non-string type on plant action create as 400', async () => {
    const response = await postPlantAction(
      jsonRequest('http://localhost/api/plants/p-1/actions', 'POST', { type: { bad: true } }),
      idParams('p-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.action.create).not.toHaveBeenCalled();
  });

  it('rejects a missing temperature on environment post as 400 and records nothing', async () => {
    const response = await postPlantEnvironment(
      jsonRequest('http://localhost/api/plants/p-1/environment', 'POST', {}),
      idParams('p-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensorReading.create).not.toHaveBeenCalled();
  });

  it('rejects a string temperature on environment post as 400', async () => {
    const response = await postPlantEnvironment(
      jsonRequest('http://localhost/api/plants/p-1/environment', 'POST', { temperature: 'warm' }),
      idParams('p-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensorReading.create).not.toHaveBeenCalled();
  });

  it('returns a JSON 404 when archiving a missing plant', async () => {
    mockPrisma.plant.update.mockRejectedValue(new Error('missing'));
    const response = await archivePlant(
      new Request('http://localhost/api/plants/nope/archive', { method: 'POST' }),
      idParams('nope'),
    );
    expect(response.status).toBe(404);
  });
});

describe('plant batch + search validation', () => {
  it('rejects non-array ids on batch delete as 400', async () => {
    const response = await batchDelete(
      jsonRequest('http://localhost/api/plants/batch-delete', 'POST', { ids: 'abc' }),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.plant.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects a wrongly-typed field inside batch updates as 400', async () => {
    const response = await batchUpdate(
      jsonRequest('http://localhost/api/plants/batch-update', 'POST', { ids: ['p-1'], updates: { stage: 5 } }),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.plant.updateMany).not.toHaveBeenCalled();
  });

  it('strips non-plant fields (id) out of batch updates before writing', async () => {
    mockPrisma.plant.updateMany.mockResolvedValue({ count: 1 });
    const response = await batchUpdate(
      jsonRequest('http://localhost/api/plants/batch-update', 'POST', { ids: ['p-1'], updates: { id: 'hack', stage: 'flower' } }),
    );
    expect(response.status).toBe(200);
    const arg = mockPrisma.plant.updateMany.mock.calls[0][0];
    expect(arg.data).toEqual({ stage: 'flower' });
  });

  it('rejects a non-array strainIds filter on search as 400', async () => {
    const response = await searchPlants(
      jsonRequest('http://localhost/api/plants/search', 'POST', { strainIds: 'x' }),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.plant.findMany).not.toHaveBeenCalled();
  });

  it('accepts an empty search filter', async () => {
    mockPrisma.plant.findMany.mockResolvedValue([]);
    const response = await searchPlants(
      jsonRequest('http://localhost/api/plants/search', 'POST', {}),
    );
    expect(response.status).toBe(200);
  });
});

describe('reports validation', () => {
  it('rejects a report create without a name as 400 and writes nothing', async () => {
    const response = await createReport(
      jsonRequest('http://localhost/api/reports', 'POST', { description: 'no name' }),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.customReport.create).not.toHaveBeenCalled();
  });

  it('creates a valid report with 201', async () => {
    mockPrisma.customReport.create.mockResolvedValue({ id: 'rep-1', name: 'Weekly' });
    const response = await createReport(
      jsonRequest('http://localhost/api/reports', 'POST', { name: 'Weekly' }),
    );
    expect(response.status).toBe(201);
    expect(mockPrisma.customReport.create).toHaveBeenCalled();
  });

  it('rejects a non-string status on report update as 400', async () => {
    mockPrisma.customReport.findUnique.mockResolvedValue({ id: 'rep-1', status: 'draft' });
    const response = await putReportSegment(
      jsonRequest('http://localhost/api/reports/rep-1', 'PUT', { status: 42 }),
      segmentParams('rep-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.customReport.update).not.toHaveBeenCalled();
  });

  it('rejects a template create with an empty name as 400', async () => {
    const response = await postReportSegment(
      jsonRequest('http://localhost/api/reports/templates', 'POST', { name: '   ' }),
      segmentParams('templates'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.customReport.create).not.toHaveBeenCalled();
  });

  it('rejects a non-object schedule body as 400', async () => {
    mockPrisma.customReport.findUnique.mockResolvedValue({ id: 'rep-1', parameters: {} });
    const response = await postReportSegment(
      jsonRequest('http://localhost/api/reports/rep-1/schedule', 'POST', [1, 2, 3]),
      segmentParams('rep-1', 'schedule'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.customReport.update).not.toHaveBeenCalled();
  });

  it('rejects a non-string name on duplicate as 400', async () => {
    mockPrisma.customReport.findUnique.mockResolvedValue({ id: 'rep-1', name: 'Weekly' });
    const response = await postReportSegment(
      jsonRequest('http://localhost/api/reports/rep-1/duplicate', 'POST', { name: 42 }),
      segmentParams('rep-1', 'duplicate'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.customReport.create).not.toHaveBeenCalled();
  });
});

describe('sensors/[id] family validation', () => {
  it('rejects a non-boolean enabled on sensor update as 400', async () => {
    const response = await putSensor(
      jsonRequest('http://localhost/api/sensors/s-1', 'PUT', { enabled: 'yes' }),
      idParams('s-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });

  it('rejects an array calibration on sensor update as 400', async () => {
    const response = await putSensor(
      jsonRequest('http://localhost/api/sensors/s-1', 'PUT', { calibration: [1, 2] }),
      idParams('s-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });

  it('rejects a non-object calibration body on calibrate as 400', async () => {
    const response = await calibrateSensor(
      jsonRequest('http://localhost/api/sensors/s-1/calibrate', 'POST', [1, 2]),
      idParams('s-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensor.update).not.toHaveBeenCalled();
  });

  it('saves a valid calibration object', async () => {
    mockPrisma.sensor.findUnique.mockResolvedValue({ id: 's-1' });
    mockPrisma.sensor.update.mockResolvedValue({ id: 's-1' });
    const response = await calibrateSensor(
      jsonRequest('http://localhost/api/sensors/s-1/calibrate', 'POST', { offset: 1.5 }),
      idParams('s-1'),
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.sensor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ calibration: { offset: 1.5 } }) }),
    );
  });

  it('rejects a non-string timeframe on sensor analytics as 400', async () => {
    const response = await sensorAnalytics(
      jsonRequest('http://localhost/api/sensors/s-1/analytics', 'POST', { timeframe: 24 }),
      idParams('s-1'),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.sensorReading.findMany).not.toHaveBeenCalled();
  });
});
