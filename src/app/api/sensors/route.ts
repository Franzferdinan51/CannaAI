import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST endpoint for grow monitoring systems to submit sensor data
// Used by OpenClaw grow monitoring system

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

    const t = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    const h = typeof humidity === 'string' ? parseFloat(humidity) : humidity;
    const v = vpd === null || vpd === undefined ? null : (typeof vpd === 'string' ? parseFloat(vpd) : vpd);

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
          source: source || 'manual',
          roomId: roomId || null,
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Check for alerts (simple defaults; refine per-stage elsewhere)
    const alerts: Array<{ type: string; value: number }> = [];
    if (t > 85) alerts.push({ type: 'HIGH_TEMP', value: t });
    if (t < 65) alerts.push({ type: 'LOW_TEMP', value: t });
    if (h > 60) alerts.push({ type: 'HIGH_HUMIDITY', value: h });
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
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = sensorId ? { sensorId } : {};

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: readings.length,
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
