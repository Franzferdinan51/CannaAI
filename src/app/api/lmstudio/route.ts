
/**
 * API Route for LM Studio Integration
 * Handles communication between CannaAI and local LM Studio models
 * Enhanced for serverless environments with proper fallback handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLMStudioApiKey, getLMStudioEndpointCandidates } from '@/lib/ai-provider-lmstudio';
import { isServerless, isDevelopment } from '@/lib/ai-provider-detection';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// LM Studio configuration
const LM_STUDIO_URL = (process.env.LM_STUDIO_URL || process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234')
  .replace(/\/v1\/?$/, '')
  .replace(/\/$/, '');
const LM_STUDIO_TIMEOUT = parseInt(process.env.LM_STUDIO_TIMEOUT || '30000');

function lmStudioHeaders(includeJson = false): Record<string, string> {
  const apiKey = getLMStudioApiKey();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
}

function normalizeImageUrl(image: unknown): string | undefined {
  if (typeof image !== 'string') return undefined;
  const value = image.trim();
  if (!value) return undefined;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

async function discoverVisionModelIds(baseUrl = LM_STUDIO_URL): Promise<Set<string> | null> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/models`, {
      signal: AbortSignal.timeout(3000),
      headers: lmStudioHeaders(),
    });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => ({}));
    if (!Array.isArray(payload?.models)) return null;

    const modelsWithMetadata = payload.models.filter((model: any) => (
      typeof model?.capabilities?.vision === 'boolean'
    ));
    if (modelsWithMetadata.length === 0) return null;

    const visionIds = new Set<string>();
    for (const model of modelsWithMetadata) {
      if (model.capabilities.vision !== true) continue;
      for (const id of [model.key, model.id]) {
        if (typeof id === 'string' && id.trim()) visionIds.add(id.trim());
      }
      for (const instance of model.loaded_instances || []) {
        if (typeof instance?.id === 'string' && instance.id.trim()) visionIds.add(instance.id.trim());
      }
    }
    return visionIds;
  } catch {
    return null;
  }
}

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

    // Check if LM Studio is running with timeout and use its model catalog as
    // the source of truth. LM Studio does not accept the OpenAI-style
    // `auto` sentinel on every release; chat completions need a real model ID.
    console.log('🔍 Checking LM Studio availability at', LM_STUDIO_URL);
    let advertisedModels: Array<{ id?: string }> = [];
    let activeLMStudioUrl = LM_STUDIO_URL;
    let lastHealthError = 'connection refused';
    let discovered = false;

    for (const candidate of getLMStudioEndpointCandidates()) {
      try {
        const healthCheck = await fetch(`${candidate}/v1/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          headers: lmStudioHeaders()
        });
        if (!healthCheck.ok) {
          lastHealthError = `LM Studio health check failed: ${healthCheck.status} ${healthCheck.statusText}`;
          continue;
        }

        const modelsData = await healthCheck.json();
        advertisedModels = Array.isArray(modelsData?.data) ? modelsData.data : [];
        activeLMStudioUrl = candidate;
        discovered = true;
        console.log(`✅ LM Studio is running with ${advertisedModels.length} models available at ${candidate}`);
        break;
      } catch (healthError) {
        lastHealthError = healthError instanceof Error ? healthError.message : lastHealthError;
      }
    }

    if (!discovered) {

      return NextResponse.json({
        success: false,
        error: 'LM Studio is not available',
        message: lastHealthError,
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
    const normalizedImage = normalizeImageUrl(image);
    if (normalizedImage) {
      userMessage.content = [
        {
          type: 'text',
          text: prompt
        },
        {
          type: 'image_url',
          image_url: {
            url: normalizedImage
          }
        }
      ];
    }

    messages.push(userMessage);

    const requestedModel = typeof modelId === 'string' ? modelId.trim() : '';
    const chatModels = advertisedModels.filter(model => (
      typeof model.id === 'string' && !model.id.toLowerCase().includes('embedding')
    ));
    if (requestedModel && chatModels.length > 0 && !chatModels.some(model => model.id === requestedModel)) {
      return NextResponse.json({
        success: false,
        error: `LM Studio model "${requestedModel}" is not currently advertised`,
        code: 'LM_STUDIO_MODEL_NOT_FOUND',
        availableModels: chatModels.map(model => model.id),
      }, { status: 503 });
    }
    const selectedModel = requestedModel || chatModels[0]?.id;

    if (!selectedModel) {
      return NextResponse.json({
        success: false,
        error: 'LM Studio has no runnable chat model available',
        message: 'Load a chat model in LM Studio and retry.',
        modelCount: advertisedModels.length,
      }, { status: 503 });
    }

    if (normalizedImage) {
      const visionModelIds = await discoverVisionModelIds(activeLMStudioUrl);
      if (visionModelIds && !visionModelIds.has(selectedModel)) {
        return NextResponse.json({
          success: false,
          error: `LM Studio model "${selectedModel}" is not advertised as vision-capable`,
          code: 'LM_STUDIO_MODEL_NOT_VISION_CAPABLE',
          model: selectedModel,
          visionModels: Array.from(visionModelIds),
        }, { status: 503 });
      }
    }

    // Call LM Studio API with extended timeout
    console.log('📡 Sending request to LM Studio...');
    const lmStudioController = new AbortController();
    const lmStudioTimeoutId = setTimeout(() => lmStudioController.abort(), LM_STUDIO_TIMEOUT);

    try {
      const lmStudioResponse = await fetch(`${activeLMStudioUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: lmStudioHeaders(true),
        body: JSON.stringify({
          model: selectedModel,
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
        content: result.choices?.[0]?.message?.content
          || result.choices?.[0]?.message?.reasoning_content
          || '',
        model: result.model || selectedModel,
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

    let response: Response | undefined;
    let activeLMStudioUrl = LM_STUDIO_URL;
    let lastHealthError = 'LM Studio is not responding';
    for (const candidate of getLMStudioEndpointCandidates()) {
      try {
        const candidateResponse = await fetch(`${candidate}/v1/models`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          headers: lmStudioHeaders()
        });
        if (candidateResponse.ok) {
          response = candidateResponse;
          activeLMStudioUrl = candidate;
          break;
        }
        lastHealthError = `HTTP ${candidateResponse.status}: ${candidateResponse.statusText}`;
      } catch (healthError) {
        lastHealthError = healthError instanceof Error ? healthError.message : lastHealthError;
      }
    }

    if (!response) {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        provider: 'lmstudio-local',
        error: 'LM Studio is not running or not responding',
        details: lastHealthError,
        troubleshooting: [
          'Start LM Studio application',
          'Check if API server is enabled in LM Studio settings',
          'Verify LM Studio is running on port 1234',
          'Check for firewall or antivirus blocking the connection'
        ],
        environment: {
          isDevelopment,
          lmStudioUrl: activeLMStudioUrl
        },
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    const models = await response.json();
    const modelList = Array.isArray(models?.data) ? models.data : [];
    const chatModels = modelList.filter((model: any) => {
      const id = String(model?.id || '').toLowerCase();
      return id && !id.includes('embedding') && !id.includes('embed-') && !id.endsWith('-embed');
    });
    console.log(`✅ LM Studio reachable with ${modelList.length} models (${chatModels.length} chat models)`);

    if (chatModels.length === 0) {
      return NextResponse.json({
        success: false,
        status: 'degraded',
        provider: 'lmstudio-local',
        error: 'LM Studio is reachable but no runnable chat model is available',
        message: 'Load a chat model in LM Studio and retry.',
        models: modelList,
        modelCount: modelList.length,
        environment: {
          isDevelopment,
          isServerless: false,
          lmStudioUrl: activeLMStudioUrl
        },
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      provider: 'lmstudio-local',
      models: modelList,
      modelCount: modelList.length,
      environment: {
        isDevelopment,
        isServerless: false,
        lmStudioUrl: activeLMStudioUrl
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
