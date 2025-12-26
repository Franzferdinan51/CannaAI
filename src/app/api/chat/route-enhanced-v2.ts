/**
 * Enhanced AI Chat API with Multi-Provider Support
 * Uses unified AI interface with conversation memory and intelligent routing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';
import { getProviderManager } from '@/lib/ai-providers/provider-manager';
import { z } from 'zod';

// Environment detection
const isStaticExport = process.env.BUILD_MODE === 'static';

// Enhanced validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(4000),
  conversationId: z.string().optional(),
  mode: z.enum(['chat', 'thinking', 'research']).optional().default('chat'),
  context: z.object({
    title: z.string().optional(),
    page: z.string().optional(),
    description: z.string().optional()
  }).optional(),
  sensorData: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    ph: z.number().optional(),
    soilMoisture: z.number().optional(),
    lightIntensity: z.number().optional(),
    ec: z.number().optional()
  }).optional(),
  provider: z.string().optional(),
  promptVersion: z.string().optional(),
  quality: z.enum(['balanced', 'speed', 'quality', 'cost']).optional().default('balanced'),
  maxTokens: z.number().min(1).max(32000).optional(),
  temperature: z.number().min(0).max(2).optional()
});

// Export configuration
export const dynamic = 'auto';
export const revalidate = false;

// Get contextual prompt based on mode
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

    case 'research':
      return `You are a cannabis research specialist. You provide detailed, research-backed answers with citations and references to scientific studies when applicable.

${baseContext}

User question: ${message}

Please provide comprehensive research-backed information with citations and references.`;

    default:
      return `You are CultivAI Assistant, an expert cannabis cultivation AI. You provide helpful, accurate advice about plant care, nutrients, environmental conditions, and troubleshooting.

${baseContext}

User question: ${message}

Please provide a helpful, concise response. If the user asks about specific readings, reference the current sensor data. Consider the current page context to provide more relevant advice.`;
  }
}

export async function POST(request: NextRequest) {
  // Static export compatibility
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
    const { message, mode = 'chat', context, sensorData, conversationId, provider, promptVersion, quality, maxTokens, temperature } = ChatRequestSchema.parse(body);

    console.log('💬 Enhanced chat request:', { mode, conversationId, quality });

    // Get contextual prompt
    const contextPrompt = getContextualPrompt(mode, context || {}, sensorData || {}, message);

    // Get unified AI instance
    const unifiedAI = getUnifiedAI();

    try {
      // Execute chat with unified interface
      const aiResponse = await unifiedAI.execute({
        type: mode === 'research' ? 'research' : 'chat',
        messages: [
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        conversationId,
        provider,
        promptVersion,
        quality,
        maxTokens,
        temperature,
        metadata: {
          mode,
          context,
          sensorData
        }
      });

      const totalTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        response: aiResponse.content,
        model: aiResponse.model,
        provider: aiResponse.provider,
        usage: {
          promptTokens: aiResponse.usage.promptTokens,
          completionTokens: aiResponse.usage.completionTokens,
          totalTokens: aiResponse.usage.totalTokens,
          cost: aiResponse.usage.cost
        },
        timestamp: new Date().toISOString(),
        processingTime: `${totalTime}ms`,
        mode: mode,
        conversationId: conversationId,
        buildMode: 'server',
        cached: aiResponse.metadata.cached,
        qualityScore: aiResponse.metadata.qualityScore?.overall,
        features: {
          multiProviderSupport: true,
          intelligentRouting: true,
          conversationMemory: !!conversationId,
          cachingEnabled: true,
          costTracked: true,
          promptVersioning: !!promptVersion,
          streamingReady: aiResponse.provider === 'groq' || aiResponse.provider === 'together'
        },
        recommendations: [
          `Powered by ${aiResponse.provider} for optimal ${quality} performance`,
          conversationId ? 'Conversation memory enabled' : 'Start a new conversation for context',
          'Configure multiple providers in Settings for load balancing'
        ]
      });

    } catch (aiError) {
      console.error('❌ AI chat failed:', aiError);

      return NextResponse.json({
        success: false,
        error: {
          type: 'ai_provider_unavailable',
          message: 'AI Provider Required',
          userMessage: 'Please configure an AI provider in Settings to use the chat assistant.',
          details: aiError instanceof Error ? aiError.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          processingTime: `${Date.now() - startTime}ms`,
          buildMode: 'server',
          newInV2: 'Enhanced with 8 AI providers and intelligent routing'
        },
        setupGuide: {
          title: 'Configure AI Provider for Chat',
          steps: [
            'Go to Settings → AI Configuration',
            'Configure any AI provider (Groq recommended for fast chat)',
            'Test connection at /api/ai/health',
            'Return to chat'
          ],
          helpText: 'Multi-provider support enables intelligent routing, conversation memory, and cost optimization.'
        },
        providerHealth: '/api/ai/health',
        costTracking: '/api/ai/cost'
      }, { status: 503 });
    }

  } catch (error) {
    const totalTime = Date.now() - startTime;

    console.error('Chat API error:', error);

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

export async function GET(request: NextRequest) {
  const isStaticExport = process.env.BUILD_MODE === 'static';
  if (isStaticExport) {
    return NextResponse.json({
      success: false,
      message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
      clientSide: true,
      buildMode: 'static'
    });
  }

  try {
    console.log('🔍 Detecting AI providers for chat endpoint...');

    const unifiedAI = getUnifiedAI();
    const providerManager = getProviderManager();
    const providerStatus = providerManager.getProvidersStatus();

    // Get conversation info if session provided
    const sessionId = new URL(request.url).searchParams.get('session');
    const conversationHistory = sessionId ? providerManager.getConversationHistory(sessionId) : [];

    // Calculate stats
    const healthyProviders = providerStatus.filter(p => p.health.status === 'healthy').length;
    const totalProviders = providerStatus.length;

    return NextResponse.json({
      success: true,
      message: 'Enhanced AI Chat v2.0 is ready',
      currentProvider: providerStatus.find(p => p.health.status === 'healthy')?.name || 'none',
      providerStatus: {
        total: totalProviders,
        healthy: healthyProviders,
        degraded: providerStatus.filter(p => p.health.status === 'degraded').length,
        unhealthy: providerStatus.filter(p => p.health.status === 'unhealthy').length
      },
      availableProviders: providerStatus
        .filter(p => p.health.status === 'healthy')
        .map(p => ({
          name: p.name,
          latency: p.health.latency,
          successRate: p.health.successRate,
          capabilities: p.capabilities
        })),
      conversation: {
        sessionId: sessionId,
        historyLength: conversationHistory.length,
        hasActiveSession: !!sessionId
      },
      features: {
        multiProviderSupport: true,
        intelligentRouting: true,
        conversationMemory: true,
        responseCaching: true,
        costTracking: true,
        promptVersioning: true,
        streamingSupport: providerStatus.some(p => p.capabilities.streaming),
        visionSupport: providerStatus.some(p => p.capabilities.vision)
      },
      mode: {
        chat: 'Conversational AI assistant',
        thinking: 'Deep analytical responses with reasoning',
        research: 'Research-backed answers with citations'
      },
      buildMode: 'server',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/ai/health',
        cost: '/api/ai/cost',
        analytics: '/api/ai/analytics',
        providers: '/api/ai/providers'
      }
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
