import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Ad-hoc automation actions (watering / lighting / climate / CO2) are
 * equipment control. In this installation equipment control is manual
 * by design — no API route executes it, including this one. That is a
 * deliberate safety boundary, not a missing feature: the automation
 * engine's closed safe action set (analysis, capture, task creation,
 * notifications) runs through automation rules and the scheduler, and
 * device-changing actions return "unsupported" there too.
 *
 * This endpoint therefore answers truthfully instead of pretending to
 * run the action: 503, success:false, with the reason named.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      available: false,
      feature: 'Automation actions',
      error: 'Automation actions are manual-only in this installation',
      message:
        'Device actions (watering, lighting, climate, CO2) are never executed by the API here — equipment control stays manual by design. Analysis, capture, task and notification actions run through automation rules instead.',
    },
    { status: 503 },
  );
}
