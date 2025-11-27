import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const data = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  await ensureSeedData();
  const body = await request.json();
  const notification = await prisma.notification.create({
    data: {
      type: body.type || 'info',
      title: body.title,
      message: body.message || '',
      acknowledged: false
    }
  });
  return NextResponse.json({ success: true, data: notification });
}
