import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, broadcastNotification, NotificationData } from '@/lib/notifications';

// Rate limiting map (in production, use Redis)
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

    // Validate request body
    const requiredFields = ['type', 'title', 'message', 'severity', 'channels'];
    const missingFields = requiredFields.filter((field) => !(field in body));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate channels
    const validChannels = ['in_app', 'push', 'email', 'sms', 'webhook', 'discord', 'slack'];
    const invalidChannels = body.channels.filter((c: string) => !validChannels.includes(c));

    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid channels: ${invalidChannels.join(', ')}` },
        { status: 400 }
      );
    }

    const notificationData: NotificationData = {
      type: body.type,
      title: body.title,
      message: body.message,
      severity: body.severity,
      channels: body.channels,
      metadata: body.metadata || {},
      plantId: body.plantId,
      sensorId: body.sensorId,
      roomId: body.roomId,
      userId: body.userId
    };

    // Send to all users (broadcast) or specific user
    let result;
    if (body.broadcast) {
      result = await broadcastNotification(notificationData);
    } else {
      result = await sendNotification(notificationData);
    }

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
    console.error('[API-NOTIFICATIONS-SEND] Error:', error);

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
