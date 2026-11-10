import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const removed = await prisma.notification.delete({ where: { id } }).catch(() => null);
    if (!removed) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('notifications.delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 });
  }
}
