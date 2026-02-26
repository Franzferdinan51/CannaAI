import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Grow Monitor Data API
 * Comprehensive endpoint for OpenClaw grow monitoring system
 * 
 * POST - Submit complete grow monitoring data (environmental + photos + notes)
 * GET - Retrieve historical grow data with filtering
 */

// Helper: Get or create sensor
async function getOrCreateSensor(sensorId: string, roomId?: string) {
  // Try to find existing sensor
  let sensor = await prisma.sensor.findUnique({
    where: { id: sensorId }
  });

  if (!sensor) {
    // Create new sensor with only valid fields
    sensor = await prisma.sensor.create({
      data: {
        id: sensorId,
        name: roomId ? `Grow Monitor - ${roomId}` : 'Grow Monitor',
        type: 'environmental',
        enabled: true
      }
    });
  }

  return sensor;
}

// POST: Submit complete grow monitoring data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomId,
      environmental,
      photos,
      notes,
      timestamp
    } = body;

    // Validate required fields
    if (!environmental || !environmental.temperature || !environmental.humidity) {
      return NextResponse.json(
        { error: 'Environmental data (temperature, humidity) is required' },
        { status: 400 }
      );
    }

    // Get or create sensor
    const sensorId = roomId || 'grow-monitor';
    await getOrCreateSensor(sensorId, roomId);
    
    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        sensorId: sensorId,
        value: parseFloat(environmental.temperature),
        data: {
          temperature: parseFloat(environmental.temperature),
          humidity: parseFloat(environmental.humidity),
          vpd: environmental.vpd ? parseFloat(environmental.vpd) : null,
          co2: environmental.co2 ? parseFloat(environmental.co2) : null,
          source: environmental.source || 'grow_monitor'
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Grow monitor data error:', error);
    return NextResponse.json(
      { error: 'Failed to process grow monitor data', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Retrieve historical grow data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get('sensorId') || searchParams.get('roomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
    if (sensorId) {
      where.sensorId = sensorId;
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: readings.length,
      readings: readings,
    });
  } catch (error: any) {
    console.error('Grow monitor data retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve grow monitor data', details: error.message },
      { status: 500 }
    );
  }
}
