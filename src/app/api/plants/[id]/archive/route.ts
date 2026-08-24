import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  const updated = await prisma.plant.update({
    where: { id },
    data: { isActive: false }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}
