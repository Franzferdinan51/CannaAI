import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'CannaAI',
    version: process.env.npm_package_version || '0.1.0',
    node: process.versions.node,
  });
}

