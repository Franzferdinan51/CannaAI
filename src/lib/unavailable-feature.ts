import { NextResponse } from 'next/server';

/** Return a truthful response when a feature has no persisted data model. */
export function unavailableFeature(feature: string) {
  const staticExport = process.env.BUILD_MODE === 'static';
  return NextResponse.json(
    {
      success: false,
      available: false,
      feature,
      error: `${feature} storage is not configured; no sample data was returned.`,
      ...(staticExport ? { clientSide: true, buildMode: 'static' } : {}),
    },
    { status: 503 },
  );
}
