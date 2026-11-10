import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withRequest } from '@/lib/logger';

type RouteContext = { params: Promise<{ segments: string[] }> };

const reportMetadata = {
  dataSource: 'CannaAI local database',
  version: '1.0',
  tags: [],
  permissions: { view: ['local-user'], edit: ['local-user'], share: false, public: false },
};

const TemplateUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  parameters: z.unknown().optional(),
  layout: z.unknown().optional(),
  isDefault: z.boolean().optional(),
});

const ReportUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  parameters: z.unknown().optional(),
  metadata: z.unknown().optional(),
  status: z.string().trim().max(50).optional(),
});

const TemplateCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  parameters: z.unknown().optional(),
  layout: z.unknown().optional(),
  isDefault: z.boolean().optional(),
});

const TemplateFromReportSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  parameters: z.unknown().optional(),
  layout: z.unknown().optional(),
});

const DuplicateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

const ScheduleBodySchema = z.record(z.string(), z.unknown());

const ExportFormatSchema = z.string().trim().max(20).optional();

function invalidPayload(error: z.ZodError) {
  return NextResponse.json(
    { success: false, error: 'Invalid report payload', details: error.issues },
    { status: 400 },
  );
}

async function findReport(id: string) {
  return prisma.customReport.findUnique({ where: { id } });
}

function reportNotFound() {
  return NextResponse.json({ success: false, error: 'Report not found.' }, { status: 404 });
}

// Report templates persist as CustomReport rows with status 'template'.
// Report statuses are draft/scheduled/generating/completed/failed/archived,
// so the value never collides, and the reports list route excludes this
// status so templates never leak into the report list. The row's
// `parameters` hold the template parameters; `metadata` carries
// { template: true, layout, isDefault } (the layout has no column of its own).
const TEMPLATE_STATUS = 'template';

type CustomReportRow = NonNullable<Awaited<ReturnType<typeof findReport>>>;

function toTemplate(row: CustomReportRow) {
  const metadata = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata
    : {}) as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    type: row.type,
    parameters: row.parameters ?? {},
    layout: metadata.layout ?? { sections: [], charts: [], tables: [] },
    isDefault: metadata.isDefault === true,
    isCustom: true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function findTemplate(id: string) {
  return prisma.customReport.findFirst({ where: { id, status: TEMPLATE_STATUS } });
}

function templateNotFound() {
  return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 });
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildPdf(title: string, lines: string[]) {
  const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const textLines = [title, ...lines].slice(0, 42);
  const stream = ['BT', '/F1 10 Tf', '50 740 Td', ...textLines.map((line, index) => `${index ? '0 -16 Td ' : ''}(${escapePdf(line.slice(0, 110))}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index < offsets.length; index += 1) chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return Buffer.from(chunks.join(''), 'utf8');
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  const log = withRequest(request);
  try {
    const { segments } = await params;
    if (segments[0] === 'templates') {
      if (segments.length === 1) {
        const { searchParams } = new URL(request.url);
        const templates = await prisma.customReport.findMany({
          where: {
            status: TEMPLATE_STATUS,
            ...(searchParams.get('category') ? { category: searchParams.get('category')! } : {}),
            ...(searchParams.get('type') ? { type: searchParams.get('type')! } : {}),
            ...(searchParams.get('search') ? { name: { contains: searchParams.get('search')! } } : {}),
          },
          orderBy: { updatedAt: 'desc' },
        });
        return NextResponse.json(templates.map(toTemplate));
      }
      if (segments.length === 2) {
        const template = await findTemplate(segments[1]);
        return template ? NextResponse.json(toTemplate(template)) : templateNotFound();
      }
      return templateNotFound();
    }
    if (segments.length !== 1) return reportNotFound();
    const report = await findReport(segments[0]);
    return report ? NextResponse.json(report) : reportNotFound();
  } catch (error) {
    log.error('reports.segments_get_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const log = withRequest(request);
  try {
    const { segments } = await params;
    if (segments[0] === 'templates') {
      if (segments.length !== 2) return templateNotFound();
      const existing = await findTemplate(segments[1]);
      if (!existing) return templateNotFound();
      const body = await request.json().catch(() => null);
      const parsed = TemplateUpdateSchema.safeParse(body);
      if (!parsed.success) return invalidPayload(parsed.error);
      const input = parsed.data;
      const existingMetadata = (existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? existing.metadata
        : {}) as Record<string, unknown>;
      const updated = await prisma.customReport.update({
        where: { id: segments[1] },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.parameters ? { parameters: input.parameters as never } : {}),
          metadata: {
            ...existingMetadata,
            template: true,
            ...(input.layout ? { layout: input.layout } : {}),
            ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          } as never,
        },
      });
      return NextResponse.json(toTemplate(updated));
    }
    if (segments.length !== 1) return reportNotFound();
    if (!(await findReport(segments[0]))) return reportNotFound();
    const body = await request.json().catch(() => null);
    const parsed = ReportUpdateSchema.safeParse(body);
    if (!parsed.success) return invalidPayload(parsed.error);
    const input = parsed.data;
    const report = await prisma.customReport.update({
      where: { id: segments[0] },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.parameters ? { parameters: input.parameters as never } : {}),
        ...(input.metadata ? { metadata: input.metadata as never } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });
    return NextResponse.json(report);
  } catch (error) {
    log.error('reports.segments_update_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const log = withRequest(request);
  try {
    const { segments } = await params;
    if (segments[0] === 'templates') {
      if (segments.length !== 2) return templateNotFound();
      if (!(await findTemplate(segments[1]))) return templateNotFound();
      await prisma.customReport.delete({ where: { id: segments[1] } });
      return NextResponse.json({ success: true });
    }
    if (segments.length !== 1) return reportNotFound();
    if (!(await findReport(segments[0]))) return reportNotFound();
    await prisma.customReport.delete({ where: { id: segments[0] } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('reports.segments_delete_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to delete report' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const log = withRequest(request);
  try {
    const { segments } = await params;
    const [id, action] = segments;
    if (id === 'templates') {
      const body = await request.json().catch(() => ({}));
      // POST /reports/templates/from-report/:reportId — snapshot a report.
      if (action === 'from-report') {
        const parsed = TemplateFromReportSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        const input = parsed.data;
        const source = segments[2] ? await findReport(segments[2]) : null;
        if (!source || source.status === TEMPLATE_STATUS) return reportNotFound();
        const created = await prisma.customReport.create({
          data: {
            name: input.name || `${source.name} Template`,
            description: input.description !== undefined ? input.description : source.description,
            type: input.type || source.type,
            category: input.category || source.category,
            status: TEMPLATE_STATUS,
            parameters: (input.parameters ?? source.parameters ?? {}) as never,
            metadata: {
              ...reportMetadata,
              template: true,
              isDefault: false,
              ...(input.layout ? { layout: input.layout } : {}),
            } as never,
          },
        });
        return NextResponse.json(toTemplate(created), { status: 201 });
      }
      // POST /reports/templates — create a template directly.
      if (segments.length !== 1) return templateNotFound();
      const parsed = TemplateCreateSchema.safeParse(body);
      if (!parsed.success) return invalidPayload(parsed.error);
      const input = parsed.data;
      const created = await prisma.customReport.create({
        data: {
          name: input.name,
          description: input.description || '',
          type: input.type || 'summary',
          category: input.category || 'overview',
          status: TEMPLATE_STATUS,
          parameters: (input.parameters ?? {}) as never,
          metadata: {
            ...reportMetadata,
            template: true,
            isDefault: input.isDefault === true,
            ...(input.layout ? { layout: input.layout } : {}),
          } as never,
        },
      });
      return NextResponse.json(toTemplate(created), { status: 201 });
    }
    const report = await findReport(id);
    if (!report) return reportNotFound();

    if (action === 'generate') {
      const generatedAt = new Date();
      const updated = await prisma.customReport.update({
        where: { id },
        data: {
          status: 'completed',
          generatedAt,
          data: { generatedAt: generatedAt.toISOString(), source: 'CannaAI local database' },
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'duplicate') {
      const body = await request.json().catch(() => ({}));
      const parsed = DuplicateSchema.safeParse(body);
      if (!parsed.success) return invalidPayload(parsed.error);
      const duplicate = await prisma.customReport.create({
        data: {
          name: parsed.data.name || `${report.name} (Copy)`,
          description: report.description,
          type: report.type,
          category: report.category,
          parameters: report.parameters as never,
          metadata: (report.metadata || reportMetadata) as never,
        },
      });
      return NextResponse.json(duplicate, { status: 201 });
    }

    if (action === 'schedule') {
      const body = await request.json().catch(() => null);
      const parsed = ScheduleBodySchema.safeParse(body);
      if (!parsed.success) return invalidPayload(parsed.error);
      const updated = await prisma.customReport.update({
        where: { id },
        data: {
          status: 'scheduled',
          parameters: { ...(typeof report.parameters === 'object' && report.parameters ? report.parameters : {}), schedule: parsed.data } as never,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === 'export') {
      const body = await request.json().catch(() => ({}));
      const formatParsed = ExportFormatSchema.safeParse(
        body && typeof body === 'object' ? (body as Record<string, unknown>).format : undefined,
      );
      if (!formatParsed.success) return invalidPayload(formatParsed.error);
      const format = formatParsed.data || 'json';
      const payload = { report, exportedAt: new Date().toISOString(), options: body };
      let content: string | Buffer;
      let contentType = 'application/json';
      let extension = 'json';
      if (format === 'csv' || format === 'excel') {
        content = [
          ['Field', 'Value'].map(csvCell).join(','),
          ...Object.entries(payload.report).filter(([key]) => !['parameters', 'metadata', 'data'].includes(key)).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value].map(csvCell).join(',')),
        ].join('\n');
        contentType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
        extension = format === 'excel' ? 'xls' : 'csv';
      } else if (format === 'pdf') {
        content = buildPdf(report.name, [`Status: ${report.status}`, `Category: ${report.category}`, `Type: ${report.type}`, `Description: ${report.description || '—'}`, `Exported: ${new Date().toISOString()}`]);
        contentType = 'application/pdf';
        extension = 'pdf';
      } else {
        content = JSON.stringify(payload, null, 2);
      }
      const safeName = report.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'report';
      const responseBody = Buffer.isBuffer(content) ? new Uint8Array(content) : content;
      return new NextResponse(responseBody, { headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${safeName}.${extension}"`, 'Cache-Control': 'no-cache' } });
    }

    return NextResponse.json({ success: false, error: 'Unsupported report action.' }, { status: 404 });
  } catch (error) {
    log.error('reports.segments_post_error', { error: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ success: false, error: 'Failed to process report action' }, { status: 500 });
  }
}
