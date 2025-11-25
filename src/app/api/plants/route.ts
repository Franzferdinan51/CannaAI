import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const plants = await prisma.plant.findMany();
  return NextResponse.json({ success: true, data: { plants, total: plants.length } });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const body = formData ? Object.fromEntries(formData.entries()) : await request.json().catch(() => ({}));
  await ensureSeedData();
  const plant = await prisma.plant.create({
    data: {
      name: String(body.name || 'New Plant'),
      strainId: body.strainId?.toString() || undefined,
      stage: body.stage || 'vegetative',
      health: {
        score: 80,
        status: 'healthy',
        issues: [],
        recommendations: [],
        warnings: [],
        history: []
      },
      age: Number(body.age || 0),
      plantedDate: body.plantedDate ? new Date(body.plantedDate as string) : new Date(),
      locationId: body.locationId?.toString() || 'room_1',
      images: [],
      notes: body.notes || '',
      tags: [],
      metadata: { source: 'seed', isMotherPlant: false }
    }
  });
  return NextResponse.json({ success: true, data: plant });
}
