import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const alerts = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ success: true, data: alerts });
}

export async function POST(request: Request) {
  await ensureSeedData();
  const body = await request.json();
  const alert = await prisma.alert.create({
    data: {
      sensorId: body.sensorId,
      type: body.type || 'general',
      severity: body.severity || 'medium',
      message: body.message || ''
    }
  });
  return NextResponse.json({ success: true, data: alert });
}
