import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  normalizeAcInfinityReading,
  acInfinitySensorId,
  vpdBand,
} from '@/lib/ac-infinity';
import { withRequest } from '@/lib/logger';

const AcInfinityPayloadSchema = z.object({
  deviceId: z.string().max(100).optional(),
  deviceName: z.string().max(100).optional(),
  temperature: z.number(),
  temperatureUnit: z.enum(['F', 'C']).optional().default('F'),
  humidity: z.number(),
  vpd: z.number().optional(),
  ports: z.array(z.object({
    port: z.number().int(),
    speed: z.number().int().min(0).max(10).optional(),
    mode: z.string().max(20).optional(),
    on: z.boolean().optional(),
  })).optional(),
  timestamp: z.string().datetime().optional(),
  growthStage: z.string().max(50).optional(),
});

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

/**
 * POST /api/sensors/ac-infinity
 * Ingest a reading from an AC Infinity controller/app. Designed for
 * Duckets' real path: the AC Infinity app on his Pixel, scraped over
 * wireless ADB by a Juno cron (or via his ac-infinity-mcp bridge).
 * VPD is computed from temp/RH when the sender doesn't provide it.
 */
export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    const body = await request.json();
    const parsed = AcInfinityPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return addSecurityHeaders(NextResponse.json(
        { success: false, error: 'Invalid AC Infinity payload', details: parsed.error.issues },
        { status: 400 },
      ));
    }
    const { deviceId, deviceName, timestamp, ports, growthStage } = parsed.data;

    let normalized;
    try {
      normalized = normalizeAcInfinityReading(parsed.data);
    } catch (err) {
      return addSecurityHeaders(NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Invalid reading' },
        { status: 422 },
      ));
    }

    const sensorId = acInfinitySensorId(deviceId);
    let sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) {
      sensor = await prisma.sensor.create({
        data: {
          id: sensorId,
          name: deviceName || (deviceId ? `AC Infinity - ${deviceId}` : 'AC Infinity Controller'),
          type: 'environmental',
          enabled: true,
        },
      });
    }

    const reading = await prisma.sensorReading.create({
      data: {
        sensorId,
        value: normalized.temperatureF,
        data: {
          temperature: normalized.temperatureF,
          humidity: normalized.humidity,
          vpd: normalized.vpdKpa,
          vpdComputed: normalized.vpdComputed,
          source: 'ac-infinity',
          deviceId: deviceId || null,
          deviceName: deviceName || null,
          ports: ports || null,
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    await prisma.sensor.update({
      where: { id: sensorId },
      data: { lastValue: normalized.temperatureF, lastUpdated: new Date() },
    });

    const band = vpdBand(normalized.vpdKpa, growthStage);
    const alerts: Array<{ type: string; value: number; message: string }> = [];
    if (normalized.temperatureF > 85) alerts.push({ type: 'HIGH_TEMP', value: normalized.temperatureF, message: `Tent temp ${normalized.temperatureF}°F is above the 85°F comfort ceiling.` });
    if (normalized.temperatureF < 65) alerts.push({ type: 'LOW_TEMP', value: normalized.temperatureF, message: `Tent temp ${normalized.temperatureF}°F is below the 65°F comfort floor.` });
    if (band === 'high') alerts.push({ type: 'HIGH_VPD', value: normalized.vpdKpa, message: `VPD ${normalized.vpdKpa} kPa is high — air is dry for this stage; raise humidity or lower temp.` });
    if (band === 'low') alerts.push({ type: 'LOW_VPD', value: normalized.vpdKpa, message: `VPD ${normalized.vpdKpa} kPa is low — humid air; increase airflow or lower humidity to avoid mold.` });

    log.info('sensors.ac_infinity_ingest', {
      sensorId,
      temperatureF: normalized.temperatureF,
      vpdKpa: normalized.vpdKpa,
      vpdComputed: normalized.vpdComputed,
      alerts: alerts.length,
    });

    return addSecurityHeaders(NextResponse.json({
      success: true,
      readingId: reading.id,
      sensorId,
      temperatureF: normalized.temperatureF,
      humidity: normalized.humidity,
      vpdKpa: normalized.vpdKpa,
      vpdComputed: normalized.vpdComputed,
      vpdBand: band,
      alerts: alerts.length > 0 ? alerts : null,
      timestamp: new Date().toISOString(),
    }, { status: 201 }));
  } catch (error) {
    log.error('sensors.ac_infinity_error', { error: error instanceof Error ? error.message : 'unknown' });
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'Failed to ingest AC Infinity reading' },
      { status: 500 },
    ));
  }
}

/**
 * GET /api/sensors/ac-infinity
 * Latest reading from each AC Infinity controller, newest first.
 */
export async function GET() {
  const sensors = await prisma.sensor.findMany({
    where: { id: { startsWith: 'ac-infinity-' } },
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });
  return addSecurityHeaders(NextResponse.json({
    success: true,
    controllers: sensors.map((s) => ({
      sensorId: s.id,
      name: s.name,
      lastValue: s.lastValue,
      lastUpdated: s.lastUpdated,
      latestReading: s.readings[0] || null,
    })),
  }));
}
