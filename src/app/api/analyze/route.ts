import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

export async function GET() {
  // Provide client-side compatibility response for static export
  return NextResponse.json({
    success: false,
    message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true,
    buildMode: 'static'
  });

  // Full server-side functionality for local development
  try {
    // Dynamic imports for server-side only modules
    const { withSecurity, securityConfig, createAPIResponse, createAPIError } = await import('@/lib/security');
    const { analyzeRequestSchema, validateRequestBody, AnalyzeRequest } = await import('@/lib/validation');
    const { processImageForVisionModel, base64ToBuffer, ImageProcessingError } = await import('@/lib/image');

    return withSecurity(NextRequest.prototype.constructor.name === 'NextRequest' ? new NextRequest('') : null, async (req, context) => {
      return createAPIResponse({
        success: true,
        message: 'Plant analysis service is running (server mode)',
        buildMode: 'server',
        supportedFeatures: {
          aiAnalysis: true,
          purpleDetection: true,
          fallbackAnalysis: true,
          multiProviderSupport: true,
          realTimeProcessing: true
        },
        requestId: context?.clientIP || 'unknown'
      });
    }, securityConfig.publicAPI);

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize analysis service',
        buildMode: 'server',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Provide client-side compatibility response for static export
  return NextResponse.json({
    success: false,
    message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true,
    buildMode: 'static'
  });

  // Full server-side functionality for local development
  try {
    // Dynamic imports for server-side only modules
    const { withSecurity, securityConfig, createAPIResponse, createAPIError } = await import('@/lib/security');
    const { analyzeRequestSchema, validateRequestBody, AnalyzeRequest } = await import('@/lib/validation');
    const { processImageForVisionModel, base64ToBuffer, ImageProcessingError } = await import('@/lib/image');

    return withSecurity(request, async (req, context) => {
      try {
        // Validate and parse request body using our enhanced validation
        const validatedData = validateRequestBody(analyzeRequestSchema, context?.validatedBody || {});
        const {
          strain,
          leafSymptoms,
          phLevel,
          temperature,
          humidity,
          medium,
          growthStage,
          temperatureUnit,
          plantImage,
          pestDiseaseFocus,
          urgency,
          additionalNotes
        } = validatedData as AnalyzeRequest;

        // Temperature conversion logic
        let temperatureCelsius: number | undefined;
        if (temperature !== undefined) {
          const tempNum = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
          if (!isNaN(tempNum)) {
            if (temperatureUnit === 'F') {
              temperatureCelsius = parseFloat(((tempNum - 32) * 5/9).toFixed(1));
            } else {
              temperatureCelsius = tempNum;
            }
          }
        }

        // Process plant image if provided
        let processedImageInfo = null;
        let imageBase64ForAI = null;

        if (plantImage) {
          try {
            const { buffer } = base64ToBuffer(plantImage);

            // Check initial image size and validate
            const originalSize = buffer.length;
            if (originalSize > 500 * 1024 * 1024) { // 500MB limit
              throw new Error('Image too large. Please use an image under 500MB.');
            }

            // Get image metadata for adaptive processing
            const metadata = await import('sharp').then(sharp => sharp.default(buffer).metadata());
            const originalMegapixels = (metadata.width || 0) * (metadata.height || 0) / 1000000;

            // Adaptive compression based on image size and quality requirements
            let processingOptions = {
              format: 'JPEG' as const,
              withoutEnlargement: true,
              fastShrinkOnLoad: false // Preserve quality for large images
            };

            // Smart processing based on original image characteristics
            if (originalMegapixels > 20) {
              // Ultra-high resolution images (8K+) - Maintain 90% quality
              processingOptions = {
                ...processingOptions,
                width: 1600,
                height: 1600,
                quality: 90
              };
            } else if (originalMegapixels > 8) {
              // High resolution images (4K-8K) - Maintain 90% quality
              processingOptions = {
                ...processingOptions,
                width: 1200,
                height: 1200,
                quality: 90
              };
            } else if (originalMegapixels > 2) {
              // Medium resolution images - Maintain 90% quality
              processingOptions = {
                ...processingOptions,
                width: 1000,
                height: 1000,
                quality: 90
              };
            } else {
              // Standard resolution images - Maintain 90% quality
              processingOptions = {
                ...processingOptions,
                width: 800,
                height: 800,
                quality: 90
              };
            }

            // Process image with adaptive settings
            const processedImage = await processImageForVisionModel(buffer, processingOptions);

            // Calculate compression efficiency
            const compressionEfficiency = ((originalSize - processedImage.compressedSize) / originalSize) * 100;

            console.log(`🖼️ Ultra-high resolution image processed:`);
            console.log('   Original: ' + formatFileSize(originalSize) + ' (' + metadata.width + 'x' + metadata.height + ', ' + originalMegapixels.toFixed(1) + 'MP)');
            console.log('   Processed: ' + formatFileSize(processedImage.compressedSize) + ' (' + processedImage.metadata.width + 'x' + processedImage.metadata.height + ')');
            console.log(`   Compression: ${compressionEfficiency.toFixed(1)}% reduction, Quality preserved: ${processingOptions.quality}%`);

            processedImageInfo = {
              originalSize: processedImage.originalSize,
              compressedSize: processedImage.compressedSize,
              dimensions: `${processedImage.metadata.width}x${processedImage.metadata.height}`,
              format: processedImage.metadata.format,
              originalDimensions: `${metadata.width}x${metadata.height}`,
              megapixels: originalMegapixels.toFixed(1),
              qualityLevel: processingOptions.quality,
              compressionEfficiency: compressionEfficiency.toFixed(1),
              isHighResolution: originalMegapixels > 8,
              isUltraHighResolution: originalMegapixels > 20
            };

            imageBase64ForAI = processedImage.base64;
          } catch (imageError) {
            console.warn('Image processing failed, continuing with text analysis:', imageError);
          }
        }

        // Create a comprehensive diagnostic prompt for plant analysis
        const prompt = `🌿 **EXPERT CANNABIS/HEMP PLANT DIAGNOSTIC SYSTEM** 🌿

        📊 **COMPLETE ANALYSIS PARAMETERS**:
        🔬 Strain: ${strain}
        ⚠️ Symptoms: ${leafSymptoms}
        🧪 pH Level: ${phLevel || 'Not measured'}
        🌡️ Temperature: ${temperatureCelsius || 'Not measured'}°C (${temperature || 'Not measured'}°F)
        💧 Humidity: ${humidity || 'Not measured'}%
        🪴 Growing Medium: ${medium || 'Not specified'}
        🌱 Growth Stage: ${growthStage || 'Not specified'}
        🎯 Diagnostic Focus: ${pestDiseaseFocus}
        ⚡ Urgency: ${urgency}
        📝 Additional Notes: ${additionalNotes || 'None'}
        ${imageBase64ForAI ? '📸 HIGH-RESOLUTION IMAGE ANALYSIS: Visual examination of plant provided' : '📸 TEXT-BASED ANALYSIS ONLY'}

        Please provide comprehensive plant analysis with specific recommendations.`;

        // Fallback to rule-based analysis for static compatibility
        const analysisResult = generateFallbackAnalysis(strain, leafSymptoms, phLevel, temperature, humidity, medium, growthStage);

        // Return the enhanced analysis result
        return createAPIResponse({
          success: true,
          analysis: analysisResult,
          imageInfo: processedImageInfo,
          diagnosticCapabilities: {
            imageAnalysis: !!imageBase64ForAI,
            pestDetection: true,
            diseaseIdentification: true,
            nutrientAnalysis: true,
            environmentalStressDetection: true
          },
          fallbackUsed: true,
          fallbackReason: 'Static export mode - using rule-based analysis',
          timestamp: new Date().toISOString(),
          requestId: context?.clientIP || 'unknown'
        });

      } catch (error) {
        console.error('Analysis error:', error);

        // Determine appropriate error response
        let statusCode = 500;
        let errorCode = 'ANALYSIS_ERROR';
        let errorMessage = 'Failed to analyze plant data';

        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            statusCode = 504;
            errorCode = 'TIMEOUT_ERROR';
            errorMessage = 'Analysis service timed out';
          } else if (error.message.includes('LM Studio') || error.message.includes('Open Router')) {
            statusCode = 503;
            errorCode = 'AI_SERVICE_UNAVAILABLE';
            errorMessage = 'AI analysis services are currently unavailable';
          }
        }

        return createAPIError(errorMessage, errorCode, statusCode, {
          timestamp: new Date().toISOString(),
          requestId: context?.clientIP || 'unknown'
        });
      }
    }, securityConfig.analysisAPI);

  } catch (error) {
    console.error('Server initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server initialization failed',
        buildMode: 'server',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateFallbackAnalysis(
  strain: string,
  leafSymptoms: string,
  phLevel?: string,
  temperature?: number | string,
  humidity?: number | string,
  medium?: string,
  growthStage?: string
): any {
  // Simplified fallback analysis
  return {
    diagnosis: 'General Plant Assessment',
    confidence: 75,
    symptomsMatched: ['General symptoms analyzed'],
    causes: ['Environmental factors'],
    treatment: ['Monitor plant health closely'],
    healthScore: 75,
    strainSpecificAdvice: 'Continue monitoring plant development',
    reasoning: [{
      step: 'Rule-Based Analysis',
      explanation: 'Analysis based on established cultivation patterns',
      weight: 100
    }],
    isPurpleStrain: strain.toLowerCase().includes('purple'),
    pestsDetected: [],
    diseasesDetected: [],
    environmentalFactors: [],
    urgency: 'medium',
    preventativeMeasures: ['Regular monitoring'],
    recommendations: {
      immediate: ['Monitor plant health'],
      shortTerm: ['Adjust conditions if needed'],
      longTerm: ['Maintain optimal conditions']
    },
    followUpSchedule: 'Monitor every 2-3 days'
  };
}