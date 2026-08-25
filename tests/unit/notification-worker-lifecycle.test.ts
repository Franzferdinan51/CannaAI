/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { startWebhookWorker, stopWebhookWorker } from '@/lib/webhooks';
import { startQueueProcessor, stopQueueProcessor } from '@/lib/notification-queue';

describe('notification worker lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    stopWebhookWorker();
    stopQueueProcessor();
  });

  afterEach(() => {
    stopWebhookWorker();
    stopQueueProcessor();
    jest.useRealTimers();
  });

  it('clears webhook and queue timers when workers stop', () => {
    startWebhookWorker();
    startQueueProcessor(1000);
    expect(jest.getTimerCount()).toBe(2);

    stopWebhookWorker();
    stopQueueProcessor();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not create duplicate webhook workers after a restart', () => {
    startWebhookWorker();
    startWebhookWorker();
    expect(jest.getTimerCount()).toBe(1);

    stopWebhookWorker();
    startWebhookWorker();
    expect(jest.getTimerCount()).toBe(1);
  });
});
