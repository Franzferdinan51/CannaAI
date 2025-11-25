import { NextResponse } from 'next/server';

type Params = { params: { id: string } };

export async function POST(_: Request, { params }: Params) {
  return NextResponse.json({
    success: true,
    data: {
      id: `image_${Date.now()}`,
      plantId: params.id,
      url: '/placeholder.png',
      isPrimary: false,
      createdAt: new Date().toISOString()
    }
  });
}
