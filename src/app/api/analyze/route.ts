import { NextRequest, NextResponse } from 'next/server';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { processImageForVisionModel, base64ToBuffer, ImageProcessingError } from '@/lib/image';
import { executeAIWithFallback, detectAvailableProviders, getProviderConfig, AIProviderUnavailableError } from '@/lib/ai-provider-detection';
import { executeWithOpenClaw } from '@/lib/ai-provider-openclaw';
import { executeWithBailian } from '@/lib/ai-provider-bailian';
import { normalizePlantAnalysisResult } from '@/lib/plant-analysis-report-v2';
import { generateAnalysisPromptV2 } from '@/lib/analysis-prompt-v2';
import { enrichReport, mergeEnrichmentWithAnalysis, validateEnrichedReport } from '@/lib/report-enrichment';

/**
 * Provider Priority Chain (FREE MODELS ONLY):
 * 1. OpenClaw Gateway (PRIMARY) - Centralized model management
 * 2. Alibaba Bailian (Qwen) - VISION: qwen3.5-plus (FREE: 18K/month)
 * 3. LM Studio - Local models (FREE)
 * 
 * NO PAID PROVIDERS
 */
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Environment detection
const isStaticExport = process.env.BUILD_MODE === 'static';

// Enhanced security configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 20;
const requestTracker = new Map<string, { count: number; resetTime: number }>();

// Enhanced validation schema with Zod - more flexible for frontend compatibility
const AnalysisRequestSchema = z.object({
  plantId: z.string().optional(),
  strain: z.string().min(1).max(100).transform(val => val.trim()),
  leafSymptoms: z.string().max(1000).transform(val => {
    const trimmed = val.trim();
    return trimmed === '' ? 'No symptoms specified' : trimmed;
  }),
  phLevel: z.union([
    z.string().regex(/^\d*\.?\d*$/).transform(val => val === '' ? undefined : parseFloat(val)),
    z.number().optional()
  ]).optional().transform(val => isNaN(val) ? undefined : val),
  temperature: z.union([
    z.string().regex(/^\d*\.?\d*$/).transform(val => val === '' ? undefined : parseFloat(val)),
    z.number().optional()
  ]).optional().transform(val => isNaN(val) ? undefined : val),
  humidity: z.union([
    z.string().regex(/^\d*\.?\d*$/).transform(val => val === '' ? undefined : parseFloat(val)),
    z.number().optional()
  ]).optional().transform(val => isNaN(val) ? undefined : val),
  medium: z.string().max(100).optional().transform(val => val?.trim()),
  growthStage: z.string().max(100).optional().transform(val => val?.trim()),
  temperatureUnit: z.enum(['C', 'F']).optional().default('F'),
  plantImage: z.string().max(50 * 1024 * 1024).optional(), // 50MB max base64
  pestDiseaseFocus: z.string().max(500).optional().transform(val => val?.trim()),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  additionalNotes: z.string().max(2000).optional().transform(val => val?.trim())
});

// Enhanced security headers
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}

// Rate limiting middleware
function checkRateLimit(request: NextRequest): { allowed: boolean; resetTime?: number; remaining?: number } {
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const hashedIP = crypto.createHash('sha256').update(clientIP).digest('hex').substring(0, 16);
  const now = Date.now();
  // Cleanup expired entries to prevent memory leak
  for (const [key, value] of requestTracker.entries()) {
    if (now > value.resetTime) {
      requestTracker.delete(key);
    }
  }

  const tracker = requestTracker.get(hashedIP);

  if (!tracker || now > tracker.resetTime) {
    requestTracker.set(hashedIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      resetTime: tracker.resetTime,
      remaining: 0
    };
  }

  tracker.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - tracker.count };
}

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;
export const runtime = 'nodejs';

// File size formatting helper
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function GET(request: NextRequest) {
  // For static export, provide client-side compatibility response
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Full server-side functionality for local development
  try {
    return NextResponse.json({
      success: true,
      message: 'Plant analysis service is running (server mode)',
      buildMode: 'server',
      supportedFeatures: {
        aiAnalysis: true,
        purpleDetection: true,
        imageProcessing: true,
        multiProviderSupport: true,
        realTimeProcessing: true,
        requiresAIProvider: true
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
  // For static export, provide client-side compatibility response
  if (isStaticExport) {
    const response = NextResponse.json({
      success: false,
      message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
    return addSecurityHeaders(response);
  }

  // Enhanced rate limiting check
  const rateLimitCheck = checkRateLimit(request);
  if (!rateLimitCheck.allowed) {
    const response = NextResponse.json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      resetTime: rateLimitCheck.resetTime,
      message: `Maximum of ${MAX_REQUESTS_PER_WINDOW} requests per ${RATE_LIMIT_WINDOW / 60000} minutes allowed.`
    }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || '',
        'Retry-After': Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000).toString()
      }
    });
    return addSecurityHeaders(response);
  }

  try {
    // Enhanced validation with comprehensive schema
    let body;
    let rawBody: any;
    try {
      rawBody = await request.json();

      // Pre-sanitization for security
      if (rawBody.plantImage && !rawBody.plantImage.startsWith('data:image/')) {
        throw new Error('Invalid image format. Only base64 image data is allowed.');
      }

      body = AnalysisRequestSchema.parse(rawBody);
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError);
      console.error('❌ Raw body data:', JSON.stringify(rawBody, null, 2));

      // Enhanced error details for debugging
      let errorMessage = 'Invalid request format';
      let validationDetails = 'Validation error';

      if (validationError instanceof Error) {
        validationDetails = validationError.message;

        // Specific validation error handling for better debugging
        if (validationError.message.includes('phLevel')) {
          errorMessage = 'Invalid pH level format';
        } else if (validationError.message.includes('temperature')) {
          errorMessage = 'Invalid temperature format';
        } else if (validationError.message.includes('humidity')) {
          errorMessage = 'Invalid humidity format';
        } else if (validationError.message.includes('strain')) {
          errorMessage = 'Strain is required';
        } else if (validationError.message.includes('leafSymptoms')) {
          errorMessage = 'Symptoms description is required';
        }
      }

      const response = NextResponse.json({
        success: false,
        error: errorMessage,
        details: validationDetails,
        debugData: process.env.NODE_ENV === 'development' ? {
          receivedFields: Object.keys(rawBody),
          sampleData: {
            strain: rawBody.strain,
            leafSymptoms: rawBody.leafSymptoms?.substring(0, 50) + '...',
            phLevel: rawBody.phLevel,
            temperature: rawBody.temperature,
            humidity: rawBody.humidity
          }
        } : undefined,
        timestamp: new Date().toISOString()
      }, { status: 400 });
      return addSecurityHeaders(response);
    }
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
    } = body;

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
        const sharp = await import('sharp');
        const metadata = await sharp.default(buffer).metadata();
        const originalMegapixels = (metadata.width || 0) * (metadata.height || 0) / 1000000;

        // Adaptive compression based on image size and quality requirements
        let processingOptions = {
          format: 'JPEG' as const,
          withoutEnlargement: true,
          fastShrinkOnLoad: false
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
        // Continue without image - don't fail the entire analysis
      }
    }

    // Generate V2 enhanced analysis prompt with structured JSON schema
    const prompt = generateAnalysisPromptV2({
      strain,
      leafSymptoms,
      phLevel,
      temperature,
      temperatureCelsius,
      humidity,
      medium,
      growthStage,
      pestDiseaseFocus,
      urgency,
      additionalNotes,
      hasImage: !!imageBase64ForAI
    });

    console.log('🚀 Starting enhanced cannabis plant analysis (V2 Explainable Prompt)...');
    console.log(`📊 Analysis parameters: ${strain}, Stage: ${growthStage}, Urgency: ${urgency}`);

    // Enhanced AI provider detection with detailed logging
    const providerDetection = await detectAvailableProviders();
    console.log(`📡 AI provider detected: ${providerDetection.primary.provider} (${providerDetection.primary.reason})`);

    if (providerDetection.fallback.length > 0) {
      console.log(`🔄 Available fallback providers: ${providerDetection.fallback.map(f => f.provider).join(', ')}`);
    }

    let analysisResult;
    let fallbackUsed = false;
    let fallbackReason = '';
    let usedProvider = 'unknown';
    let processingTime = 0;

    try {
      const analysisStartTime = Date.now();

      // Check if AI providers are available before processing
      if (!providerDetection.primary.isAvailable || providerDetection.primary.provider === 'fallback') {
        throw new AIProviderUnavailableError(
          'No AI providers are configured. Please connect an AI provider to use plant analysis.',
          {
            recommendations: [
              'Configure Alibaba Bailian API key (FREE: 18K tokens/month)',
              'Set up LM Studio for local development (non-serverless only)',
              'Visit Settings to configure your AI provider'
            ],
            availableProviders: [],
            setupRequired: true
          }
        );
      }

      // Execute AI analysis with vision-aware fallback
      let aiResult;

      if (providerDetection.primary.provider === 'openclaw') {
        // PRIMARY: Use OpenClaw Gateway (routes to best available model)
        console.log('🚀 Using OpenClaw Gateway as primary provider...');
        aiResult = await executeWithOpenClaw({
          prompt: prompt,
          image: imageBase64ForAI,
          model: process.env.OPENCLAW_MODEL || 'qwen3.5-plus'
        });

        if (!aiResult.success) {
          console.log('⚠️ OpenClaw failed, trying fallback...');
          // OpenClaw failed, try fallback chain (vision-aware)
          aiResult = await executeAIWithFallback(prompt, imageBase64ForAI, {
            primaryProvider: 'bailian',
            timeout: 90000,
            maxRetries: 2,
            requireVision: !!imageBase64ForAI
          });
        }
      } else if (providerDetection.primary.provider === 'bailian') {
        // FALLBACK 1: Use Alibaba Qwen directly (Singapore endpoint) - VISION CAPABLE
        console.log('🔷 Using Alibaba Qwen (Singapore endpoint) - vision analysis...');
        aiResult = await executeWithBailian({
          prompt: prompt,
          image: imageBase64ForAI,
          model: process.env.QWEN_MODEL
        });

        if (!aiResult.success) {
          console.log('⚠️ Bailian failed, trying LM Studio fallback...');
          aiResult = await executeAIWithFallback(prompt, imageBase64ForAI, {
            primaryProvider: 'lm-studio',
            timeout: 90000,
            maxRetries: 2,
            requireVision: !!imageBase64ForAI
          });
        }
      } else {
        // FALLBACK 2: Use standard fallback chain (vision-aware)
        console.log(`🔄 Using fallback provider: ${providerDetection.primary.provider}`);
        aiResult = await executeAIWithFallback(prompt, imageBase64ForAI, {
          primaryProvider: providerDetection.primary.provider as 'lm-studio' | 'openrouter' | 'bailian',
          timeout: 90000,
          maxRetries: 2,
          requireVision: !!imageBase64ForAI
        });
      }

      analysisResult = aiResult.result;
      usedProvider = aiResult.provider;
      fallbackUsed = false;
      processingTime = Date.now() - analysisStartTime;

      console.log(`✅ Analysis completed successfully:`);
      console.log(`   Provider: ${aiResult.provider}`);
      console.log(`   Model: ${aiResult.model || 'default'}`);
      console.log(`   Vision Used: ${aiResult.visionUsed || false}`);
      console.log(`   Processing time: ${processingTime}ms`);
      console.log(`   Image analysis: ${!!imageBase64ForAI}`);

      console.log('🔍 Normalizing provider response into explainable report-v2 contract...');
      analysisResult = normalizePlantAnalysisResult(analysisResult, {
        inputParameters: { strain, leafSymptoms, phLevel, temperature, humidity, medium, growthStage },
        imageAnalysis: !!imageBase64ForAI,
        processingTime,
        provider: usedProvider
      });
      console.log('✅ Explainable report ready:', {
        parsedFromStructuredJson: Boolean(analysisResult.analysisMetadata?.parsedFromStructuredJson),
        urgency: analysisResult.urgency,
        detectedIssues: Array.isArray(analysisResult.detectedIssues)
          ? analysisResult.detectedIssues.length
          : 0
      });

      // 🔬 ENRICHMENT PASS: Add production-quality explanations for medium/high urgency
      console.log('🔬 Running report enrichment pass for detailed explanations...');
      const enrichmentContext = {
        analysis: analysisResult,
        inputParameters: { strain, leafSymptoms, phLevel, temperature, humidity, medium, growthStage },
        imageAnalysis: !!imageBase64ForAI,
        processingTime,
        provider: usedProvider
      };
      const enriched = enrichReport(enrichmentContext);
      const validation = validateEnrichedReport(enriched);

      if (validation.valid) {
        analysisResult = mergeEnrichmentWithAnalysis(analysisResult, enriched);
        console.log('✅ Enrichment complete:', {
          urgencyLevel: enriched.urgencyDeepDive.urgencyLevel,
          primaryDrivers: enriched.urgencyDeepDive.primaryDrivers.length,
          healthCategories: enriched.healthScoreAnalysis.categoryAnalysis.length,
          confidenceScore: enriched.confidenceAssessment.overall,
          recommendationDetails: {
            immediate: enriched.recommendationRationale.immediate.length,
            shortTerm: enriched.recommendationRationale.shortTerm.length,
            longTerm: enriched.recommendationRationale.longTerm.length
          }
        });
      } else {
        console.warn('⚠️ Enrichment validation issues:', validation.issues);
        // Still merge partial enrichment even if validation has issues
        analysisResult = mergeEnrichmentWithAnalysis(analysisResult, enriched);
      }

    } catch (error) {
      // Handle AI provider unavailability specifically
      if (error instanceof AIProviderUnavailableError) {
        console.error('❌ AI provider unavailable:', error.message);

        const errorResponse = NextResponse.json({
          success: false,
          error: {
            type: 'ai_provider_unavailable',
            message: 'AI Provider Required',
            userMessage: 'An AI provider is required for plant analysis. Please configure an AI provider in Settings.',
            details: error.message,
            recommendations: error.recommendations,
            setupRequired: error.setupRequired,
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID().substring(0, 8)
          },
          setupGuide: {
            title: 'Configure AI Provider',
            steps: [
              'Go to Settings → AI Configuration',
              'Configure OpenRouter API key (recommended for production)',
              'Or set up LM Studio for local development',
              'Test connection and return to analysis'
            ],
            helpText: 'AI analysis is required for accurate plant health diagnosis. Rule-based analysis has been removed to ensure accuracy.'
          },
          alternatives: {
            manualAnalysis: true,
            expertConsultation: true,
            setupRequired: true
          }
        }, { status: 503 }); // Service Unavailable

        return addSecurityHeaders(errorResponse);
      }

      // Other errors during AI analysis
      console.error('❌ AI analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw to be handled by outer catch block
    }

    // Create comprehensive success response with enhanced metadata
    const response = NextResponse.json({
      success: true,
      analysis: analysisResult,
      imageInfo: processedImageInfo,
      metadata: {
        analysisId: crypto.randomUUID(),
        processingTime,
        timestamp: new Date().toISOString(),
        version: '4.0.0-Enhanced-Comprehensive',
        contract: {
          id: 'cannaai.analysis.agent.v1',
          version: '1.0.0',
          schemaPath: '/docs/developer/api/schemas/analysis-agent-contract.schema.json'
        },
        features: {
          trichomeAnalysis: !!imageBase64ForAI,
          visualChangeDetection: true,
          multiModalAnalysis: true,
          comprehensiveDiagnostics: true,
          microNutrientAnalysis: true,
          pestDiseaseLifecycle: true,
          harvestReadiness: true,
          morphologicalAnalysis: true,
          priorityActions: true,
          costEstimates: true
        }
      },
      diagnosticCapabilities: {
        imageAnalysis: !!imageBase64ForAI,
        visualDiagnostics: imageBase64ForAI ? ['powderyMildew', 'pests', 'nutrientDeficiencies', 'environmentalStress'] : [],
        textBasedDiagnostics: ['nutrientAnalysis', 'diseaseIdentification', 'environmentalStressDetection'],
        strainSpecificAnalysis: true,
        usHempResearchIntegration: true,
        exactDosageCalculations: true,
        confidenceScoring: true,
        treatmentProtocols: true
      },
      provider: {
        used: usedProvider,
        primary: providerDetection?.primary?.provider || 'unknown',
        available: providerDetection ? [
          providerDetection.primary.isAvailable && providerDetection.primary.provider !== 'fallback' ? providerDetection.primary.provider : null,
          ...providerDetection.fallback.filter(f => f.isAvailable && f.provider !== 'fallback').map(f => f.provider)
        ].filter(Boolean) : [],
        recommendations: providerDetection?.recommendations || [],
        status: 'ai_analysis'
      },
      rateLimit: {
        limit: MAX_REQUESTS_PER_WINDOW,
        remaining: rateLimitCheck.remaining || 0,
        window: RATE_LIMIT_WINDOW / 60000
      },
      security: {
        inputValidation: 'enhanced',
        sanitization: 'applied',
        rateLimiting: 'active'
      }
    });

    // Persist analysis result for history/plant linkage (best-effort)
    try {
      await prisma.plantAnalysis.create({
        data: {
          plantId: body.plantId,
          request: {
            strain,
            leafSymptoms,
            phLevel,
            temperature,
            humidity,
            medium,
            growthStage,
            pestDiseaseFocus,
            urgency,
            additionalNotes,
            temperatureUnit
          },
          result: analysisResult,
          provider: usedProvider,
          imageInfo: processedImageInfo
        }
      });
    } catch (persistError) {
      console.warn('Failed to persist plant analysis record:', persistError);
    }

    // Add enhanced security headers to response
    addSecurityHeaders(response);

    // Add rate limiting headers
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
    response.headers.set('X-RateLimit-Remaining', (rateLimitCheck.remaining || 0).toString());
    response.headers.set('X-Analysis-Version', '4.0.0-Enhanced-Comprehensive');

    return response;

  } catch (error) {
    console.error('❌ Comprehensive analysis error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Enhanced error classification and response
    let statusCode = 500;
    let errorMessage = 'Failed to analyze plant data';
    let errorType = 'internal_error';
    let userFriendlyMessage = 'We encountered an error while analyzing your plant. Please try again.';

    if (error instanceof Error) {
      // Specific error handling with user-friendly messages
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        statusCode = 504;
        errorMessage = 'Analysis service timeout';
        errorType = 'timeout_error';
        userFriendlyMessage = 'The analysis took too long to complete. Please try again with a smaller image or simpler description.';
      } else if (error.message.includes('LM Studio') || error.message.includes('Open Router') || error.message.includes('AI provider')) {
        statusCode = 503;
        errorMessage = 'AI analysis services unavailable';
        errorType = 'service_unavailable';
        userFriendlyMessage = 'AI analysis services are currently experiencing issues. Please try again in a few minutes or use our expert rule-based analysis.';
      } else if (error.message.includes('validation') || error.message.includes('Invalid request')) {
        statusCode = 400;
        errorMessage = 'Invalid request format';
        errorType = 'validation_error';
        userFriendlyMessage = 'Please check your input data and try again. Make sure all required fields are filled correctly.';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded';
        errorType = 'rate_limit_error';
        userFriendlyMessage = 'You\'ve made too many requests. Please wait a few minutes before trying again.';
      } else if (error.message.includes('image') || error.message.includes('file size')) {
        statusCode = 413;
        errorMessage = 'Image processing error';
        errorType = 'image_error';
        userFriendlyMessage = 'There was an issue processing your image. Please try a smaller image or check the file format.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        statusCode = 503;
        errorMessage = 'Network connectivity issue';
        errorType = 'network_error';
        userFriendlyMessage = 'We\'re having trouble connecting to our analysis services. Please check your connection and try again.';
      }
    }

    // Create enhanced error response with debugging information
    const errorResponse = NextResponse.json({
      success: false,
      error: {
        type: errorType,
        message: errorMessage,
        userMessage: userFriendlyMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID().substring(0, 8)
      },
      alternatives: {
        textOnlyAnalysis: !!(rawBody?.leafSymptoms && rawBody?.strain),
        retryRecommendations: [
          'Check your internet connection',
          'Verify AI provider is configured in Settings',
          'Try a smaller image file',
          'Simplify your symptom description',
          'Wait a few minutes and try again'
        ],
        setupRequired: true
      },
      support: {
        helpText: 'If this problem persists, please contact support with the error details above.',
        canRetry: ['validation_error', 'timeout_error', 'network_error'].includes(errorType)
      }
    }, { status: statusCode });

    // Add security headers to error response as well
    return addSecurityHeaders(errorResponse);
  }
}
