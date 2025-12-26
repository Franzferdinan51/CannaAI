import { NextRequest, NextResponse } from 'next/server';
import { detectAvailableProviders, getProviderConfig, executeAIWithFallback, AIProviderUnavailableError } from '@/lib/ai-provider-detection';
import { getAgentEvolverClient } from '@/lib/agent-evolver';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Get contextual prompt based on agentic mode
function getContextualPrompt(mode: string, context: any, sensorData: any, message: string): string {
  const baseContext = `Current page context: ${context?.title || 'CannaAI Pro'} (${context?.page || 'unknown'})
Page description: ${context?.description || 'Cannabis cultivation management system'}

Current environmental conditions:
- Temperature: ${sensorData?.temperature ? Math.round((sensorData.temperature * 9/5) + 32) : 'N/A'}°F (${sensorData?.temperature || 'N/A'}°C)
- Humidity: ${sensorData?.humidity || 'N/A'}%
- pH Level: ${sensorData?.ph || 'N/A'}
- Soil Moisture: ${sensorData?.soilMoisture || 'N/A'}%
- Light Intensity: ${sensorData?.lightIntensity || 'N/A'} μmol
- EC Level: ${sensorData?.ec || 'N/A'} mS/cm`;

  switch (mode) {
    case 'thinking':
      return `You are a deep-thinking cannabis cultivation expert. Use analytical reasoning and provide comprehensive, well-structured responses.

${baseContext}

User question: ${message}

Please provide a thorough analysis with your reasoning process clearly explained.`;

    default:
      return `You are CultivAI Assistant, an expert cannabis cultivation AI. You provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.

${baseContext}

User question: ${message}

Please provide a helpful, concise response. If the user asks about specific readings, reference the current sensor data. Consider the current page context to provide more relevant advice.`;
  }
}

export async function POST(request: NextRequest) {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { message, mode = 'chat', context, sensorData } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    console.log('💬 Chat request received, detecting AI providers...');

    // Detect available AI providers
    const providerDetection = await detectAvailableProviders();
    console.log(`📡 Primary chat provider: ${providerDetection.primary.provider} (${providerDetection.primary.reason})`);

    // Check if AI providers are available before processing
    if (!providerDetection.primary.isAvailable || providerDetection.primary.provider === 'fallback') {
      throw new AIProviderUnavailableError(
        'No AI providers are configured. Please connect an AI provider to use the chat assistant.',
        {
          recommendations: [
            'Configure OpenRouter API key for cloud-based AI chat',
            'Set up LM Studio for local development (non-serverless only)',
            'Visit Settings to configure your AI provider'
          ],
          availableProviders: [],
          setupRequired: true
        }
      );
    }

    // Get contextual prompt based on mode and current data
    const contextPrompt = getContextualPrompt(mode, context || {}, sensorData || {}, message);

    try {
      let chatResult;
      let usedProvider = 'agent-evolver';
      let evolutionMetrics = null;
      let agentLearning = [];
      let fallbackUsed = false;
      let fallbackReason = '';

      // Try AgentEvolver enhanced chat first
      try {
        const evolverClient = getAgentEvolverClient();
        if (evolverClient && evolverClient.getConfig().enabled) {
          console.log('🤖 Attempting AgentEvolver enhanced chat...');
          const agentEvolverResult = await evolverClient.chatWithFallback({
            message: message,
            context: { ...context, sensorData },
            mode: mode
          });

          if (agentEvolverResult.provider === 'agent-evolver') {
            chatResult = {
              content: agentEvolverResult.response,
              model: 'AgentEvolver-Enhanced'
            };
            usedProvider = 'agent-evolver';
            evolutionMetrics = agentEvolverResult.evolutionMetrics;
            agentLearning = agentEvolverResult.agentLearning || [];
            fallbackUsed = agentEvolverResult.fallback?.used || false;
            fallbackReason = agentEvolverResult.fallback?.reason || '';
            console.log('🤖 AgentEvolver chat completed successfully');
          } else {
            throw new Error('AgentEvolver returned fallback response - using traditional AI');
          }
        } else {
          throw new Error('AgentEvolver client not available - using traditional AI');
        }
      } catch (agentEvolverError) {
        console.warn('⚠️ AgentEvolver chat failed, using traditional AI providers:', agentEvolverError instanceof Error ? agentEvolverError.message : 'Unknown error');

        // Fallback to traditional AI providers
        const aiResult = await executeAIWithFallback(contextPrompt, undefined, {
          primaryProvider: providerDetection.primary.provider === 'fallback' ? undefined : providerDetection.primary.provider as 'lm-studio' | 'openrouter',
          timeout: 45000, // 45 second timeout for chat
          maxRetries: 1
        });

        chatResult = aiResult.result;
        usedProvider = aiResult.provider;
        fallbackUsed = aiResult.provider === 'fallback';
        fallbackReason = aiResult.fallbackReason || '';
        console.log(`✅ Traditional AI chat completed using ${aiResult.provider} in ${aiResult.processingTime}ms`);
      }

      const totalTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        response: chatResult.content || typeof chatResult === 'string' ? chatResult : 'Chat response generated successfully',
        model: chatResult.model || 'unknown',
        provider: usedProvider,
        usage: chatResult.usage,
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        mode: mode,
        buildMode: 'server',
        fallback: {
          used: fallbackUsed,
          reason: fallbackReason,
          recommendations: providerDetection.recommendations
        },
        providerInfo: {
          primary: providerDetection.primary.provider,
          available: [
            providerDetection.primary.isAvailable ? providerDetection.primary.provider : null,
            ...providerDetection.fallback.filter(f => f.isAvailable).map(f => f.provider)
          ].filter(Boolean)
        },
        // AgentEvolver specific enhancements
        agentEvolver: usedProvider === 'agent-evolver' ? {
          enabled: true,
          evolutionMetrics: evolutionMetrics,
          agentLearning: agentLearning,
          selfEvolutionCapabilities: {
            selfQuestioning: true,
            selfNavigating: true,
            selfAttributing: true,
            continuousLearning: true
          }
        } : {
          enabled: false,
          reason: fallbackReason || 'AgentEvolver not available'
        }
      });

    } catch (innerError) {
      // Handle specific AI execution errors
      console.error('AI execution error:', innerError);
      throw innerError; // Re-throw to be handled by outer catch
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;

    // Handle AI provider unavailability specifically
    if (error instanceof AIProviderUnavailableError) {
      console.error('❌ AI provider unavailable for chat:', error.message);

      return NextResponse.json({
        success: false,
        error: {
          type: 'ai_provider_unavailable',
          message: 'AI Provider Required',
          userMessage: 'An AI provider is required for the chat assistant. Please configure an AI provider in Settings.',
          details: error.message,
          recommendations: error.recommendations,
          setupRequired: error.setupRequired,
          timestamp: new Date().toISOString(),
          processingTime: `${totalTime}ms`,
          buildMode: 'server'
        },
        setupGuide: {
          title: 'Configure AI Provider for Chat',
          steps: [
            'Go to Settings → AI Configuration',
            'Configure OpenRouter API key (recommended for production)',
            'Or set up LM Studio for local development',
            'Test connection and return to chat'
          ],
          helpText: 'AI chat assistant requires an active AI provider connection. Fallback responses have been removed to ensure quality.'
        }
      }, { status: 503 }); // Service Unavailable
    }

    console.error('Chat API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${totalTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        buildMode: 'server'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // For static export, provide client-side compatibility response
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  // Enhanced server-side functionality with provider detection
  try {
    console.log('🔍 Detecting AI providers for chat endpoint...');

    // Detect available providers
    const providerDetection = await detectAvailableProviders();

    // Get configuration for each provider
    const lmStudioConfig = getProviderConfig('lm-studio');
    const openRouterConfig = getProviderConfig('openrouter');

    const settings = {
      aiProvider: providerDetection.primary.provider,
      lmStudio: {
        url: lmStudioConfig.url,
        model: lmStudioConfig.model,
        hasApiKey: !!lmStudioConfig.apiKey,
        timeout: lmStudioConfig.timeout
      },
      openRouter: {
        baseUrl: openRouterConfig.baseUrl,
        model: openRouterConfig.model,
        hasApiKey: !!openRouterConfig.apiKey,
        timeout: openRouterConfig.timeout
      }
    };

    return NextResponse.json({
      success: true,
      currentProvider: providerDetection.primary.provider,
      primaryProvider: {
        provider: providerDetection.primary.provider,
        isAvailable: providerDetection.primary.isAvailable,
        reason: providerDetection.primary.reason
      },
      availableProviders: [
        providerDetection.primary.isAvailable ? providerDetection.primary.provider : null,
        ...providerDetection.fallback.filter(f => f.isAvailable).map(f => f.provider)
      ].filter(Boolean),
      unavailableProviders: providerDetection.fallback.filter(f => !f.isAvailable).map(f => ({
        provider: f.provider,
        reason: f.reason,
        recommendations: f.recommendations
      })),
      settings: settings,
      recommendations: providerDetection.recommendations,
      environment: {
        isServerless: !!process.env.NETLIFY || !!process.env.VERCEL,
        platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'Dedicated Server',
        isDevelopment: process.env.NODE_ENV === 'development'
      },
      buildMode: 'server',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat endpoint provider detection failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect AI providers',
        timestamp: new Date().toISOString(),
        aiProviderRequired: true,
        message: 'AI provider detection failed - chat functionality requires an active AI provider'
      },
      { status: 503 }
    );
  }
}