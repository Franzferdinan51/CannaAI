import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeBase64ImageData, base64ToBuffer } from '@/lib/base64';
import { executeAIWithFallback } from '@/lib/ai-provider-detection';
import { runTriageStage } from '@/lib/diagnosis-pipeline';
import { withRequest } from '@/lib/logger';

// processImageForVisionModel is loaded dynamically to avoid sharp/heic-convert
// crashing on android-arm64 server
const TriageRequestSchema = z.object({
  plantImage: z.string().max(50 * 1024 * 1024),
  strain: z.string().max(100).optional(),
  growthStage: z.string().max(100).optional(),
  leafSymptoms: z.string().max(1000).optional(),
});

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

/**
 * POST /api/analyze/triage
 * Fast, cheap plant-health triage: healthy / stressed / critical + suspected
 * issues + urgency. Intended for quick "is my plant OK?" checks from the
 * phone/PWA before committing to a full analysis.
 */
export async function POST(request: NextRequest) {
  const log = withRequest(request);
  try {
    const body = await request.json();
    const parsed = TriageRequestSchema.safeParse(body);
    if (!parsed.success) {
      return addSecurityHeaders(NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      ));
    }
    const { plantImage, strain, growthStage, leafSymptoms } = parsed.data;

    let imageBase64: string | undefined;
    try {
      const normalized = normalizeBase64ImageData(plantImage);
      const { processImageForVisionModel } = await import('@/lib/image-simple');
      const { buffer } = base64ToBuffer(normalized);
      const processed = await processImageForVisionModel(buffer);
      imageBase64 = processed.base64;
    } catch (imageError) {
      return addSecurityHeaders(NextResponse.json(
        {
          success: false,
          error: 'Image processing failed; the photo was not analyzed.',
          details: imageError instanceof Error ? imageError.message : 'Invalid image data',
        },
        { status: 422 },
      ));
    }

    const triage = await runTriageStage(
      imageBase64,
      { strain, growthStage, leafSymptoms },
      async (prompt, image, options) => {
        const res: any = await executeAIWithFallback(prompt, image ?? '', {
          temperature: options.temperature ?? 0.2,
          timeout: options.timeout ?? 45000,
          maxRetries: 1,
        });
        if (!res?.success) throw new Error(res?.error || 'triage provider failed');
        return {
          text: typeof res.result === 'string' ? res.result : JSON.stringify(res.result ?? ''),
          provider: res.provider,
        };
      },
    );

    log.info('analyze.triage', {
      healthStatus: triage.healthStatus,
      confidence: triage.confidence,
      triageMs: triage.triageMs,
    });

    return addSecurityHeaders(NextResponse.json({
      success: true,
      mode: 'triage',
      triage,
    }));
  } catch (error) {
    log.error('analyze.triage_error', { error: error instanceof Error ? error.message : 'unknown' });
    return addSecurityHeaders(NextResponse.json(
      { success: false, error: 'Triage failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    ));
  }
}
