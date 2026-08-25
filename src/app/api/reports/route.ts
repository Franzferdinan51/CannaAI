import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function reportMetadata() {
  return { dataSource: 'CannaAI local database', version: '1.0', tags: [], permissions: { view: ['local-user'], edit: ['local-user'], share: false, public: false } };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 50)));
  const where = {
    ...(searchParams.get('category') && searchParams.get('category') !== 'all' ? { category: searchParams.get('category')! } : {}),
    ...(searchParams.get('type') && searchParams.get('type') !== 'all' ? { type: searchParams.get('type')! } : {}),
    ...(searchParams.get('status') && searchParams.get('status') !== 'all' ? { status: searchParams.get('status')! } : {}),
    ...(searchParams.get('search') ? { name: { contains: searchParams.get('search')! } } : {}),
  };
  const [reports, total] = await Promise.all([
    prisma.customReport.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.customReport.count({ where }),
  ]);
  return NextResponse.json({ reports, total, available: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body?.name?.trim()) return NextResponse.json({ success: false, error: 'Report name is required.' }, { status: 400 });
  const report = await prisma.customReport.create({
    data: {
      name: body.name.trim(),
      description: body.description || '',
      type: body.type || 'summary',
      category: body.category || 'overview',
      parameters: body.parameters || {},
      metadata: reportMetadata(),
    },
  });
  return NextResponse.json(report, { status: 201 });
}
