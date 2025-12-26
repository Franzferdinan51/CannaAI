import { NextRequest, NextResponse } from 'next/server';
import { processPdf, extractCultivationData, classifyDocument } from '@/lib/pdfProcessor';

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
    const body = await req.json();
    const { file, analyze = true } = body;

    if (!file) {
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }

    console.log('[PDF API] Processing PDF...');

    // Convert base64 to Blob
    const binaryString = atob(file.split(',')[1] || file);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
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

    console.log('[PDF API] Processing complete');

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[PDF API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'PDF processing failed'
      },
      { status: 500 }
    );
  }
}
