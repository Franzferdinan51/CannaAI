import { NextRequest, NextResponse } from 'next/server';
import { createWebhookSubscription } from '@/lib/webhooks';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIP: string, limit: number = 10, windowMs: number = 3600000): boolean {
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
        { success: false, error: 'Rate limit exceeded. Maximum 10 webhooks per hour.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'url', 'events'];
    const missingFields = requiredFields.filter((field) => !(field in body));

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(body.url);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      'system_alert',
      'sensor_threshold',
      'plant_health',
      'automation_event',
      'harvest_ready',
      'system_failure',
      'analysis_complete',
      'user_action_required'
    ];

    if (!Array.isArray(body.events)) {
      return NextResponse.json(
        { success: false, error: 'events must be an array' },
        { status: 400 }
      );
    }

    const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const webhook = await createWebhookSubscription({
      name: body.name,
      url: body.url,
      secret: body.secret,
      events: body.events,
      retryCount: body.retryCount || 3,
      timeout: body.timeout || 5000
    });

    // Don't return the secret in the response
    const { secret, ...webhookResponse } = webhook;

    return NextResponse.json({
      success: true,
      data: webhookResponse,
      message: 'Webhook registered successfully. A test delivery has been scheduled.',
      meta: {
        timestamp: new Date().toISOString(),
        clientIP,
        userAgent
      }
    });
  } catch (error) {
    console.error('[API-WEBHOOKS-REGISTER] Error:', error);

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
