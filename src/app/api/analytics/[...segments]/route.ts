import { NextResponse } from 'next/server';

// The new UI has a richer analytics contract than the currently persisted
// database supports. Keep those screens usable with explicit empty states
// instead of returning 404s and filling the browser console with failures.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await params;
  const resource = segments.join('/');

  switch (resource) {
    case 'overview':
      return NextResponse.json({
        timeSeries: [],
        summary: {
          total: 0,
          average: 0,
          minimum: 0,
          maximum: 0,
          median: 0,
          standardDeviation: 0,
          trend: { direction: 'stable', percentage: 0, significance: 'low' },
          growth: { absolute: 0, percentage: 0, period: 'selected range' },
        },
        available: false,
        message: 'Analytics data will appear after sensor or plant records are collected.',
      });
    case 'plants/growth':
    case 'environmental':
    case 'insights':
    case 'predictions':
      return NextResponse.json([]);
    case 'financial':
    case 'yield':
      return NextResponse.json(null);
    case 'realtime':
      return NextResponse.json({ available: false, message: 'No real-time analytics data is available yet.' });
    default:
      return NextResponse.json({ available: false, message: `Analytics resource '${resource}' is not configured.` });
  }
}
