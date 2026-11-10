/** @jest-environment node */

import { stageEnvTargets, resolveEnvTargets } from '@/lib/env-targets';

describe('stageEnvTargets', () => {
  it('gives seedlings the high-humidity, low-VPD consensus band', () => {
    // Grower consensus (verified 2026-11-10): seedlings/clones have
    // minimal roots and drink through their leaves — 65–75% RH,
    // 72–78°F, VPD 0.4–0.8. The pre-wave-9 band (30–50% RH, VPD
    // 0.8–1.2) was the early-veg prescription and made alert
    // evaluation flag healthy seedling air as HIGH_HUMIDITY.
    expect(stageEnvTargets('seedling')).toEqual({
      temperatureF: [72, 78],
      humidity: [65, 75],
      vpd: [0.4, 0.8],
    });
    expect(stageEnvTargets('germination')).toEqual(stageEnvTargets('seedling'));
    expect(stageEnvTargets('clone')).toEqual(stageEnvTargets('seedling'));
  });

  it('matches stage names case-insensitively', () => {
    expect(stageEnvTargets('Seedling')).toEqual(stageEnvTargets('seedling'));
    expect(stageEnvTargets(' FLOWERING ')).toEqual(stageEnvTargets('flowering'));
  });

  it('gives vegetative plants the early-veg band', () => {
    expect(stageEnvTargets('vegetative')).toEqual({
      temperatureF: [72, 82],
      humidity: [55, 65],
      vpd: [0.8, 1.2],
    });
    // Unknown/absent stages fall back to the veg band, never to the
    // seedling or flower bands.
    expect(stageEnvTargets(null)).toEqual(stageEnvTargets('vegetative'));
    expect(stageEnvTargets(undefined)).toEqual(stageEnvTargets('vegetative'));
  });

  it('keeps flower drier than veg', () => {
    const flower = stageEnvTargets('flowering');
    const veg = stageEnvTargets('vegetative');
    expect(flower.humidity[1]).toBeLessThan(veg.humidity[1]);
    expect(flower.vpd).toEqual([1.0, 1.6]);
  });
});

describe('resolveEnvTargets', () => {
  it('uses seedling defaults when the strain carries no conditions', () => {
    expect(resolveEnvTargets({ stage: 'seedling' })).toEqual(stageEnvTargets('seedling'));
    expect(resolveEnvTargets({ stage: 'seedling', optimalConditions: null })).toEqual(
      stageEnvTargets('seedling'),
    );
  });

  it('still lets strain conditions win per metric over the stage defaults', () => {
    const resolved = resolveEnvTargets({
      stage: 'seedling',
      optimalConditions: { humidity: [60, 80] },
    });
    expect(resolved.humidity).toEqual([60, 80]);
    // Metrics the strain does not speak for stay on the stage default.
    expect(resolved.temperatureF).toEqual([72, 78]);
    expect(resolved.vpd).toEqual([0.4, 0.8]);
  });
});
