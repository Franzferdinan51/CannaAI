import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzePlantHealth } from '@/lib/ai';

type Params = { params: Promise<{ id: string }> };

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function normalizeImage(value: string, mimeType = 'image/jpeg'): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `data:${mimeType};base64,${trimmed}`;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const plant = await prisma.plant.findUnique({ where: { id }, include: { strain: true } });
  if (!plant) return NextResponse.json({ success: false, error: 'Plant not found' }, { status: 404 });

  try {
    const contentType = request.headers.get('content-type') || '';
    let imageData = '';
    let imageMimeType = 'image/jpeg';
    let imageSizeBytes = 0;
    let input: Record<string, any> = {};

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const image = form.get('image');
      const rawData = form.get('data');
      if (typeof rawData === 'string') {
        try { input = asRecord(JSON.parse(rawData)); } catch { input = {}; }
      }
      if (image instanceof File) {
        if (!image.type.startsWith('image/')) {
          return NextResponse.json({ success: false, error: 'The uploaded file must be an image.' }, { status: 400 });
        }
        if (image.size > 25 * 1024 * 1024) {
          return NextResponse.json({ success: false, error: 'Image exceeds the 25 MB limit.' }, { status: 413 });
        }
        imageMimeType = image.type;
        const buffer = Buffer.from(await image.arrayBuffer());
        imageSizeBytes = buffer.length;
        imageData = `data:${imageMimeType};base64,${buffer.toString('base64')}`;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      input = asRecord(body);
      const rawImage = typeof input.image === 'string' ? input.image : input.plantImage;
      if (typeof rawImage === 'string' && rawImage.trim()) {
        imageData = normalizeImage(rawImage, typeof input.mimeType === 'string' ? input.mimeType : imageMimeType);
        imageSizeBytes = Buffer.byteLength(imageData);
      }
    }

    if (!imageData) {
      return NextResponse.json({ success: false, error: 'An image is required for plant analysis. No fabricated health result was created.' }, { status: 400 });
    }

    const analysis = await analyzePlantHealth(imageData, {
      model: typeof input.model === 'string' ? input.model : undefined,
      baseUrl: typeof input.baseUrl === 'string' ? input.baseUrl : undefined,
      primaryProvider: typeof input.primaryProvider === 'string' ? input.primaryProvider : undefined,
      observationScope: input.observationScope === 'multiple-plants' || input.observationScope === 'crop' ? input.observationScope : 'single-plant',
      expectedPlantCount: typeof input.expectedPlantCount === 'number' ? input.expectedPlantCount : undefined,
      strain: typeof input.strain === 'string' ? input.strain : plant.strain?.name,
      growthStage: typeof input.growthStage === 'string' ? input.growthStage : plant.stage || undefined,
      medium: typeof input.medium === 'string' ? input.medium : undefined,
      temperature: typeof input.temperature === 'number' ? input.temperature : undefined,
      humidity: typeof input.humidity === 'number' ? input.humidity : undefined,
      phLevel: typeof input.phLevel === 'number' ? input.phLevel : undefined,
      symptoms: Array.isArray(input.symptoms) ? input.symptoms.filter((item: unknown): item is string => typeof item === 'string') : undefined,
    });

    const result = {
      id: `analysis_${Date.now()}`,
      plantId: id,
      diagnosis: analysis.diagnosis,
      urgency: analysis.urgency.toUpperCase(),
      confidence: analysis.confidence,
      healthScore: analysis.healthScore === undefined ? undefined : Math.round(analysis.healthScore * 100),
      causes: analysis.potentialIssues,
      recommendations: { overall: analysis.recommendations },
      provider: analysis.provider || 'local-first',
      metadata: {
        provider: analysis.provider || 'local-first',
        model: input.model,
        fallbackUsed: false,
        processingTime: 0,
        dataPoints: 0,
        confidence: analysis.confidence,
        imageBytes: imageSizeBytes,
      },
      createdAt: new Date().toISOString(),
    };

    await prisma.plantAnalysis.create({
      data: {
        plantId: id,
        request: { ...input, image: undefined },
        result,
        provider: analysis.provider || 'local-first',
        imageInfo: { mimeType: imageMimeType, sizeBytes: imageSizeBytes },
      },
    });

    return NextResponse.json({ success: true, data: { result } });
  } catch (error) {
    console.error('Plant analysis failed:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Plant analysis failed' }, { status: 500 });
  }
}
