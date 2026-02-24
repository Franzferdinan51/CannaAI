import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST endpoint for grow monitoring systems to submit sensor data
// Used by OpenClaw grow monitoring system

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { temperature, humidity, vpd, source, roomId } = body;
    
    // Validate required fields
    if (!temperature || !humidity) {
      return NextResponse.json(
        { error: 'Temperature and humidity are required' },
        { status: 400 }
      );
    }
    
    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        temperature,
        humidity,
        vpd: vpd || null,
        source: source || 'manual',
        roomId: roomId || null,
      }
    });
    
    // Check for alerts
    const alerts = [];
    if (temperature > 85) {
      alerts.push({ type: 'HIGH_TEMP', value: temperature });
    }
    if (temperature < 65) {
      alerts.push({ type: 'LOW_TEMP', value: temperature });
    }
    if (humidity > 60) {
      alerts.push({ type: 'HIGH_HUMIDITY', value: humidity });
    }
    if (humidity < 35) {
      alerts.push({ type: 'LOW_HUMIDITY', value: humidity });
    }
    
    return NextResponse.json({
      success: true,
      readingId: reading.id,
      alerts: alerts.length > 0 ? alerts : null,
      timestamp: new Date().toISOString()
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
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const where = roomId ? { roomId } : {};
    
    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    
    return NextResponse.json({
      success: true,
      count: readings.length,
      readings: readings.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error('Sensor readings error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sensor readings' },
      { status: 500 }
    );
  }
}
