import { NextResponse } from 'next/server';

// Custom report persistence is not enabled in this installation. Nested
// report resources still return structured empty states so the report builder
// remains usable and does not issue noisy 404 requests.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await params;
  if (segments[0] === 'templates') {
    return NextResponse.json([]);
  }

  return NextResponse.json({
    available: false,
    message: 'Custom report persistence is not configured in this installation.',
  });
}
