import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  await ensureSeedData();
  const actions = await prisma.action.findMany({ where: { plantId: params.id } });
  return NextResponse.json({ success: true, data: actions });
}

export async function POST(request: NextRequest, { params }: Params) {
  const body = await request.json().catch(() => ({}));
  await ensureSeedData();
  const action = await prisma.action.create({
    data: {
      plantId: params.id,
      type: body.type || 'action',
      description: body.description || '',
      status: body.status || 'pending',
      data: body.data
    }
  });
  return NextResponse.json({ success: true, data: action });
}
