import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const ids: string[] = body.ids || [];
  const updates = body.updates || {};
  const result = await prisma.plant.updateMany({
    where: { id: { in: ids } },
    data: updates
  });
  return NextResponse.json({ success: true, updated: ids.length });
}
