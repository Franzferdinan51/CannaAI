import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const data = await prisma.action.findMany();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  await ensureSeedData();
  const body = await request.json().catch(() => ({}));
  const action = await prisma.action.create({
    data: {
      plantId: body.plantId,
      type: body.type || 'action',
      description: body.description || '',
      status: body.status || 'pending',
      data: body.data
    }
  });
  return NextResponse.json({ success: true, data: action });
}
