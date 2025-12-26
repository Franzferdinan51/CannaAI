import { NextRequest, NextResponse } from 'next/server';
import { recognizeText, recognizeTextBatch, parseNutrientLabel, parseMeterReading } from '@/lib/ocrService';

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

    console.log(`[OCR API] Processing ${imagesArray.length} images in ${mode} mode...`);

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

    console.log(`[OCR API] Processing complete`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[OCR API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'OCR failed'
      },
      { status: 500 }
    );
  }
}
