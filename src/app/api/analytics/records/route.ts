import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

// Read-only access to AnalyticsRecord rows. analytics-utils writes these
// records (usage / AI / sensor events); until now nothing could read them
// back. Generic for all plants — filters are exact-match ids and event
// taxonomy only, nothing strain-, plant-, or room-specific.
export async function GET(request: NextRequest) {
  const log = withRequest(request);

  try {
    const { searchParams } = new URL(request.url);

    const where: {
      category?: string;
      eventType?: string;
      plantId?: string;
      sensorId?: string;
      success?: boolean;
      timestamp?: { gte?: Date; lte?: Date };
    } = {};

    const category = searchParams.get('category');
    if (category) where.category = category;

    const eventType = searchParams.get('eventType');
    if (eventType) where.eventType = eventType;

    const plantId = searchParams.get('plantId');
    if (plantId) where.plantId = plantId;

    const sensorId = searchParams.get('sensorId');
    if (sensorId) where.sensorId = sensorId;

    // Only the literal strings 'true' / 'false' are meaningful; anything
    // else is ignored rather than coerced (e.g. '0' must not become false).
    const success = searchParams.get('success');
    if (success === 'true') where.success = true;
    else if (success === 'false') where.success = false;

    // Invalid dates are ignored, not an error — a typo in a dashboard
    // query should still return the unfiltered-by-date result set.
    const timestamp: { gte?: Date; lte?: Date } = {};
    const from = searchParams.get('from');
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) timestamp.gte = fromDate;
    }
    const to = searchParams.get('to');
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) timestamp.lte = toDate;
    }
    if (timestamp.gte !== undefined || timestamp.lte !== undefined) {
      where.timestamp = timestamp;
    }

    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isNaN(parsedLimit)
      ? 50
      : Math.min(200, Math.max(1, parsedLimit));

    const parsedOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
    const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset);

    const [records, total] = await Promise.all([
      prisma.analyticsRecord.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.analyticsRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, limit, offset });
  } catch (error) {
    log.error('analytics.records_error', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json(
      { error: 'Failed to fetch analytics records' },
      { status: 500 },
    );
  }
}
