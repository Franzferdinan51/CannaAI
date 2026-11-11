import { NextResponse } from 'next/server';
import { debugEndpointsEnabled } from '@/lib/debug-endpoints';
import { withRequest } from '@/lib/logger';

export async function POST(request: Request) {
  const log = withRequest(request);
  if (!debugEndpointsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  log.info('debug.analyze_test_request');

  try {
    const body = await request.json();
    log.info('debug.analyze_test_body_parsed', {
      keys: body && typeof body === 'object' ? Object.keys(body) : [],
      bodyType: body === null ? 'null' : Array.isArray(body) ? 'array' : typeof body,
    });

    return NextResponse.json({
      success: true,
      message: 'Simple test endpoint working',
      received: body
    });
  } catch (error) {
    log.error('debug.analyze_test_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
