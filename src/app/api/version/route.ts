import { NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    name: 'CannaAI',
    version: process.env.npm_package_version || '0.1.0',
    node: process.versions.node,
  });
}

