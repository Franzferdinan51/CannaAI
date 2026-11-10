/** @jest-environment node */

// P2-5: scheduler + queue failures must not be log-only.
// - processQueue() reports a skip (it does not throw, and it does not
//   pretend to have drained) when the queue table is missing (P2021).
// - A scheduler tick whose queue pass was skipped reports
//   queueDrained:false + a queue error, and getSchedulerStatus()
//   reflects that last tick for the health endpoint.
//
// The scheduler is exercised with the REAL notification-queue module on
// top of a mocked prisma, so the P2021 -> skipped -> tick-error chain is
// tested end to end rather than against a stubbed queue result.

const mockPrisma = {
  dailyReport: {
    findUnique: jest.fn(),
  },
  notificationQueueItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockCheckSchedules = jest.fn();
const mockCheckForAnomalies = jest.fn();
const mockGenerateMilestones = jest.fn();
const mockGenerateDailyReport = jest.fn();
const mockSendNotification = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/notifications', () => ({
  sendNotification: mockSendNotification,
}));
jest.mock('@/lib/automation-engine', () => ({
  checkSchedules: mockCheckSchedules,
  checkForAnomalies: mockCheckForAnomalies,
  generateMilestones: mockGenerateMilestones,
}));
jest.mock('@/lib/analytics-utils', () => ({
  generateDailyReport: mockGenerateDailyReport,
}));

import { processQueue } from '@/lib/notification-queue';
import { runSchedulerTick, getSchedulerStatus } from '@/lib/scheduler';

const P2021_ERROR = Object.assign(
  new Error("The table `main.NotificationQueueItem` does not exist in the current database."),
  { code: 'P2021' },
);

describe('scheduler + queue failure surfacing (P2-5)', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockCheckSchedules.mockResolvedValue({ checked: 0, executed: 0 });
    mockCheckForAnomalies.mockResolvedValue({ checked: 0 });
    mockGenerateMilestones.mockResolvedValue({ generated: 0 });
    mockGenerateDailyReport.mockResolvedValue(undefined);
    // Yesterday's report already exists, so the tick stays on the
    // schedules + queue passes only.
    mockPrisma.dailyReport.findUnique.mockResolvedValue({ id: 'report-1' });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('processQueue returns skipped:true (and does not throw) when prisma rejects with P2021', async () => {
    mockPrisma.notificationQueueItem.findMany.mockRejectedValue(P2021_ERROR);

    await expect(processQueue(new Date('2026-11-10T07:00:00.000Z'))).resolves.toEqual({
      processed: 0,
      skipped: true,
      skipReason: expect.stringContaining('P2021'),
    });
    await expect(processQueue(new Date('2026-11-10T07:00:00.000Z'))).resolves.toEqual(
      expect.objectContaining({ skipReason: expect.stringContaining('table missing') }),
    );
    // Not silent any more: the skip is warned about.
    expect(warnSpy).toHaveBeenCalled();
  });

  test('processQueue returns skipped:true with the error message for non-P2021 failures', async () => {
    mockPrisma.notificationQueueItem.findMany.mockRejectedValue(new Error('database is locked'));

    await expect(processQueue(new Date('2026-11-10T07:01:00.000Z'))).resolves.toEqual({
      processed: 0,
      skipped: true,
      skipReason: 'database is locked',
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  test('a tick whose queue pass is skipped reports queueDrained:false, an error entry, and status reflects it', async () => {
    mockPrisma.notificationQueueItem.findMany.mockRejectedValue(P2021_ERROR);
    const tickAt = new Date('2026-11-10T07:05:00.000Z');

    const summary = await runSchedulerTick(tickAt);

    expect(summary.queueDrained).toBe(false);
    expect(summary.errors).toEqual([
      expect.stringMatching(/^queue: .*P2021/),
    ]);

    const status = getSchedulerStatus();
    expect(status.lastTickAt).toBe(tickAt.toISOString());
    expect(status.lastQueueDrained).toBe(false);
    expect(status.lastErrors).toEqual(summary.errors);
    expect(status.running).toBe(false);
  });

  test('a tick with a healthy queue reports queueDrained:true and status reflects the clean tick', async () => {
    mockPrisma.notificationQueueItem.findMany.mockResolvedValue([]);
    const tickAt = new Date('2026-11-10T07:10:00.000Z');

    const summary = await runSchedulerTick(tickAt);

    expect(summary.queueDrained).toBe(true);
    expect(summary.errors).toEqual([]);

    const status = getSchedulerStatus();
    expect(status.lastTickAt).toBe(tickAt.toISOString());
    expect(status.lastQueueDrained).toBe(true);
    expect(status.lastErrors).toEqual([]);
  });
});
