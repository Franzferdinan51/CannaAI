import { NextRequest, NextResponse } from 'next/server';
import { testLMStudioConnection } from '@/lib/ai/lmstudioService';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';
import { withRequest } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Connection Test API Endpoint
 * POST /api/test-connection
 *
 * Body:
 * - provider: 'lmstudio' | 'lmstudio2' | 'lmstudio3' | 'lmstudio4'
 * - endpoint: string (LM Studio server URL)
 */
export async function POST(req: NextRequest) {
  const log = withRequest(req);
  try {
    const body = await req.json();
    const { endpoint, apiKey } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    log.info('test_connection.started', { endpoint });

    const result = await testLMStudioConnection(
      endpoint,
      typeof apiKey === 'string' && apiKey.trim() ? apiKey : getLMStudioApiKey(),
    );

    if (result.success) {
      log.info('test_connection.success', {
        endpoint,
        modelCount: Array.isArray(result.models) ? result.models.length : 0,
      });
    } else {
      log.warn('test_connection.failed', { endpoint, error: result.error ?? 'unknown' });
    }

    return NextResponse.json({
      success: result.success,
      endpoint,
      models: result.models,
      error: result.error
    });

  } catch (error: any) {
    log.error('test_connection.error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection test failed'
      },
      { status: 500 }
    );
  }
}
