import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

function reportMetadata() {
  return { dataSource: 'CannaAI local database', version: '1.0', tags: [], permissions: { view: ['local-user'], edit: ['local-user'], share: false, public: false } };
}

const ReportCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  parameters: z.unknown().optional(),
});

export async function GET(request: Request) {
  const log = withRequest(request);
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const where = {
      ...(searchParams.get('category') && searchParams.get('category') !== 'all' ? { category: searchParams.get('category')! } : {}),
      ...(searchParams.get('type') && searchParams.get('type') !== 'all' ? { type: searchParams.get('type')! } : {}),
      // Report templates persist as CustomReport rows with status 'template'
      // (see reports/[...segments]); keep them out of the report list unless
      // that status is requested explicitly.
      ...(searchParams.get('status') && searchParams.get('status') !== 'all' ? { status: searchParams.get('status')! } : { status: { not: 'template' } }),
      ...(searchParams.get('search') ? { name: { contains: searchParams.get('search')! } } : {}),
    };
    const [reports, total] = await Promise.all([
      prisma.customReport.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.customReport.count({ where }),
    ]);
    return NextResponse.json({ reports, total, available: true });
  } catch (error) {
    log.error('reports.list_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to list reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const log = withRequest(request);
  try {
    const body = await request.json().catch(() => null);
    const parsed = ReportCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid report payload', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const report = await prisma.customReport.create({
      data: {
        name: input.name,
        description: input.description || '',
        type: input.type || 'summary',
        category: input.category || 'overview',
        parameters: (input.parameters ?? {}) as never,
        metadata: reportMetadata(),
      },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    log.error('reports.create_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to create report' }, { status: 500 });
  }
}
