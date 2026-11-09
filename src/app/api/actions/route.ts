import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

const ActionCreateSchema = z.object({
  plantId: z.string().trim().min(1).max(100).optional(),
  type: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().trim().max(50).optional(),
  data: z.unknown().optional(),
});

export async function GET() {
  try {
    await ensureSeedData();
    const data = await prisma.action.findMany();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Actions list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to list actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureSeedData();
    const body = await request.json().catch(() => ({}));
    const parsed = ActionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid action payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const action = await prisma.action.create({
      data: {
        plantId: input.plantId,
        type: input.type || 'action',
        description: input.description || '',
        status: input.status || 'pending',
        data: input.data as never,
      },
    });
    return NextResponse.json({ success: true, data: action });
  } catch (error) {
    console.error('Action create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create action' }, { status: 500 });
  }
}
