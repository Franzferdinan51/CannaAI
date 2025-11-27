import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();

  // First get the plant to determine its location/sensor
  const plant = await prisma.plant.findUnique({
    where: { id: params.id },
    include: { room: true }
  });

  if (!plant) {
    return NextResponse.json(
      { success: false, error: 'Plant not found' },
      { status: 404 }
    );
  }

  // Get latest sensor reading for sensors in the plant's room
  const sensor = await prisma.sensorReading.findFirst({
    where: plant.locationId ? {
      sensor: {
        locationId: plant.locationId
      }
    } : undefined,
    orderBy: { timestamp: 'desc' }
  });

  return NextResponse.json({
    success: true,
    data: {
      plantId: params.id,
      environment: { lastUpdated: sensor?.timestamp?.toISOString?.() }
    }
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  await ensureSeedData();

  // Get the plant to determine its location
  const plant = await prisma.plant.findUnique({
    where: { id: params.id }
  });

  if (!plant) {
    return NextResponse.json(
      { success: false, error: 'Plant not found' },
      { status: 404 }
    );
  }

  // Get the first enabled sensor in the plant's room
  const sensor = await prisma.sensor.findFirst({
    where: {
      enabled: true,
      locationId: plant.locationId || undefined
    },
    orderBy: { createdAt: 'asc' }
  });

  if (!sensor) {
    return NextResponse.json(
      { success: false, error: 'No sensor found for plant location' },
      { status: 404 }
    );
  }

  await prisma.sensorReading.create({
    data: {
      sensorId: sensor.id,
      value: body.temperature
    }
  });

  return NextResponse.json({ success: true, data: { plantId: params.id, environment: body } });
}
