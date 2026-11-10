import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { getLiveLmStudioStatus } from '@/lib/lmstudio-status';
import { markUnprobedProviders } from '@/lib/provider-status';

export async function GET() {
  await ensureSeedData();
  const setting = await prisma.automationSetting.findFirst();
  // Same honesty rule as /api/settings: only lmStudio is live-probed;
  // every other provider's stored `connected` is marked not-probed
  // rather than presented as a live reading.
  const config = markUnprobedProviders((setting?.config || {}) as Record<string, unknown>);
  // The stored config's lmStudio.connected is a seed-time value, not a
  // live reading — overlay the live probe (same one /api/health-check
  // uses) so this payload stops reporting "disconnected" while LM
  // Studio is up. The stored blob itself is left untouched.
  const lmStudio = config.lmStudio;
  if (lmStudio && typeof lmStudio === 'object' && !Array.isArray(lmStudio)) {
    const live = await getLiveLmStudioStatus();
    return NextResponse.json({
      success: true,
      data: { ...config, lmStudio: { ...(lmStudio as Record<string, unknown>), ...live } },
    });
  }
  return NextResponse.json({ success: true, data: config });
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
