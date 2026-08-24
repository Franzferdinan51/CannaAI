import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: 'completed',
      notes: body.notes,
      completedAt: new Date(),
      updatedAt: new Date()
    }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}
