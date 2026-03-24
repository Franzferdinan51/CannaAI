import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      schedule: [
        { day: 1, nutrients: ['cal-mag', 'micro', 'grow'] },
        { day: 2, nutrients: ['bloom'] },
        { day: 3, nutrients: ['micro', 'grow', 'cal-mag'] },
      ],
      nextFeeding: new Date().toISOString(),
    }
  });
}
