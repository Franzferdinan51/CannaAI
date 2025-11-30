import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids: string[] = body.ids || [];
  await prisma.plant.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true, deleted: ids.length });
}
