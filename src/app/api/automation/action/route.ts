import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success: true,
    message: `Automation action received`,
    result: { ...body, processedAt: new Date().toISOString() }
  });
}
