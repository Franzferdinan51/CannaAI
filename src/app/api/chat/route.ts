import { NextResponse } from 'next/server';

// Stub API route for static export compatibility
// AI functionality is handled client-side in the browser
export async function POST() {
  return NextResponse.json({
    success: false,
    message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true
  });
}