import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Grow Monitor Data API
 * Comprehensive endpoint for OpenClaw grow monitoring system
 * 
 * POST - Submit complete grow monitoring data (environmental + photos + notes)
 * GET - Retrieve historical grow data with filtering
 */

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

    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        temperature: environmental.temperature,
        humidity: environmental.humidity,
        vpd: environmental.vpd || null,
        co2: environmental.co2 || null,
        source: 'grow_monitor',
        roomId: roomId || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      }
    });

    // Store photos if provided
    let photoRecords = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const photoRecord = await prisma.plantPhoto.create({
          data: {
            url: photo.url,
            description: photo.description || 'Grow monitoring photo',
            roomId: roomId || null,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
          }
        });
        photoRecords.push(photoRecord);
      }
    }

    // Check for alerts
    const alerts = [];
    if (environmental.temperature > 85) {
      alerts.push({ type: 'HIGH_TEMP', value: environmental.temperature, severity: 'critical' });
    } else if (environmental.temperature < 65) {
      alerts.push({ type: 'LOW_TEMP', value: environmental.temperature, severity: 'warning' });
    }
    
    if (environmental.humidity > 60) {
      alerts.push({ type: 'HIGH_HUMIDITY', value: environmental.humidity, severity: 'critical' });
    } else if (environmental.humidity < 35) {
      alerts.push({ type: 'LOW_HUMIDITY', value: environmental.humidity, severity: 'warning' });
    }

    if (environmental.vpd && environmental.vpd > 1.6) {
      alerts.push({ type: 'HIGH_VPD', value: environmental.vpd, severity: 'warning' });
    }

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      photos: photoRecords.map(p => p.id),
      alerts: alerts.length > 0 ? alerts : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Grow monitor data error:', error);
    return NextResponse.json(
      { error: 'Failed to process grow monitor data' },
      { status: 500 }
    );
  }
}

// GET: Retrieve historical grow data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    
    if (roomId) {
      where.roomId = roomId;
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

    // Get photos for the same period
    const photoWhere: any = {};
    if (roomId) photoWhere.roomId = roomId;
    if (startDate || endDate) {
      photoWhere.timestamp = {};
      if (startDate) photoWhere.timestamp.gte = new Date(startDate);
      if (endDate) photoWhere.timestamp.lte = new Date(endDate);
    }

    const photos = await prisma.plantPhoto.findMany({
      where: photoWhere,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: readings.length,
      readings: readings.reverse(),
      photos: photos.reverse(),
    });
  } catch (error) {
    console.error('Grow monitor data retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve grow monitor data' },
      { status: 500 }
    );
  }
}
