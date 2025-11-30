import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const userId = searchParams.get('userId');

    const preferences = await prisma.notificationPreference.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: preferences,
      meta: {
        total: preferences.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-PREFERENCES-GET] Error:', error);

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

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'type is required' },
        { status: 400 }
      );
    }

    // Create notification preference
    const preference = await prisma.notificationPreference.create({
      data: {
        userId: body.userId || null,
        type: body.type,
        emailEnabled: body.emailEnabled ?? true,
        smsEnabled: body.smsEnabled ?? false,
        pushEnabled: body.pushEnabled ?? true,
        webhookEnabled: body.webhookEnabled ?? false,
        discordEnabled: body.discordEnabled ?? false,
        slackEnabled: body.slackEnabled ?? false,
        inAppEnabled: body.inAppEnabled ?? true,
        minSeverity: body.minSeverity || 'info',
        quietHoursStart: body.quietHoursStart || null,
        quietHoursEnd: body.quietHoursEnd || null,
        throttleRate: body.throttleRate || 0
      }
    });

    return NextResponse.json({
      success: true,
      data: preference,
      message: 'Notification preference created successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-NOTIFICATIONS-PREFERENCES-POST] Error:', error);

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
