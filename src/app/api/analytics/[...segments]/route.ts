import { NextResponse } from 'next/server';
import {
  buildEnvironmental,
  buildInsights,
  buildOverview,
  buildPlantGrowth,
  buildRealtime,
  parseDateRange,
  parseIdList,
} from '@/lib/reports-analytics';

// Real aggregates for the Reports analytics tabs, computed from stored
// sensor readings, plant analyses and alerts (see lib/reports-analytics).
// Resources with no data source in this deployment (financial, yield) return
// an explicit `available: false` marker instead of fabricated numbers; the
// reports API client maps that marker to its empty state.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await params;
  const resource = segments.join('/');
  const { searchParams } = new URL(request.url);

  try {
    switch (resource) {
      case 'overview': {
        const range = parseDateRange(searchParams);
        return NextResponse.json(await buildOverview(range, parseIdList(searchParams, 'rooms', 'roomIds')));
      }
      case 'plants/growth': {
        const range = parseDateRange(searchParams);
        return NextResponse.json(await buildPlantGrowth(range, {
          plantIds: parseIdList(searchParams, 'plantIds', 'plants'),
          strainIds: parseIdList(searchParams, 'strainIds', 'strains'),
          roomIds: parseIdList(searchParams, 'roomIds', 'rooms'),
          growthStages: parseIdList(searchParams, 'growthStages'),
        }));
      }
      case 'environmental': {
        const range = parseDateRange(searchParams);
        return NextResponse.json(await buildEnvironmental(range, parseIdList(searchParams, 'roomIds', 'rooms')));
      }
      case 'financial':
        // No cost/revenue records exist in this deployment (cost tracking is
        // an unimplemented stub), so there is nothing honest to aggregate.
        return NextResponse.json({
          available: false,
          message: 'Financial analytics are unavailable: no cost or revenue records are tracked in this installation.',
        });
      case 'yield':
        // No harvest records exist yet, so yields cannot be computed.
        return NextResponse.json({
          available: false,
          message: 'Yield analytics are unavailable: no harvests have been recorded in this installation.',
        });
      case 'realtime':
        return NextResponse.json(await buildRealtime());
      case 'insights': {
        const range = parseDateRange(searchParams);
        return NextResponse.json(await buildInsights(range));
      }
      case 'predictions':
        // No forecasting model exists in this deployment; an empty list is
        // the honest answer (the UI renders it as "no predictions").
        return NextResponse.json([]);
      default:
        return NextResponse.json({ available: false, message: `Analytics resource '${resource}' is not configured.` });
    }
  } catch (error) {
    console.error(`Analytics resource '${resource}' failed:`, error);
    return NextResponse.json(
      { success: false, error: `Analytics resource '${resource}' failed to load.` },
      { status: 500 },
    );
  }
}
