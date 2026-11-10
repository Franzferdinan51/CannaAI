import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

export async function POST(request: Request) {
  const log = withRequest(request);
  try {
    await ensureSeedData();
    const sensors = await prisma.sensor.findMany({ select: { id: true } });
    const sensorIds = sensors.map(s => s.id);
    const now = Date.now();
    const rows = Array.from({ length: 24 }).map((_, idx) => {
      const timestamp = new Date(now - idx * 60 * 60 * 1000).toISOString();
      const row = [timestamp, ...sensorIds.map(() => 0)];
      return row.join(',');
    });

    const header = ['timestamp', ...sensorIds].join(',');
    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sensor-export.csv"',
      },
    });
  } catch (error) {
    log.error('sensors.data_export_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to export sensor data' }, { status: 500 });
  }
}
