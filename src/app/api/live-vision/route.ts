import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, createAPIResponse, createAPIError } from '@/lib/security';
import { base64ToBuffer, processImageForVisionModel } from '@/lib/image';
import { analyzePlantHealth } from '@/lib/ai';

interface LiveVisionRequest {
  imageData: string; // Base64 image data
  deviceInfo: {
    deviceId: string;
    label: string;
    mode: 'webcam' | 'microscope';
    resolution: { width: number; height: number };
    timestamp: string;
    format: string;
  };
  plantContext?: {
    strain?: string;
    growthStage?: string;
    medium?: string;
    environment?: {
      temperature?: number;
      humidity?: number;
      phLevel?: number;
    };
    previousAnalysis?: string; // For tracking changes over time
  };
  analysisOptions?: {
    focusArea?: 'general' | 'leaves' | 'stems' | 'roots' | 'flowers';
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    enableChangeDetection?: boolean;
    enableHealthScore?: boolean;
    enableRecommendations?: boolean;
  };
}

export async function POST(request: NextRequest) {
  return withSecurity(request, async (req, context) => {
    try {
      const body = await request.json();
      const { imageData, deviceInfo, plantContext = {}, analysisOptions = {} } = body as LiveVisionRequest;

      if (!imageData) {
        return NextResponse.json(
          createAPIError('Image data is required', 400)
        );
      }

      if (!deviceInfo || !deviceInfo.deviceId) {
        return NextResponse.json(
          createAPIError('Device information is required', 400)
        );
      }

      // Validate base64 image data
      let processedImageInfo;
      try {
        const { buffer } = base64ToBuffer(imageData);

        // Enhanced processing for live vision - prioritize speed and quality
        processedImageInfo = await processImageForVisionModel(buffer, {
          targetSize: 1024, // Slightly smaller for faster processing
          quality: 90, // High quality for accurate analysis
          format: 'JPEG',
          optimizeForSpeed: true // Special flag for live processing
        });
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        return NextResponse.json(
          createAPIError(`Image processing failed: ${imageError.message}`, 400)
        );
      }

      // Prepare analysis context with live vision specifics
      const analysisContext = {
        ...plantContext,
        liveVision: {
          deviceId: deviceInfo.deviceId,
          deviceMode: deviceInfo.mode,
          deviceLabel: deviceInfo.label,
          resolution: deviceInfo.resolution,
          captureTime: deviceInfo.timestamp,
          isLiveCapture: true,
          imageFormat: deviceInfo.format
        },
        analysisOptions: {
          focusArea: analysisOptions.focusArea || 'general',
          urgencyLevel: analysisOptions.urgencyLevel || 'medium',
          enableChangeDetection: analysisOptions.enableChangeDetection ?? true,
          enableHealthScore: analysisOptions.enableHealthScore ?? true,
          enableRecommendations: analysisOptions.enableRecommendations ?? true,
          fastProcessing: true // Optimize for real-time analysis
        }
      };

      // Perform AI analysis with live vision optimizations
      const analysisResult = await analyzePlantHealth(
        processedImageInfo.buffer,
        processedImageInfo.base64,
        analysisContext
      );

      // Enhance response with live vision specific data
      const liveVisionResponse = {
        success: true,
        analysis: {
          ...analysisResult,
          captureInfo: {
            device: {
              id: deviceInfo.deviceId,
              label: deviceInfo.label,
              mode: deviceInfo.mode,
              type: deviceInfo.mode === 'microscope' ? 'USB Microscope' : 'USB Webcam'
            },
            resolution: deviceInfo.resolution,
            captureTime: deviceInfo.timestamp,
            processingTime: Date.now() - new Date(deviceInfo.timestamp).getTime(),
            imageFormat: deviceInfo.format
          },
          liveAnalysis: {
            isRealtime: true,
            confidence: analysisResult.confidence || 0.85,
            processingLatency: 'fast', // fast, medium, slow
            nextCaptureSuggestion: getNextCaptureSuggestion(analysisResult, analysisContext)
          }
        },
        timestamp: new Date().toISOString(),
        requestId: context?.requestId || crypto.randomUUID()
      };

      return NextResponse.json(liveVisionResponse);

    } catch (error: any) {
      console.error('Live vision analysis error:', error);

      // Determine if it's a specific type of error
      let errorMessage = 'Live vision analysis failed';
      let statusCode = 500;

      if (error.message?.includes('GPU')) {
        errorMessage = 'GPU processing unavailable, using CPU processing';
        statusCode = 503; // Service Unavailable
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Analysis rate limit exceeded, please try again in a moment';
        statusCode = 429; // Too Many Requests
      } else if (error.message?.includes('connection')) {
        errorMessage = 'Unable to connect to AI analysis service';
        statusCode = 503; // Service Unavailable
      }

      return NextResponse.json(
        createAPIError(errorMessage, statusCode, error.message),
        { status: statusCode }
      );
    }
  });
}

// Helper function to suggest next capture based on analysis
function getNextCaptureSuggestion(analysis: any, context: any) {
  const suggestions = [];

  // Based on urgency level
  const urgency = context.analysisOptions?.urgencyLevel || 'medium';

  if (urgency === 'critical') {
    suggestions.push({
      action: 'immediate_capture',
      interval: 30, // seconds
      reason: 'Critical issue detected - continuous monitoring recommended'
    });
  } else if (urgency === 'high') {
    suggestions.push({
      action: 'frequent_capture',
      interval: 120, // 2 minutes
      reason: 'Significant issues found - regular monitoring advised'
    });
  } else if (analysis.healthScore < 0.7) {
    suggestions.push({
      action: 'monitor_closely',
      interval: 300, // 5 minutes
      reason: 'Plant health below optimal - closer monitoring needed'
    });
  } else {
    suggestions.push({
      action: 'routine_check',
      interval: 1800, // 30 minutes
      reason: 'Plant appears healthy - routine monitoring sufficient'
    });
  }

  // Based on device mode
  if (context.liveVision?.deviceMode === 'microscope') {
    suggestions.push({
      action: 'detailed_inspection',
      focus: 'Consider checking different areas for detailed analysis',
      reason: 'Microscope mode allows for detailed tissue-level inspection'
    });
  }

  return suggestions;
}

// GET endpoint for live vision status and configuration
export async function GET(request: NextRequest) {
  return withSecurity(request, async () => {
    try {
      // Get available camera devices and capabilities
      const capabilities = {
        supportedDevices: [
          {
            type: 'webcam',
            description: 'Standard USB webcams and built-in cameras',
            supportedResolutions: ['640x480', '1280x720', '1920x1080'],
            supportedFormats: ['JPEG', 'PNG']
          },
          {
            type: 'microscope',
            description: 'USB digital microscopes',
            supportedResolutions: ['640x480', '1280x720', '1920x1080', '2592x1944'],
            supportedFormats: ['JPEG', 'PNG'],
            recommendedBrands: ['Dino-Lite', 'Jiusion', 'Plugable', 'Koolertron']
          }
        ],
        analysisOptions: {
          focusAreas: ['general', 'leaves', 'stems', 'roots', 'flowers'],
          urgencyLevels: ['low', 'medium', 'high', 'critical'],
          features: [
            'Real-time processing',
            'Change detection',
            'Health scoring',
            'Disease identification',
            'Nutrient deficiency analysis',
            'Growth monitoring'
          ]
        },
        performance: {
          maxCaptureRate: '30 FPS',
          typicalAnalysisTime: '2-5 seconds',
          recommendedIntervals: {
            critical: '30 seconds',
            high: '2 minutes',
            medium: '15 minutes',
            low: '1 hour'
          }
        }
      };

      return NextResponse.json({
        success: true,
        capabilities,
        status: 'active',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Live vision status error:', error);
      return NextResponse.json(
        createAPIError('Failed to get live vision status', 500, error.message),
        { status: 500 }
      );
    }
  });
}