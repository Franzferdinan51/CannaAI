import { NextResponse } from 'next/server';

type Params = { params: { id: string; imageId: string } };

export async function DELETE(_: Request, { params }: Params) {
  return NextResponse.json({ success: true, message: `Deleted image ${params.imageId} for ${params.id}` });
}

export async function PUT(_: Request, { params }: Params) {
  return NextResponse.json({ success: true, message: `Set image ${params.imageId} as primary for ${params.id}` });
}
