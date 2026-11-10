/** @jest-environment node */

import { summarizePortDuty } from '@/lib/device-duty';

const t = (iso: string) => new Date(iso);

describe('summarizePortDuty', () => {
  it('aggregates duty cycle, current state, and identity per port', () => {
    const readings = [
      // Deliberately out of chronological order.
      { timestamp: t('2026-11-10T12:15:00Z'), ports: [{ port: 4, name: 'Humidifier', mode: 'AI', on: true, speed: 3 }] },
      { timestamp: t('2026-11-10T12:00:00Z'), ports: [{ port: 4, mode: 'AI', on: false, speed: 0 }] },
      { timestamp: t('2026-11-10T12:10:00Z'), ports: [{ port: 4, name: 'Humidifier', mode: 'AI', on: true, speed: 5 }] },
      { timestamp: t('2026-11-10T12:05:00Z'), ports: [{ port: 4, name: 'Humidifier', mode: 'AI', on: true, speed: 4 }] },
    ];

    const summary = summarizePortDuty(readings);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toEqual({
      port: 4,
      name: 'Humidifier',
      mode: 'AI',
      currentOn: true, // from the 12:15 reading, the newest
      currentSpeed: 3,
      samples: 4,
      onSamples: 3,
      dutyPct: 75,
      avgSpeed: 3, // (0 + 4 + 5 + 3) / 4
      firstSeenAt: '2026-11-10T12:00:00.000Z',
      lastSeenAt: '2026-11-10T12:15:00.000Z',
    });
  });

  it('counts a device as on when it drives at a level, even if loadState says off', () => {
    // Live-controller behavior under AI control: loadState polls 0
    // while the device runs (the tent humidifier raised RH for hours
    // reporting on:false). The reported level is the truthful signal.
    const readings = [
      { timestamp: t('2026-11-10T12:00:00Z'), ports: [{ port: 4, name: 'Humidifier', on: false, speed: 5 }] },
      { timestamp: t('2026-11-10T12:05:00Z'), ports: [{ port: 4, name: 'Humidifier', on: false, speed: 0 }] },
      // No speed reported: the on flag decides.
      { timestamp: t('2026-11-10T12:10:00Z'), ports: [{ port: 2, name: 'Fan', on: true }] },
    ];
    const summary = summarizePortDuty(readings);
    const humidifier = summary.find((s) => s.port === 4);
    expect(humidifier?.onSamples).toBe(1);
    expect(humidifier?.dutyPct).toBe(50);
    expect(humidifier?.currentOn).toBe(false); // newest sample: level 0
    const fan = summary.find((s) => s.port === 2);
    expect(fan?.currentOn).toBe(true);
    expect(fan?.dutyPct).toBe(100);
  });

  it('keeps ports separate and sorted by port number', () => {
    const readings = [
      {
        timestamp: t('2026-11-10T12:00:00Z'),
        ports: [
          { port: 3, name: 'Exhaust Fan', on: true, speed: 10 },
          { port: 1, name: 'Grow Light', on: false, speed: 0 },
        ],
      },
    ];
    const summary = summarizePortDuty(readings);
    expect(summary.map((s) => s.port)).toEqual([1, 3]);
    expect(summary[1].name).toBe('Exhaust Fan');
    expect(summary[1].dutyPct).toBe(100);
  });

  it('ignores readings without port arrays and malformed port entries', () => {
    const readings = [
      { timestamp: t('2026-11-10T12:00:00Z'), ports: null },
      { timestamp: t('2026-11-10T12:05:00Z'), ports: 'not-an-array' },
      {
        timestamp: t('2026-11-10T12:10:00Z'),
        ports: [
          { port: 99, name: 'Out of range', on: true },
          { port: 'x', on: true },
          null,
          { port: 2, name: 'Fan', on: true, speed: 10 },
        ],
      },
    ];
    const summary = summarizePortDuty(readings);
    expect(summary).toHaveLength(1);
    expect(summary[0].port).toBe(2);
    expect(summary[0].samples).toBe(1);
  });

  it('reports null identity/state when readings never carried them', () => {
    const summary = summarizePortDuty([
      { timestamp: t('2026-11-10T12:00:00Z'), ports: [{ port: 5 }] },
    ]);
    expect(summary[0]).toEqual(expect.objectContaining({
      port: 5,
      name: null,
      mode: null,
      currentOn: null,
      currentSpeed: null,
      avgSpeed: null,
      dutyPct: 0,
    }));
  });

  it('returns an empty summary for no readings', () => {
    expect(summarizePortDuty([])).toEqual([]);
  });
});
