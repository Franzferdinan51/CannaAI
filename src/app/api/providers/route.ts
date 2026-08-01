import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect to the correct providers endpoint
  return NextResponse.redirect(new URL('/api/ai/providers', 'http://localhost:3000'), 307);
}
