import { prisma } from '@/lib/prisma';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export type SensorMetric = 'temperature' | 'humidity' | 'vpd' | 'co2' | 'light';

// Payload keys a stored reading may carry for each metric, in priority
// order. The AC Infinity payload stores temperature (°F), humidity (%RH)
// and the device-reported vpd (kPa); it carries no co2 or light keys, so
// those metrics honestly resolve to null until hardware reports them.
const METRIC_KEYS: Record<SensorMetric, string[]> = {
  temperature: ['temperature'],
  humidity: ['humidity'],
  vpd: ['vpd'],
  co2: ['co2', 'co2Ppm'],
  light: ['light', 'ppfd', 'par'],
};

export interface LatestSensorMetric {
  value: number;
  sensorId: string;
  sensorName: string;
  timestamp: string;
}

/**
 * Most recent value of one climate metric across all real sensors,
 * resolved exactly like /api/sensors/data/latest: the newest stored
 * reading's payload is authoritative, and a sensor only contributes a
 * metric its payload actually carries. Returns null when no sensor
 * reports the metric — callers must not invent a value.
 */
export async function getLatestSensorMetric(metric: SensorMetric): Promise<LatestSensorMetric | null> {
  const sensors = await prisma.sensor.findMany({
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });

  let best: LatestSensorMetric | null = null;
  for (const sensor of sensors) {
    const latest = sensor.readings[0];
    if (!latest) continue;
    const details = record(latest.data);
    let value: number | null = null;
    for (const key of METRIC_KEYS[metric]) {
      value = numberOrNull(details[key]);
      if (value !== null) break;
    }
    // SensorReading.value mirrors the primary climate reading (temperature
    // for the AC Infinity ingest), matching the latest route's fallback.
    if (value === null && metric === 'temperature') {
      value = numberOrNull(latest.value);
    }
    if (value === null) continue;
    const candidate: LatestSensorMetric = {
      value,
      sensorId: sensor.id,
      sensorName: sensor.name,
      timestamp: latest.timestamp.toISOString(),
    };
    if (!best || candidate.timestamp > best.timestamp) best = candidate;
  }
  return best;
}
