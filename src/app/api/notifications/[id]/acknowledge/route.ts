import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: { id: string } };

export async function POST(_: Request, { params }: Params) {
  const updated = await prisma.notification.update({
    where: { id: params.id },
    data: { acknowledged: true, acknowledgedAt: new Date() }
  }).catch(() => null);
  if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
