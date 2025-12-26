import { NextRequest, NextResponse } from 'next/server';
import { testLMStudioConnection } from '@/lib/ai/lmstudioService';

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
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    console.log(`[CONNECTION TEST] Testing connection to ${endpoint}...`);

    const result = await testLMStudioConnection(endpoint);

    if (result.success) {
      console.log(`[CONNECTION TEST] Success! Available models:`, result.models);
    } else {
      console.log(`[CONNECTION TEST] Failed:`, result.error);
    }

    return NextResponse.json({
      success: result.success,
      endpoint,
      models: result.models,
      error: result.error
    });

  } catch (error: any) {
    console.error('[CONNECTION TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection test failed'
      },
      { status: 500 }
    );
  }
}
