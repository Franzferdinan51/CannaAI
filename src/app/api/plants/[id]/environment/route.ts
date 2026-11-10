import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const EnvironmentReadingSchema = z.object({
  temperature: z.number().finite(),
});

export async function GET(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    await ensureSeedData();

    // First get the plant to determine its location/sensor
    const plant = await prisma.plant.findUnique({
      where: { id },
      include: { room: true },
    });

    if (!plant) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 },
      );
    }

    // Get latest sensor reading for sensors in the plant's room
    const sensor = await prisma.sensorReading.findFirst({
      where: plant.locationId ? {
        sensor: {
          locationId: plant.locationId,
        },
      } : undefined,
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        plantId: id,
        environment: { lastUpdated: sensor?.timestamp?.toISOString?.() },
      },
    });
  } catch (error) {
    log.error('plants.environment_get_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load plant environment' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = EnvironmentReadingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid environment payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    await ensureSeedData();

    // Get the plant to determine its location
    const plant = await prisma.plant.findUnique({
      where: { id },
    });

    if (!plant) {
      return NextResponse.json(
        { success: false, error: 'Plant not found' },
        { status: 404 },
      );
    }

    // Get the first enabled sensor in the plant's room
    const sensor = await prisma.sensor.findFirst({
      where: {
        enabled: true,
        locationId: plant.locationId || undefined,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!sensor) {
      return NextResponse.json(
        { success: false, error: 'No sensor found for plant location' },
        { status: 404 },
      );
    }

    await prisma.sensorReading.create({
      data: {
        sensorId: sensor.id,
        value: parsed.data.temperature,
      },
    });

    return NextResponse.json({ success: true, data: { plantId: id, environment: body } });
  } catch (error) {
    log.error('plants.environment_post_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to record plant environment' }, { status: 500 });
  }
}
