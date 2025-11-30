import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const setting = await prisma.automationSetting.findFirst();
  return NextResponse.json({ success: true, data: setting?.config || {} });
}

export async function PUT(request: Request) {
  await ensureSeedData();
  const body = await request.json();
  const updated = await prisma.automationSetting.upsert({
    where: { id: 1 },
    create: { id: 1, config: body },
    update: { config: body }
  });
  return NextResponse.json({ success: true, data: updated.config });
}
