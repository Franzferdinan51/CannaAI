import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/analyze-test - Simple test endpoint');

  try {
    const body = await request.json();
    console.log('✅ Body parsed:', body);

    return NextResponse.json({
      success: true,
      message: 'Simple test endpoint working',
      received: body
    });
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}