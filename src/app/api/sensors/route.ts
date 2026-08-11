import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST endpoint for grow monitoring systems to submit sensor data
// Used by OpenClaw grow monitoring system

// Plausible physical bounds for indoor cultivation. Anything outside these
// ranges is almost certainly a sensor fault, not a real reading — we reject
// them at the edge so they don't pollute the dashboard / trigger false alerts.
const SENSOR_BOUNDS = {
  temperatureF: { min: -20, max: 130 }, // °F (indoor tents rarely exceed this)
  humidityPct: { min: 0, max: 100 },    // RH is a percentage
  vpdKpa: { min: 0, max: 5 },            // typical range ~0.4-1.6 kPa
  co2Ppm: { min: 0, max: 5000 },         // ambient up to ~2000; enrichment up to 1500
  lightPpfd: { min: 0, max: 2000 },      // µmol/m²/s for full sunlight
  lightLux: { min: 0, max: 200000 },     // direct sunlight ~100k lux
} as const;

type BoundKey = keyof typeof SENSOR_BOUNDS;

function bound(key: BoundKey, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const { min, max } = SENSOR_BOUNDS[key];
  return value >= min && value <= max;
}

function parseNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  let n: number;
  if (typeof value === 'string') {
    n = parseFloat(value);
  } else if (typeof value === 'number') {
    n = value;
  } else {
    return null;
  }
  return Number.isFinite(n) ? n : null;
}

// Helper: Get or create sensor (keeps /api/sensors backward-compatible with the newer schema)
async function getOrCreateSensor(sensorId: string, roomId?: string) {
  let sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });

  if (!sensor) {
    sensor = await prisma.sensor.create({
      data: {
        id: sensorId,
        name: roomId ? `Grow Monitor - ${roomId}` : 'Grow Monitor',
        type: 'environmental',
        enabled: true,
      },
    });
  }

  return sensor;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      temperature,
      humidity,
      vpd,
      co2,
      light,
      source,
      roomId,
      sensorId: sensorIdFromBody,
      timestamp,
    } = body;

    // Validate required fields (0 is a valid value, so avoid falsy checks)
    if (temperature === null || temperature === undefined || humidity === null || humidity === undefined) {
      return NextResponse.json(
        { error: 'Temperature and humidity are required' },
        { status: 400 }
      );
    }

    const t = parseNum(temperature);
    const h = parseNum(humidity);
    const v = parseNum(vpd);
    const c = parseNum(co2);
    const l = parseNum(light);

    // Reject NaN / non-numeric payloads instead of silently writing bad data.
    if (t === null || h === null) {
      return NextResponse.json(
        { error: 'Temperature and humidity must be numeric' },
        { status: 400 }
      );
    }

    const rangeErrors: string[] = [];
    if (!bound('temperatureF', t)) rangeErrors.push(`temperature=${t}°F out of range ${SENSOR_BOUNDS.temperatureF.min}–${SENSOR_BOUNDS.temperatureF.max}`);
    if (!bound('humidityPct', h)) rangeErrors.push(`humidity=${h}% out of range 0–100`);
    if (v !== null && !bound('vpdKpa', v)) rangeErrors.push(`vpd=${v} kPa out of range 0–5`);
    if (c !== null && !bound('co2Ppm', c)) rangeErrors.push(`co2=${c} ppm out of range 0–5000`);
    if (l !== null && !bound('lightLux', l) && !bound('lightPpfd', l)) {
      rangeErrors.push(`light=${l} out of plausible range (lux or PPFD)`);
    }
    if (rangeErrors.length > 0) {
      return NextResponse.json(
        { error: 'Sensor readings out of plausible range', details: rangeErrors },
        { status: 422 }
      );
    }

    // Schema requires SensorReading.sensorId relation
    const sensorId = sensorIdFromBody || roomId || 'grow-monitor';
    await getOrCreateSensor(sensorId, roomId);

    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        sensorId,
        // Convention: value tracks temperature; full payload in `data`
        value: t,
        data: {
          temperature: t,
          humidity: h,
          vpd: v,
          co2: c,
          light: l,
          source: source || 'manual',
          roomId: roomId || null,
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Check for alerts (simple defaults; refine per-stage elsewhere).
    // Alert thresholds intentionally tight so they trigger only when a reading
    // is genuinely off-target for a cannabis grow room, not on sensor noise.
    const alerts: Array<{ type: string; value: number }> = [];
    if (t > 85) alerts.push({ type: 'HIGH_TEMP', value: t });
    if (t < 65) alerts.push({ type: 'LOW_TEMP', value: t });
    if (h > 70) alerts.push({ type: 'HIGH_HUMIDITY', value: h });
    if (h < 35) alerts.push({ type: 'LOW_HUMIDITY', value: h });

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      alerts: alerts.length > 0 ? alerts : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sensor data error:', error);
    return NextResponse.json(
      { error: 'Failed to process sensor data' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve recent sensor readings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const sensorId = searchParams.get('sensorId') || roomId;
    // Hard cap on limit so a hostile or buggy caller can't request millions
    // of rows and OOM the process.
    const MAX_LIMIT = 500;
    const requested = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(requested, MAX_LIMIT)
      : 50;

    const where = sensorId ? { sensorId } : {};

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: readings.length,
      limit,
      maxLimit: MAX_LIMIT,
      readings: readings.reverse(),
    });
  } catch (error) {
    console.error('Sensor readings error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sensor readings' },
      { status: 500 }
    );
  }
}
