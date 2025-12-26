import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';
import { notificationSystem } from '@/lib/notification-init';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIP: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (clientData.count >= limit) {
    return false;
  }

  clientData.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: true,
        webhookDeliveries: true
      },
      take: 100
    });

    let response: any = {
      success: true,
      data: notifications,
      meta: {
        total: notifications.length,
        timestamp: new Date().toISOString()
      }
    };

    // Include system statistics if requested
    if (includeStats) {
      const stats = await notificationSystem.getStatistics();
      response.stats = stats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API-NOTIFICATIONS-GET] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.title || !body.message) {
      return NextResponse.json(
        { success: false, error: 'type, title, and message are required' },
        { status: 400 }
      );
    }

    // Send notification
    const result = await sendNotification({
      type: body.type,
      title: body.title,
      message: body.message,
      severity: body.severity || 'info',
      channels: body.channels || ['in_app'],
      metadata: body.metadata || {},
      plantId: body.plantId,
      sensorId: body.sensorId,
      roomId: body.roomId,
      userId: body.userId
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        clientIP,
        userAgent
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-POST] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
