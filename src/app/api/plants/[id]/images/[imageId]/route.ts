import { NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const { id, imageId } = await params;
  return NextResponse.json({ success: true, message: `Deleted image ${imageId} for ${id}` });
}

export async function PUT(_: Request, { params }: Params) {
  const { id, imageId } = await params;
  return NextResponse.json({ success: true, message: `Set image ${imageId} as primary for ${id}` });
}
