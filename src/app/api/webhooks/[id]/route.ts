import { NextRequest, NextResponse } from 'next/server';
import {
  getWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  sendWebhookTest
} from '@/lib/webhooks';

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const webhook = await getWebhookSubscription(params.id);

    // Don't return the secret
    const { secret, ...webhookResponse } = webhook;

    return NextResponse.json({
      success: true,
      data: webhookResponse,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-WEBHOOK-ID-GET] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook not found',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message === 'Webhook subscription not found' ? 404 : 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();

    // Validate URL if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Validate events if provided
    if (body.events) {
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
    }

    const webhook = await updateWebhookSubscription(params.id, body);

    // Don't return the secret
    const { secret, ...webhookResponse } = webhook;

    return NextResponse.json({
      success: true,
      data: webhookResponse,
      message: 'Webhook updated successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-WEBHOOK-ID-PUT] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook not found',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message === 'Webhook subscription not found' ? 404 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await deleteWebhookSubscription(params.id);

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API-WEBHOOK-ID-DELETE] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook not found',
        timestamp: new Date().toISOString()
      },
      { status: error instanceof Error && error.message === 'Webhook subscription not found' ? 404 : 500 }
    );
  }
}
