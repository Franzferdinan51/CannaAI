import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

export async function POST() {
  // Provide client-side compatibility response for static export
  return NextResponse.json({
    success: false,
    message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true,
    buildMode: 'static'
  });

  // Full server-side functionality for local development
  const runtime = 'nodejs';

  // Default settings
  let currentSettings = {
    aiProvider: 'lm-studio',
    lmStudio: {
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'llama-3-8b-instruct'
    },
    openRouter: {
      apiKey: '',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      baseUrl: 'https://openrouter.ai/api/v1'
    }
  };

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

  async function getSettings() {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
      const data = await response.json();
      if (data.success) {
        currentSettings = { ...currentSettings, ...data.settings };
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
    }
    return currentSettings;
  }

  async function callLMStudio(messages: any[], modelId: string): Promise<{
    content: string;
    model: string;
    usage?: any;
    provider: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${currentSettings.lmStudio.url}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentSettings.lmStudio.apiKey && { 'Authorization': `Bearer ${currentSettings.lmStudio.apiKey}` })
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800,
          stream: false
        }),
        signal: AbortSignal.timeout(60000)
      });

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from LM Studio');
      }

      return {
        content,
        model: result.model || modelId,
        usage: result.usage,
        provider: 'lm-studio'
      };

    } catch (error) {
      throw new Error(`LM Studio communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function callOpenRouter(messages: any[], modelId: string) {
    try {
      if (!currentSettings.openRouter.apiKey) {
        throw new Error('OpenRouter API key not configured');
      }

      const response = await fetch(`${currentSettings.openRouter.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSettings.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'CannaAI Pro'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800
        })
      });

      const result = await response.json();
      return {
        content: result.choices[0].message.content,
        model: result.model,
        usage: result.usage,
        provider: 'openrouter'
      };
    } catch (error) {
      throw new Error(`OpenRouter communication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    const startTime = Date.now();

    // For this example, we'll use a mock request since we can't access the actual request body in static mode
    const body = { message: 'Hello', mode: 'chat' };
    const { message, mode = 'chat' } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Load current settings
    const settings = await getSettings();
    const selectedProvider = settings.aiProvider;
    let selectedModel = '';

    // Get the appropriate model based on provider
    if (selectedProvider === 'lm-studio') {
      selectedModel = settings.lmStudio.model;
    } else if (selectedProvider === 'openrouter') {
      selectedModel = settings.openRouter.model;
    }

    if (!selectedModel) {
      return NextResponse.json(
        { error: 'No model selected or available' },
        { status: 400 }
      );
    }

    // Create context-aware prompt with sensor data and page context
    let contextPrompt = getContextualPrompt(mode, {}, {}, message);

    // Create message array for the AI model
    let messages = [
      {
        role: 'system',
        content: 'You are a helpful cannabis cultivation assistant. Provide accurate, practical advice based on the current sensor data and user questions.'
      },
      {
        role: 'user',
        content: contextPrompt
      }
    ];

    let response;
    let lastError = null;

    // Try the primary provider first
    try {
      if (selectedProvider === 'lm-studio') {
        response = await callLMStudio(messages, selectedModel);
      } else if (selectedProvider === 'openrouter') {
        response = await callOpenRouter(messages, selectedModel);
      } else {
        throw new Error(`Unknown provider: ${selectedProvider}`);
      }
    } catch (error) {
      lastError = error;
      console.warn(`Primary provider ${selectedProvider} failed:`, error);
    }

    if (!response) {
      throw new Error(`AI provider failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
      provider: response.provider,
      usage: response.usage,
      timestamp: new Date().toISOString(),
      processingTime: `${totalTime}ms`,
      mode: mode,
      buildMode: 'server'
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
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
  // Provide client-side compatibility response for static export
  return NextResponse.json({
    success: false,
    message: 'AI chat is handled client-side in static export mode. Please configure your AI provider using the AI Config button.',
    clientSide: true,
    buildMode: 'static'
  });

  // Full server-side functionality for local development
  try {
    // Mock settings for static compatibility
    const settings = {
      aiProvider: 'lm-studio',
      lmStudio: {
        url: 'http://localhost:1234',
        model: 'llama-3-8b-instruct',
        hasApiKey: false
      },
      openRouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        hasApiKey: false
      }
    };

    return NextResponse.json({
      success: true,
      currentProvider: settings.aiProvider,
      availableProviders: ['lm-studio', 'openrouter'],
      settings: settings,
      buildMode: 'server'
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get settings',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}