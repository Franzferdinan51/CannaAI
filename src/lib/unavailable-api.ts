import { NextResponse } from 'next/server';

/** Return a truthful capability response for an unimplemented legacy feature. */
export function unavailableApiResponse(feature: string) {
  return NextResponse.json(
    {
      success: false,
      available: false,
      error: `${feature} is unavailable`,
      message: `CannaAI does not have a persisted ${feature.toLowerCase()} integration in this installation.`,
      feature,
    },
    { status: 503 }
  );
}
