import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  const updates = await request.json().catch(() => ({}));
  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { ...updates, updatedAt: new Date() }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}
