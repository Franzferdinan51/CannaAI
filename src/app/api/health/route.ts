import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'CannaAI Health Check',
    environment: process.env.NODE_ENV || 'development'
  });
}