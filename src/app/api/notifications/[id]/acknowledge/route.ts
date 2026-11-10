import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const updated = await prisma.notification.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('notifications.acknowledge_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to acknowledge notification' }, { status: 500 });
  }
}
