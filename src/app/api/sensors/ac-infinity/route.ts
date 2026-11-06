import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  normalizeAcInfinityReading,
  acInfinitySensorId,
  vpdBand,
} from '@/lib/ac-infinity';
import { withRequest } from '@/lib/logger';
import { evaluateEnvironmentAlerts } from '@/lib/alert-evaluation';

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
    const sensorName = deviceName || (deviceId ? `AC Infinity - ${deviceId}` : 'AC Infinity Controller');
    // The controller name is also the room name in Duckets' setup
    // ("3x3 Tent"). Link the sensor to that room so room views, plant
    // locations, and the dashboard all agree about where a reading came from.
    const rooms = await prisma.room.findMany({ select: { id: true, name: true } });
    const matchingRoom = rooms.find((room) => room.name.toLowerCase() === sensorName.toLowerCase());
    let sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) {
      sensor = await prisma.sensor.create({
        data: {
          id: sensorId,
          name: sensorName,
          type: 'environmental',
          locationId: matchingRoom?.id,
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
      data: {
        lastValue: normalized.temperatureF,
        lastUpdated: new Date(),
        ...(matchingRoom && sensor.locationId !== matchingRoom.id ? { locationId: matchingRoom.id } : {}),
        ...(sensor.name !== sensorName ? { name: sensorName } : {}),
      },
    });

    const band = vpdBand(normalized.vpdKpa, growthStage);

    // Persist real Alert rows for out-of-band conditions: stage bands from
    // the shared env-targets source (strain conditions first, stage
    // defaults underneath) plus any user-defined AlertThreshold rows.
    // This replaces the old hardcoded 65/85 °F warnings, which were never
    // persisted — they only lived in the SensorAnalytics JSON below.
    // Alerting must never fail ingest: on error we log and carry on with
    // no per-reading warnings.
    let alerts: Array<{ type: string; value: number; message: string }> = [];
    let persistedAlerts = 0;
    try {
      const evaluation = await evaluateEnvironmentAlerts({
        sensorId,
        roomId: matchingRoom?.id ?? sensor.locationId ?? null,
        roomName: matchingRoom?.name ?? sensor.name,
        values: {
          temperatureF: normalized.temperatureF,
          humidity: normalized.humidity,
          vpdKpa: normalized.vpdKpa,
        },
        growthStage,
      });
      alerts = evaluation.bandAlerts;
      persistedAlerts = evaluation.bandAlertsCreated + evaluation.thresholdAlertsCreated;
    } catch (err) {
      log.error('sensors.ac_infinity_alert_evaluation_failed', {
        sensorId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }

    // Mirror into SensorAnalytics, the rollup table the analytics
    // endpoints read. It previously had no writer at all, so
    // /api/analytics/sensors returned empty while readings piled up
    // in SensorReading.
    await prisma.sensorAnalytics.create({
      data: {
        sensorId,
        reading: normalized.temperatureF,
        value: {
          temperature: normalized.temperatureF,
          humidity: normalized.humidity,
          vpd: normalized.vpdKpa,
          vpdComputed: normalized.vpdComputed,
          source: 'ac-infinity',
        },
        status: alerts.length > 0 ? 'warning' : 'ok',
        temperature: normalized.temperatureF,
        humidity: normalized.humidity,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    log.info('sensors.ac_infinity_ingest', {
      sensorId,
      temperatureF: normalized.temperatureF,
      vpdKpa: normalized.vpdKpa,
      vpdComputed: normalized.vpdComputed,
      alerts: alerts.length,
      persistedAlerts,
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
