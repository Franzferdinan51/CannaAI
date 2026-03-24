import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      schedule: [
        { day: 1, duration: 5, frequency: 'daily' },
        { day: 2, duration: 5, frequency: 'daily' },
        { day: 3, duration: 5, frequency: 'daily' },
        { day: 4, duration: 5, frequency: 'daily' },
        { day: 5, duration: 5, frequency: 'daily' },
        { day: 6, duration: 5, frequency: 'daily' },
        { day: 7, duration: 0, frequency: 'rest' },
      ],
      nextWatering: new Date().toISOString(),
      soilMoisture: 45,
    }
  });
}
