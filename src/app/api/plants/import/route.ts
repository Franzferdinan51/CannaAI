import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (formData) {
    const plants = await prisma.plant.findMany();
    return NextResponse.json({ success: true, imported: plants.length, data: plants });
  }
  const body = await request.json().catch(() => ({}));
  await ensureSeedData();
  let imported = 0;
  if (Array.isArray(body.plants)) {
    for (const p of body.plants) {
      await prisma.plant.create({
        data: {
          ...p,
          id: p.id || undefined,
          plantedDate: p.plantedDate ? new Date(p.plantedDate) : undefined
        }
      });
      imported += 1;
    }
  }
  const plants = await prisma.plant.findMany();
  return NextResponse.json({ success: true, imported, data: plants });
}
