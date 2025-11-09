import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

// Default settings
const defaultSettings = {
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
  },
  notifications: {
    enabled: true,
    sound: false,
    desktop: true
  },
  units: {
    temperature: 'fahrenheit',
    weight: 'grams'
  }
};

// In-memory settings storage (in production, use database)
let settings = { ...defaultSettings };

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider, config } = body;

    switch (action) {
      case 'update_provider':
        if (!provider || !config) {
          return NextResponse.json(
            { error: 'Missing provider or config' },
            { status: 400 }
          );
        }

        if (provider === 'lm-studio') {
          settings.lmStudio = { ...settings.lmStudio, ...config };
        } else if (provider === 'openrouter') {
          settings.openRouter = { ...settings.openRouter, ...config };
        } else {
          return NextResponse.json(
            { error: 'Invalid provider' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `${provider} settings updated successfully`,
          settings: settings[provider]
        });

      case 'switch_provider':
        if (!provider) {
          return NextResponse.json(
            { error: 'Missing provider' },
            { status: 400 }
          );
        }

        if (!['lm-studio', 'openrouter'].includes(provider)) {
          return NextResponse.json(
            { error: 'Invalid provider' },
            { status: 400 }
          );
        }

        settings.aiProvider = provider;

        return NextResponse.json({
          success: true,
          message: `Switched to ${provider}`,
          currentProvider: settings.aiProvider
        });

      case 'update_notifications':
        if (!config) {
          return NextResponse.json(
            { error: 'Missing config' },
            { status: 400 }
          );
        }

        settings.notifications = { ...settings.notifications, ...config };

        return NextResponse.json({
          success: true,
          message: 'Notification settings updated',
          notifications: settings.notifications
        });

      case 'update_units':
        if (!config) {
          return NextResponse.json(
            { error: 'Missing config' },
            { status: 400 }
          );
        }

        settings.units = { ...settings.units, ...config };

        return NextResponse.json({
          success: true,
          message: 'Unit settings updated',
          units: settings.units
        });

      case 'test_connection':
        if (!provider) {
          return NextResponse.json(
            { error: 'Missing provider' },
            { status: 400 }
          );
        }

        const testResult = await testAIConnection(provider);
        return NextResponse.json({
          success: testResult.success,
          message: testResult.message,
          details: testResult.details
        });

      case 'get_models':
        // Get models for a specific provider
        if (!provider) {
          return NextResponse.json(
            { error: 'Missing provider' },
            { status: 400 }
          );
        }

        const modelsResult = await getProviderModels(provider);
        return NextResponse.json({
          success: modelsResult.success,
          models: modelsResult.models,
          provider: provider,
          count: modelsResult.models.length,
          message: modelsResult.message
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

async function getProviderModels(provider: string) {
  try {
    if (provider === 'lm-studio' || provider === 'lm-studio-local') {
      // Get LM Studio models - doesn't need API key
      const response = await fetch(`${settings.lmStudio.url}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // No API key needed for LM Studio
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];

        // Format models for frontend
        const formattedModels = models.map((model: any) => ({
          id: model.id,
          name: model.id,
          provider: 'lm-studio',
          capabilities: determineCapabilities(model.id),
          contextLength: model.context_length || 4096,
          size: model.size || 'Unknown'
        }));

        return {
          success: true,
          message: `Found ${models.length} LM Studio models`,
          models: formattedModels
        };
      } else {
        return {
          success: false,
          message: 'LM Studio not responding',
          models: []
        };
      }
    } else if (provider === 'openrouter') {
      // Get OpenRouter models
      if (!settings.openRouter.apiKey) {
        return {
          success: false,
          message: 'OpenRouter API key required',
          models: []
        };
      }

      const response = await fetch(`${settings.openRouter.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'CannaAI Pro'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];

        // Filter for good models
        const filteredModels = models
          .filter((model: any) => {
            return model.id.includes('chat') ||
                   model.id.includes('instruct') ||
                   model.id.includes('vision') ||
                   model.id.includes('vila') ||
                   model.id.includes('llava');
          })
          .slice(0, 20) // Limit to top 20
          .map((model: any) => ({
            id: model.id,
            name: `${model.name} (${model.id.split(':')[0]})`,
            provider: 'openrouter',
            capabilities: determineCapabilities(model.id),
            contextLength: model.context_length,
            pricing: model.pricing
          }));

        return {
          success: true,
          message: `Found ${filteredModels.length} OpenRouter models`,
          models: filteredModels
        };
      } else {
        return {
          success: false,
          message: 'OpenRouter API error',
          models: []
        };
      }
    }

    return {
      success: false,
      message: 'Unknown provider',
      models: []
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to get models',
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function determineCapabilities(modelId: string): string[] {
  const capabilities = ['text-generation'];
  const id = modelId.toLowerCase();

  if (id.includes('vision') ||
      id.includes('vila') ||
      id.includes('llava') ||
      id.includes('multimodal')) {
    capabilities.push('vision');
    capabilities.push('image-analysis');
  }

  if (id.includes('plant') ||
      id.includes('agriculture') ||
      id.includes('botany')) {
    capabilities.push('plant-analysis');
    capabilities.push('classification');
  }

  if (id.includes('code') || id.includes('codellama')) {
    capabilities.push('code-generation');
  }

  if (id.includes('long') ||
      id.includes('32k') ||
      id.includes('16k') ||
      id.includes('8k')) {
    capabilities.push('long-context');
  }

  return capabilities;
}

async function testAIConnection(provider: string) {
  try {
    if (provider === 'lm-studio' || provider === 'lm-studio-local') {
      // Test LM Studio connection - no API key needed
      const response = await fetch(`${settings.lmStudio.url}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = await response.json();
        return {
          success: true,
          message: 'LM Studio connection successful',
          details: { availableModels: models.data?.length || 0 }
        };
      } else {
        return {
          success: false,
          message: 'LM Studio connection failed',
          details: { status: response.status, statusText: response.statusText }
        };
      }
    } else if (provider === 'openrouter') {
      // Test OpenRouter connection
      if (!settings.openRouter.apiKey) {
        return {
          success: false,
          message: 'OpenRouter API key required',
          details: { error: 'Missing API key' }
        };
      }

      const response = await fetch(`${settings.openRouter.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'CannaAI Pro'
        }
      });

      if (response.ok) {
        const models = await response.json();
        return {
          success: true,
          message: 'OpenRouter connection successful',
          details: { availableModels: models.data?.length || 0 }
        };
      } else {
        return {
          success: false,
          message: 'OpenRouter connection failed',
          details: { status: response.status, statusText: response.statusText }
        };
      }
    }

    return {
      success: false,
      message: 'Unknown provider',
      details: {}
    };
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}