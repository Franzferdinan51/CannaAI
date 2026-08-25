import { NextResponse } from 'next/server';

// The dashboard currently has no persisted custom-report model. Return a real
// empty state so the Reports screen does not treat a missing route as a crash.
export async function GET() {
  return NextResponse.json({
    success: true,
    available: false,
    reports: [],
    total: 0,
    message: 'No persisted custom reports are configured in this installation.',
  });
}
