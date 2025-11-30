import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export async function GET() {
  await ensureSeedData();
  const data = await prisma.room.findMany();
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  await ensureSeedData();
  const body = await request.json();
  const created = await prisma.room.create({ data: { name: body.name, temp: body.temp, humidity: body.humidity, co2: body.co2, active: body.active ?? true } });
  return NextResponse.json({ success: true, data: created });
}
