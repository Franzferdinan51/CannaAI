import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type Params = { params: Promise<{ id: string }> };

const AlertUpdateSchema = z.object({
  type: z.string().trim().min(1).max(100).optional(),
  severity: z.string().trim().min(1).max(50).optional(),
  message: z.string().max(2000).optional(),
  acknowledged: z.boolean().optional(),
  sensorId: z.string().trim().max(100).nullable().optional(),
});

export async function PUT(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = AlertUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid alert payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const updated = await prisma.alert.update({
      where: { id },
      data: parsed.data,
    }).catch(() => null);
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error('alerts.update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update alert' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const log = withRequest(request);
  try {
    const { id } = await params;
    const removed = await prisma.alert.delete({ where: { id } }).catch(() => null);
    if (!removed) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('alerts.delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete alert' }, { status: 500 });
  }
}
