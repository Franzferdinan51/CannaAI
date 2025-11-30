import { NextRequest, NextResponse } from 'next/server';
import { listWebhookSubscriptions, getWebhookStatistics } from '@/lib/webhooks';

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

    const webhooks = await listWebhookSubscriptions();

    let response: any = {
      success: true,
      data: webhooks,
      meta: {
        total: webhooks.length,
        timestamp: new Date().toISOString()
      }
    };

    // Include statistics if requested
    if (includeStats && webhooks.length > 0) {
      const statsPromises = webhooks.map(async (webhook: any) => {
        const stats = await getWebhookStatistics(webhook.id);
        return { id: webhook.id, stats };
      });

      const stats = await Promise.all(statsPromises);
      response.stats = stats;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API-WEBHOOKS] Error:', error);

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
