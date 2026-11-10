/**
 * provider-status — honest connection status for settings payloads.
 *
 * Settings/automation payloads serve a stored config blob. Only the
 * lmStudio entry is live-probed (see lmstudio-status); every other
 * provider's stored `connected` value is a seed-time boolean that was
 * presented as if it were a live reading — in practice they all sat at
 * `connected: false` forever, probed or not. For a provider nobody
 * probed, the honest status is "unknown": report `connected: null`
 * with `statusSource: 'not-probed'` so consumers stop mistaking a
 * stored default for a measurement. lmStudio is excluded here — its
 * callers overlay the live probe on top. The stored blob itself is
 * never modified.
 */
export function markUnprobedProviders<T extends Record<string, unknown>>(config: T): T {
  const out: Record<string, unknown> = { ...config };
  for (const [key, value] of Object.entries(out)) {
    if (key === 'lmStudio') continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    if (!('connected' in entry)) continue;
    out[key] = { ...entry, connected: null, statusSource: 'not-probed' };
  }
  return out as T;
}
