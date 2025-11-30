import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET(request: Request) {
  await ensureSeedData();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.alert.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
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
