/**
 * device-duty — per-port UIS device state summaries from stored AC
 * Infinity readings.
 *
 * Every collector post stores the controller's port states on the
 * reading (data.ports: port, name, mode, on, speed). Until wave 9 only
 * the newest reading's raw array was ever surfaced, so there was no way
 * to answer "how hard has the humidifier actually been running?" — the
 * question refill estimation turns on. This module aggregates a window
 * of stored readings into one summary per port: identity (the name the
 * device carries in the AC Infinity app), current state, and the share
 * of samples that found it actively driving (its duty cycle over the
 * window).
 *
 * What "on" means here: under AI/program control these controllers
 * report loadState 0 even while a device is running at a level — the
 * live tent's humidifier raised humidity for hours with loadState 0 in
 * every poll. The reported level/speed is the only truthful activity
 * signal, so a sample counts as on when its speed is above zero; for
 * ports that report no speed, the stored on flag is used as-is.
 *
 * Display only. Nothing here — or anywhere in CannaAI — changes device
 * state; controllers are Duckets' hand alone.
 */

export interface PortDutySummary {
  port: number;
  /** Device name as configured in the AC Infinity app (e.g. "Humidifier"). */
  name: string | null;
  /** Mode label from the most recent reading that reported one. */
  mode: string | null;
  /** Whether the most recent reading found this port actively driving. */
  currentOn: boolean | null;
  /** Level/speed in the most recent reading that reported one. */
  currentSpeed: number | null;
  /** Readings in the window that reported this port. */
  samples: number;
  /** Of those, how many found it actively driving (see header note). */
  onSamples: number;
  /** onSamples / samples as a percentage, one decimal. */
  dutyPct: number;
  /** Mean level/speed across samples that carried one. */
  avgSpeed: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface PortAccumulator {
  port: number;
  name: string | null;
  mode: string | null;
  currentOn: boolean | null;
  currentSpeed: number | null;
  samples: number;
  onSamples: number;
  speedSum: number;
  speedCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

function portNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 8
    ? value
    : null;
}

function cleanName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 60) : null;
}

/**
 * Aggregate stored readings (any order) into per-port summaries, sorted
 * by port. Malformed port entries are ignored rather than guessed at.
 */
export function summarizePortDuty(
  readings: Array<{ timestamp: Date | string; ports: unknown }>,
): PortDutySummary[] {
  const byPort = new Map<number, PortAccumulator>();

  const ordered = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const reading of ordered) {
    if (!Array.isArray(reading.ports)) continue;
    const at = new Date(reading.timestamp).toISOString();
    for (const raw of reading.ports) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const entry = raw as Record<string, unknown>;
      const port = portNumber(entry.port);
      if (port === null) continue;

      let acc = byPort.get(port);
      if (!acc) {
        acc = {
          port,
          name: null,
          mode: null,
          currentOn: null,
          currentSpeed: null,
          samples: 0,
          onSamples: 0,
          speedSum: 0,
          speedCount: 0,
          firstSeenAt: at,
          lastSeenAt: at,
        };
        byPort.set(port, acc);
      }

      acc.samples += 1;
      acc.lastSeenAt = at;
      const hasSpeed = typeof entry.speed === 'number' && Number.isFinite(entry.speed);
      if (hasSpeed) {
        acc.currentSpeed = entry.speed as number;
        acc.speedSum += entry.speed as number;
        acc.speedCount += 1;
      }
      // Activity: a reported level above zero is a device being driven,
      // whatever loadState claims (see the header note). Only when a
      // port reports no level does its on flag decide.
      const active = hasSpeed
        ? (entry.speed as number) > 0
        : typeof entry.on === 'boolean'
          ? entry.on
          : null;
      if (active !== null) {
        acc.currentOn = active;
        if (active) acc.onSamples += 1;
      }
      const name = cleanName(entry.name);
      if (name) acc.name = name;
      if (typeof entry.mode === 'string' && entry.mode) acc.mode = entry.mode;
    }
  }

  return [...byPort.values()]
    .sort((a, b) => a.port - b.port)
    .map((acc) => ({
      port: acc.port,
      name: acc.name,
      mode: acc.mode,
      currentOn: acc.currentOn,
      currentSpeed: acc.currentSpeed,
      samples: acc.samples,
      onSamples: acc.onSamples,
      dutyPct: acc.samples > 0 ? Math.round((acc.onSamples / acc.samples) * 1000) / 10 : 0,
      avgSpeed: acc.speedCount > 0 ? Math.round((acc.speedSum / acc.speedCount) * 10) / 10 : null,
      firstSeenAt: acc.firstSeenAt,
      lastSeenAt: acc.lastSeenAt,
    }));
}
