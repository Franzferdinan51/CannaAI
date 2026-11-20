import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/lib/logger';

const log = getLogger().child({ tag: '[PDF]' });

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * PDF Processing API Endpoint
 * POST /api/pdf
 *
 * Body:
 * - file: string (base64 encoded PDF)
 * - analyze: boolean (extract cultivation data)
 */
export async function POST(req: NextRequest) {
  try {
    const { processPdf, extractCultivationData, classifyDocument } = await import('@/lib/pdfProcessor');
    const body = await req.json();
    const { file, analyze = true } = body;

    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }

    log.debug('pdf.started');

    // Convert base64 to Blob
    const base64Payload = file.split(',')[1] || file;
    const bytes = Uint8Array.from(Buffer.from(base64Payload, 'base64'));
    const blob = new Blob([bytes], { type: 'application/pdf' });

    // Process PDF
    const { text, images } = await processPdf(blob);

    let result: any = {
      success: true,
      text,
      imageCount: images.length
    };

    // Extract cultivation data if requested
    if (analyze) {
      const cultivationData = extractCultivationData(text);
      const documentType = classifyDocument(text, images);

      result.cultivationData = cultivationData;
      result.documentType = documentType;
    }

    log.debug('pdf.completed', { imageCount: images.length });

    return NextResponse.json(result);

  } catch (error: unknown) {
    log.error('pdf.failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'PDF processing failed'
      },
      { status: 500 }
    );
  }
}
