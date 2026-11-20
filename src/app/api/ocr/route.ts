import { NextRequest, NextResponse } from 'next/server';
import { recognizeText, recognizeTextBatch, parseNutrientLabel, parseMeterReading } from '@/lib/ocrService';
import { getLogger } from '@/lib/logger';

const log = getLogger().child({ tag: '[OCR]' });

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * OCR API Endpoint
 * POST /api/ocr
 *
 * Body:
 * - images: string[] | string (base64 encoded images)
 * - mode: 'text' | 'nutrient' | 'meter' (extraction mode)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, mode = 'text' } = body;

    if (!images) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400 }
      );
    }

    const imagesArray = Array.isArray(images) ? images : [images];

    log.debug('ocr.processing_started', { imageCount: imagesArray.length, mode });

    // Extract text from all images
    const textResults = await recognizeTextBatch(imagesArray);

    let result: any = {
      success: true,
      texts: textResults,
      mode
    };

    // Parse based on mode
    if (mode === 'nutrient') {
      const nutrientData = textResults.map(parseNutrientLabel);
      result.nutrients = nutrientData;
    } else if (mode === 'meter') {
      const meterData = textResults.map(parseMeterReading);
      result.meters = meterData;
    }

    log.debug('ocr.processing_complete', { imageCount: imagesArray.length, mode });

    return NextResponse.json(result);

  } catch (error: unknown) {
    log.error('ocr.processing_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'OCR processing failed'
      },
      { status: 500 }
    );
  }
}
