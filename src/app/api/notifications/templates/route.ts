import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

// Read-only access to the seeded notification templates. Templates are
// created by notification-init; until now no route could read them back.
export async function GET() {
  await ensureSeedData();
  const data = await prisma.notificationTemplate.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ success: true, data });
}
