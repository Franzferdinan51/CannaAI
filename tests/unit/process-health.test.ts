/** @jest-environment node */

import { getProcessHealth, recordUnhandledRejection } from '@/lib/process-health';

beforeEach(() => {
  (globalThis as any).__cannaaiProcessHealth = undefined;
});

describe('process-health unhandled rejection counter', () => {
  it('starts at zero with no last error', () => {
    expect(getProcessHealth()).toEqual({ unhandledRejections: 0, lastUnhandledRejection: null });
  });

  it('counts rejections and keeps the most recent error message + timestamp', () => {
    recordUnhandledRejection(new Error('first failure'));
    recordUnhandledRejection(new Error('second failure'));
    const health = getProcessHealth();
    expect(health.unhandledRejections).toBe(2);
    expect(health.lastUnhandledRejection?.message).toBe('second failure');
    expect(typeof health.lastUnhandledRejection?.at).toBe('string');
    expect(Number.isNaN(Date.parse(health.lastUnhandledRejection!.at))).toBe(false);
  });

  it('stringifies non-Error rejection reasons', () => {
    recordUnhandledRejection('plain string rejection');
    expect(getProcessHealth().lastUnhandledRejection?.message).toBe('plain string rejection');
  });
});
