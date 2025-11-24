import { NextRequest, NextResponse } from 'next/server';
import { executeAIWithFallback } from '@/lib/ai-provider-detection';
import { handleImageUpload } from '@/lib/image';

// Export configuration
export const dynamic = 'auto';
export const revalidate = false;
export const runtime = 'nodejs';
export const maxDuration = 60; // Increase timeout for AI analysis

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Plant analysis service is running (server mode)',
      buildMode: 'server',
      supportedFeatures: {
        aiAnalysis: true,
        purpleDetection: true,
        imageProcessing: true,
        fallbackAnalysis: true,
        multiProviderSupport: true,
        realTimeProcessing: true
      }
    });
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
  try {
    console.log('🚀 POST /api/analyze - Starting analysis request');

    // Parse request body
    const body = await request.json();
    const {
      strain,
      leafSymptoms,
      phLevel,
      temperature,
      humidity,
      medium,
      growthStage,
      plantImage,
      pestDiseaseFocus,
      urgency,
      additionalNotes
    } = body;

    console.log(`🔍 Analyzing: Strain="${strain}", Symptoms="${leafSymptoms}"`);

    // Process image if present
    let processedImageBase64: string | undefined = undefined;
    let imageAnalysisInfo = null;

    if (plantImage) {
      try {
        console.log('📸 Processing uploaded image...');
        // Optimize image for AI analysis (resize to 1024x1024, max 50MB input)
        const processedResult = await handleImageUpload(
          plantImage,
          {
            width: 1024,
            height: 1024,
            quality: 85,
            format: 'JPEG',
            fit: 'inside'
          },
          50 // Allow up to 50MB input
        );

        // Use the optimized base64 for AI (much smaller than original)
        // handleImageUpload returns a full data URL (data:image/jpeg;base64,...)
        // But OpenAI/some providers might expect just the base64 or a full URL.
        // executeAIWithFallback handles the format.
        processedImageBase64 = processedResult.base64;

        imageAnalysisInfo = {
          originalSize: processedResult.originalSize,
          compressedSize: processedResult.compressedSize,
          dimensions: {
            width: processedResult.metadata.width,
            height: processedResult.metadata.height
          }
        };

        console.log(`✅ Image processed: ${imageAnalysisInfo.dimensions.width}x${imageAnalysisInfo.dimensions.height}, ${(imageAnalysisInfo.compressedSize / 1024).toFixed(2)}KB`);
      } catch (imageError) {
        console.error('❌ Image processing failed:', imageError);
        // We continue without the image if processing fails, but log it
        // Depending on requirements, we could also throw here.
        // For robustness, we'll try text-only analysis if image fails.
      }
    }

    // Construct the prompt
    const prompt = `
Analyze this cannabis plant based on the following information:
Strain: ${strain || 'Unknown'}
Growth Stage: ${growthStage || 'Unknown'}
Medium: ${medium || 'Unknown'}
Symptoms: ${leafSymptoms || 'None reported'}
Environmental Conditions:
- pH: ${phLevel || 'Unknown'}
- Temperature: ${temperature || 'Unknown'}
- Humidity: ${humidity || 'Unknown'}

${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}
${pestDiseaseFocus ? `Focus Area: ${pestDiseaseFocus}` : ''}
${urgency ? `Urgency Level: ${urgency}` : ''}

Please provide a detailed analysis including:
1. Diagnosis (what is wrong?)
2. Confidence score (0-100)
3. Root causes
4. Recommended treatment (immediate and long-term)
5. Health score (0-100)
6. Strain-specific advice
7. Reasoning for the diagnosis

Format the response as JSON with keys: diagnosis, confidence, symptomsMatched (array), causes (array), treatment (array), healthScore, strainSpecificAdvice, reasoning (array of objects with step, explanation, weight), isPurpleStrain (boolean), pestsDetected (array), diseasesDetected (array), environmentalFactors (array), urgency, recommendations (array of objects with issue, priority, actions).
`;

    // Execute AI analysis
    console.log('🤖 Sending request to AI provider...');
    const aiResult = await executeAIWithFallback(prompt, processedImageBase64, {
      timeout: 55000 // 55 seconds timeout (slightly less than function timeout)
    });

    console.log(`✅ Analysis completed using ${aiResult.provider}`);

    // Enhance result with image analysis info if available
    const analysis = {
      ...aiResult.result,
      imageAnalysis: {
        hasImage: !!processedImageBase64,
        visualFindings: aiResult.result.symptomsMatched || [],
        confidence: aiResult.result.confidence
      }
    };

    // Return the response
    const response = {
      success: true,
      data: {
        success: true,
        analysis,
        imageInfo: imageAnalysisInfo,
        diagnosticCapabilities: {
          imageAnalysis: !!processedImageBase64,
          pestDetection: true,
          diseaseIdentification: true,
          nutrientAnalysis: true,
          environmentalStressDetection: true
        },
        fallbackUsed: aiResult.provider === 'fallback',
        fallbackReason: aiResult.fallbackReason,
        provider: {
          used: aiResult.provider,
          processingTime: aiResult.processingTime
        },
        timestamp: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: '1.0.0'
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze plant data',
          details: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          version: '1.0.0'
        }
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
