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

export interface LatestRoomClimate {
  temperature: number | null;
  humidity: number | null;
  sensorId: string;
  sensorName: string;
  timestamp: string;
}

/**
 * Latest climate values for one room, from the newest reading among the
 * sensors linked to it (Sensor.locationId). Temperature and humidity come
 * from the same reading so the pair is coherent; either stays null when
 * that reading's payload doesn't carry it. Returns null when no sensor
 * linked to the room has ever reported temperature or humidity — callers
 * must show nulls, not invented values.
 */
export async function getLatestRoomClimate(roomId: string): Promise<LatestRoomClimate | null> {
  const sensors = await prisma.sensor.findMany({
    where: { locationId: roomId },
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });

  let best: LatestRoomClimate | null = null;
  for (const sensor of sensors) {
    const latest = sensor.readings[0];
    if (!latest) continue;
    const details = record(latest.data);
    let temperature = numberOrNull(details.temperature);
    // Same fallback as getLatestSensorMetric: SensorReading.value mirrors
    // the primary climate value (temperature for AC Infinity ingest).
    if (temperature === null) temperature = numberOrNull(latest.value);
    const humidity = numberOrNull(details.humidity);
    if (temperature === null && humidity === null) continue;
    const candidate: LatestRoomClimate = {
      temperature,
      humidity,
      sensorId: sensor.id,
      sensorName: sensor.name,
      timestamp: latest.timestamp.toISOString(),
    };
    if (!best || candidate.timestamp > best.timestamp) best = candidate;
  }
  return best;
}
