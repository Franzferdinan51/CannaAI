import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

/**
 * Read-only sensor health check used by the sensor configuration UI.
 * A persisted sensor is not considered healthy unless it has a recent reading;
 * this avoids reporting a configured-but-disconnected device as operational.
 */
export async function POST(_: Request, { params }: Params) {
  const startedAt = Date.now();
  const { id } = await params;

  try {
    const sensor = await prisma.sensor.findUnique({
      where: { id },
      include: {
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const responseTime = Date.now() - startedAt;
    if (!sensor) {
      return NextResponse.json({
        success: false,
        data: {
          status: 'error',
          responseTime,
          message: 'Sensor not found',
        },
      }, { status: 404 });
    }

    const latest = sensor.readings[0];
    if (!sensor.enabled) {
      return NextResponse.json({
        success: false,
        data: {
          status: 'error',
          responseTime,
          message: 'Sensor is disabled',
        },
      });
    }

    if (!latest) {
      return NextResponse.json({
        success: false,
        data: {
          status: 'error',
          responseTime,
          message: 'No readings have been received from this sensor',
        },
      });
    }

    const readingData = latest.data && typeof latest.data === 'object' && !Array.isArray(latest.data)
      ? latest.data as Record<string, unknown>
      : {};
    const quality = readingData.quality === 'fair' || readingData.quality === 'poor'
      ? readingData.quality
      : 'good';
    const accuracy = typeof readingData.accuracy === 'number' && Number.isFinite(readingData.accuracy)
      ? readingData.accuracy
      : undefined;

    return NextResponse.json({
      success: true,
      data: {
        status: 'success',
        responseTime,
        ...(accuracy === undefined ? {} : { accuracy }),
        lastReading: {
          value: latest.value ?? 0,
          timestamp: latest.timestamp.toISOString(),
          quality,
        },
        message: 'Sensor has a recent reading',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      data: {
        status: 'error',
        responseTime: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'Sensor test failed',
      },
    }, { status: 500 });
  }
}
