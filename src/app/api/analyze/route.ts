import { NextResponse } from 'next/server';

// Stub API route for static export compatibility
// AI functionality is handled client-side in the browser
export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'This API route is not available in static export mode. Please use the client-side AI assistant.',
    clientSide: true
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true
  });
}