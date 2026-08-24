import { NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    data: {
      id: `image_${Date.now()}`,
      plantId: id,
      url: '/placeholder.png',
      isPrimary: false,
      createdAt: new Date().toISOString()
    }
  });
}
