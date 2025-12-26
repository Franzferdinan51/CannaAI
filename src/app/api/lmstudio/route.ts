
/**
 * API Route for LM Studio Integration
 * Handles communication between CannaAI and local LM Studio models
 * Enhanced for serverless environments with proper fallback handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { isServerless, isDevelopment } from '@/lib/ai-provider-detection';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// LM Studio configuration
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';
const LM_STUDIO_TIMEOUT = parseInt(process.env.LM_STUDIO_TIMEOUT || '30000');

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI analysis is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Check if we're in a serverless environment where LM Studio won't work
  if (isServerless) {
    return NextResponse.json({
      success: false,
      error: 'LM Studio is not supported in serverless environments',
      message: 'LM Studio requires a persistent server environment and cannot run on serverless platforms like Netlify or Vercel.',
      environment: {
        isServerless: true,
        platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Unknown serverless',
        recommendation: 'Use OpenRouter API for cloud-based AI analysis in serverless deployments'
      },
      alternatives: [
        {
          provider: 'OpenRouter',
          description: 'Cloud-based AI API that works everywhere',
          setup: 'Set OPENROUTER_API_KEY environment variable'
        },
        {
          provider: 'Local Development',
          description: 'Use LM Studio in local development only',
          setup: 'Run this app locally with `npm run dev`'
        }
      ],
      clientSide: true,
      buildMode: 'serverless'
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { prompt, image, systemPrompt, temperature, maxTokens, modelId } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Check if LM Studio is running with timeout
    console.log('🔍 Checking LM Studio availability at', LM_STUDIO_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second health check timeout

    try {
      const healthCheck = await fetch(`${LM_STUDIO_URL}/v1/models`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.LM_STUDIO_API_KEY && { 'Authorization': `Bearer ${process.env.LM_STUDIO_API_KEY}` })
        }
      });

      clearTimeout(timeoutId);

      if (!healthCheck.ok) {
        throw new Error(`LM Studio health check failed: ${healthCheck.status} ${healthCheck.statusText}`);
      }

      const modelsData = await healthCheck.json();
      console.log(`✅ LM Studio is running with ${modelsData.data?.length || 0} models available`);

    } catch (healthError) {
      clearTimeout(timeoutId);
      const errorMessage = healthError instanceof Error ? healthError.message : 'Unknown error';

      return NextResponse.json({
        success: false,
        error: 'LM Studio is not available',
        message: errorMessage,
        troubleshooting: [
          'Make sure LM Studio application is running on your computer',
          'Verify LM Studio is running on the correct port (default: 1234)',
          'Check if LM Studio API server is enabled in LM Studio settings',
          'Ensure no firewall is blocking the connection'
        ],
        environment: {
          isDevelopment,
          lmStudioUrl: LM_STUDIO_URL,
          recommendation: isDevelopment
            ? 'Start LM Studio locally for development'
            : 'Configure OpenRouter API for production deployments'
        }
      }, { status: 503 });
    }

    // Prepare the request for LM Studio
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    const userMessage = {
      role: 'user',
      content: prompt
    };

    // Add image if provided
    if (image) {
      userMessage.content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: image
          }
        }
      ];
    }

    messages.push(userMessage);

    // Call LM Studio API with extended timeout
    console.log('📡 Sending request to LM Studio...');
    const lmStudioController = new AbortController();
    const lmStudioTimeoutId = setTimeout(() => lmStudioController.abort(), LM_STUDIO_TIMEOUT);

    try {
      const lmStudioResponse = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.LM_STUDIO_API_KEY && { 'Authorization': `Bearer ${process.env.LM_STUDIO_API_KEY}` })
        },
        body: JSON.stringify({
          model: modelId || 'auto', // Let LM Studio choose the best model
          messages,
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 2000,
          stream: false
        }),
        signal: lmStudioController.signal
      });

      clearTimeout(lmStudioTimeoutId);

      if (!lmStudioResponse.ok) {
        const errorText = await lmStudioResponse.text();
        throw new Error(`LM Studio API error: ${lmStudioResponse.status} - ${errorText}`);
      }

      const result = await lmStudioResponse.json();
      console.log('✅ LM Studio response received');

      // Extract and return the response
      const response = {
        success: true,
        content: result.choices?.[0]?.message?.content,
        model: result.model || modelId || 'unknown',
        usage: result.usage,
        timestamp: new Date().toISOString(),
        provider: 'lmstudio-local',
        environment: {
          isDevelopment,
          isServerless: false,
          platform: 'local'
        }
      };

      return NextResponse.json(response);

    } catch (apiError) {
      clearTimeout(lmStudioTimeoutId);
      throw apiError;
    }

  } catch (error) {
    console.error('❌ LM Studio API error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('AbortError');

    return NextResponse.json({
      success: false,
      error: 'LM Studio communication failed',
      message: errorMessage,
      isTimeout,
      troubleshooting: [
        'Check if LM Studio is still running',
        'Verify the model is loaded in LM Studio',
        'Try restarting LM Studio',
        'Check system resources (LM Studio may need more RAM/VRAM)',
        'Verify no other applications are blocking port 1234'
      ],
      alternatives: [
        {
          provider: 'OpenRouter',
          description: 'Use cloud-based AI as fallback',
          setup: 'Configure OPENROUTER_API_KEY environment variable'
        }
      ]
    }, { status: isTimeout ? 504 : 500 });
  }
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'This API is handled client-side in static export mode.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // In serverless environments, immediately return appropriate response
  if (isServerless) {
    return NextResponse.json({
      success: false,
      status: 'unavailable',
      provider: 'lmstudio-local',
      error: 'LM Studio is not supported in serverless environments',
      message: 'LM Studio requires a persistent server environment and cannot run on serverless platforms.',
      environment: {
        isServerless: true,
        platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Unknown serverless'
      },
      recommendations: [
        'Use OpenRouter API for production deployments',
        'Test with LM Studio in local development environment',
        'Deploy to a VPS or dedicated server for LM Studio support'
      ],
      alternatives: [
        {
          name: 'OpenRouter',
          description: 'Cloud-based AI API that works in serverless environments',
          setupInstructions: [
            'Get API key from https://openrouter.ai/keys',
            'Set OPENROUTER_API_KEY environment variable',
            'Choose a model for your needs'
          ]
        }
      ]
    }, { status: 503 });
  }

  // Health check and model listing endpoint for local development
  try {
    console.log('🔍 Performing LM Studio health check...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

    const response = await fetch(`${LM_STUDIO_URL}/v1/models`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LM_STUDIO_API_KEY && { 'Authorization': `Bearer ${process.env.LM_STUDIO_API_KEY}` })
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        provider: 'lmstudio-local',
        error: 'LM Studio is not running or not responding',
        details: `HTTP ${response.status}: ${response.statusText}`,
        troubleshooting: [
          'Start LM Studio application',
          'Check if API server is enabled in LM Studio settings',
          'Verify LM Studio is running on port 1234',
          'Check for firewall or antivirus blocking the connection'
        ],
        environment: {
          isDevelopment,
          lmStudioUrl: LM_STUDIO_URL
        },
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    const models = await response.json();
    console.log(`✅ LM Studio healthy with ${models.data?.length || 0} models`);

    return NextResponse.json({
      success: true,
      status: 'healthy',
      provider: 'lmstudio-local',
      models: models.data || [],
      modelCount: models.data?.length || 0,
      environment: {
        isDevelopment,
        isServerless: false,
        lmStudioUrl: LM_STUDIO_URL
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ LM Studio health check failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('AbortError');

    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      provider: 'lmstudio-local',
      error: 'LM Studio health check failed',
      message: errorMessage,
      isTimeout,
      troubleshooting: [
        'Ensure LM Studio application is running',
        'Check that LM Studio API server is enabled',
        'Verify LM Studio is accessible at http://localhost:1234',
        'Try restarting LM Studio',
        'Check if another application is using port 1234'
      ],
      environment: {
        isDevelopment,
        lmStudioUrl: LM_STUDIO_URL
      },
      timestamp: new Date().toISOString()
    }, { status: isTimeout ? 504 : 503 });
  }
}
