import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      coverage: 85,
      height: 45,
      width: 36,
      density: 'medium',
    }
  });
}
