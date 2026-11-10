import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const CalibrationSchema = z.record(z.string(), z.unknown());

export async function POST(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = CalibrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid calibration payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const calibration = parsed.data;
    await ensureSeedData();
    const sensor = await prisma.sensor.findUnique({ where: { id } });
    if (!sensor) return NextResponse.json({ success: false, error: 'Sensor not found' }, { status: 404 });
    await prisma.sensor.update({
      where: { id },
      data: { calibration: calibration as never, updatedAt: new Date() },
    });
    return NextResponse.json({
      success: true,
      message: `Calibration saved for ${id}`,
      calibration,
    });
  } catch (error) {
    log.error('sensors.calibrate_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to save calibration' }, { status: 500 });
  }
}
