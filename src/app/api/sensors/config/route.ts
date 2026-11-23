import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLogger } from '@/lib/logger';

// CRUD for sensor definitions. `/api/sensors` is intentionally kept as the
// ingestion endpoint for backwards-compatible OpenClaw readings; the UI must
// not send a configuration object to that readings contract.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    if (!name || !type) {
      return NextResponse.json({ success: false, error: 'Sensor name and type are required' }, { status: 400 });
    }

    const sensor = await prisma.sensor.create({
      data: {
        name,
        type,
        enabled: body.enabled !== false,
        ...(typeof body.locationId === 'string' && body.locationId.trim()
          ? { locationId: body.locationId.trim() }
          : {}),
        ...(body.calibration && typeof body.calibration === 'object' && !Array.isArray(body.calibration)
          ? { calibration: body.calibration }
          : {}),
      },
    });

    return NextResponse.json({ success: true, data: sensor }, { status: 201 });
  } catch (error) {
    getLogger().error('sensor_config_create_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to create sensor configuration' }, { status: 500 });
  }
}
