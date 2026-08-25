import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

function normalizePlants(value: unknown): (Record<string, unknown> & { name: string })[] | null {
  const plants = Array.isArray(value) ? value : (value && typeof value === 'object' && Array.isArray((value as { plants?: unknown }).plants)
    ? (value as { plants: unknown[] }).plants
    : null);
  if (!plants || plants.some((plant) => !plant || typeof plant !== 'object' || Array.isArray(plant)
    || typeof (plant as { name?: unknown }).name !== 'string' || !(plant as { name: string }).name.trim())) return null;
  return plants as (Record<string, unknown> & { name: string })[];
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (formData) {
    const uploaded = formData.get('file');
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ success: false, error: 'A JSON file is required' }, { status: 400 });
    }
    if (uploaded.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ success: false, error: 'Uploaded file is too large' }, { status: 413 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await uploaded.text());
    } catch {
      return NextResponse.json({ success: false, error: 'Uploaded file is not valid JSON' }, { status: 400 });
    }
    const plantsToImport = normalizePlants(parsed);
    if (!plantsToImport) {
      return NextResponse.json({ success: false, error: 'JSON must contain a plants array' }, { status: 400 });
    }
    await ensureSeedData();
    for (const plant of plantsToImport) {
      await prisma.plant.create({
        data: {
          ...plant,
          id: typeof plant.id === 'string' ? plant.id : undefined,
          plantedDate: plant.plantedDate ? new Date(String(plant.plantedDate)) : undefined,
        },
      });
    }
    const plants = await prisma.plant.findMany();
    return NextResponse.json({ success: true, imported: plantsToImport.length, data: plants });
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
