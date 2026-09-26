/**
 * AC Infinity integration helpers.
 *
 * Duckets' sensor path is the AC Infinity app on his Pixel (read over
 * wireless ADB), not the vendor cloud API. This module normalizes AC
 * Infinity controller/app readings into the shape CannaAI's sensor store
 * expects, and computes VPD when the source only reports temp + RH.
 *
 * Senders (a Juno cron polling the Pixel, the ac-infinity-mcp bridge, or
 * any script) POST to /api/sensors/ac-infinity — they never need to know
 * the Prisma schema.
 */

export interface AcInfinityReadingInput {
  /** Controller serial / device id from the AC Infinity app. */
  deviceId?: string;
  /** Human name, e.g. "Tent 69 Pro". */
  deviceName?: string;
  /** Air temperature. */
  temperature: number;
  /** Unit of `temperature`. Defaults to 'F' (the app's US default). */
  temperatureUnit?: 'F' | 'C';
  /** Relative humidity, 0-100. */
  humidity: number;
  /** Vapor pressure deficit in kPa. Computed from temp/RH when omitted. */
  vpd?: number;
  /** Optional port states, e.g. [{ port: 1, speed: 6, mode: 'AUTO' }]. */
  ports?: Array<{ port: number; speed?: number; mode?: string; on?: boolean }>;
  /** ISO timestamp of the reading. Defaults to now. */
  timestamp?: string;
}

export interface NormalizedClimateReading {
  temperatureF: number;
  humidity: number;
  vpdKpa: number;
  vpdComputed: boolean;
}

/** Saturation vapor pressure (kPa) via the Tetens equation. */
export function saturationVaporPressureKpa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Vapor pressure deficit in kPa from air temp and relative humidity.
 * The single most useful derived metric for a grow tent.
 */
export function calculateVPD(temperatureC: number, humidityRh: number): number {
  const rh = Math.min(100, Math.max(0, humidityRh));
  const svp = saturationVaporPressureKpa(temperatureC);
  const vpd = svp * (1 - rh / 100);
  return Math.round(vpd * 100) / 100;
}

export function toFahrenheit(tempC: number): number {
  return Math.round(((tempC * 9) / 5 + 32) * 10) / 10;
}

export function toCelsius(tempF: number): number {
  return Math.round((((tempF - 32) * 5) / 9) * 10) / 10;
}

/**
 * VPD comfort bands for cannabis (kPa). Used for alert text only —
 * the grower's own targets always win.
 */
export function vpdBand(vpdKpa: number, growthStage?: string): 'low' | 'optimal' | 'high' {
  const stage = (growthStage || '').toLowerCase();
  // Seedlings/clones like it humid (low VPD); flower likes it drier.
  const low = stage.includes('seedling') || stage.includes('clone') ? 0.4 : 0.8;
  const high = stage.includes('flower') ? 1.4 : 1.2;
  if (vpdKpa < low) return 'low';
  if (vpdKpa > high) return 'high';
  return 'optimal';
}

/**
 * Normalize an AC Infinity reading to CannaAI's sensor-store convention
 * (temperature in °F, humidity in %, VPD in kPa). Throws on invalid input.
 */
export function normalizeAcInfinityReading(input: AcInfinityReadingInput): NormalizedClimateReading {
  const { temperature, temperatureUnit = 'F', humidity, vpd } = input;
  if (!Number.isFinite(temperature)) throw new Error('temperature must be numeric');
  if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) {
    throw new Error('humidity must be a number between 0 and 100');
  }
  const temperatureF = temperatureUnit === 'C' ? toFahrenheit(temperature) : temperature;
  if (temperatureF < -20 || temperatureF > 130) {
    throw new Error(`temperature=${temperatureF}°F out of plausible indoor range (-20–130)`);
  }
  let vpdKpa: number;
  let vpdComputed = false;
  if (vpd !== undefined && vpd !== null) {
    if (!Number.isFinite(vpd) || vpd < 0 || vpd > 5) {
      throw new Error(`vpd=${vpd} kPa out of plausible range (0–5)`);
    }
    vpdKpa = Math.round(vpd * 100) / 100;
  } else {
    vpdKpa = calculateVPD(toCelsius(temperatureF), humidity);
    vpdComputed = true;
  }
  return { temperatureF: Math.round(temperatureF * 10) / 10, humidity, vpdKpa, vpdComputed };
}

/** Stable sensor id for a controller so repeat readings upsert, not duplicate. */
export function acInfinitySensorId(deviceId?: string): string {
  const slug = (deviceId || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `ac-infinity-${slug || 'default'}`;
}
