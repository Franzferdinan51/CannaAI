import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Preserve the incoming host/protocol. An absolute localhost redirect
  // breaks Vite-proxied, LAN, and phone clients by sending them to a
  // different backend origin.
  return NextResponse.redirect(new URL('/api/ai/providers', request.url), 307);
}
