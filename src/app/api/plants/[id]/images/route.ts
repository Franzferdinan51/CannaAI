import { NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  return NextResponse.json({
    success: false,
    available: false,
    error: 'Plant image storage is not configured; no image was saved.',
    plantId: id,
  }, { status: 503 });
}
