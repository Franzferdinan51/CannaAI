import { NextRequest, NextResponse } from 'next/server';

interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  models: AIModel[];
  config: any;
  status: 'available' | 'unavailable' | 'error';
  lastChecked: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength?: number;
  size?: string;
  quantization?: string;
}

async function getLMStudioModels(): Promise<AIModel[]> {
  try {
    console.log('Fetching LM Studio models from http://localhost:1234/v1/models');
    const response = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json'
        // No API key needed for LM Studio
      }
    });

    console.log(`LM Studio response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`LM Studio not responding: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];
    console.log(`LM Studio returned ${models.length} models`);

    const formattedModels = models.map((model: any) => {
      const capabilities = determineCapabilities(model.id);
      return {
        id: model.id,
        name: model.id,
        provider: 'lm-studio',
        capabilities: capabilities,
        contextLength: model.context_length || 4096,
        size: model.size || 'Unknown',
        details: {
          object: model.object,
          created: model.created,
          owned_by: model.owned_by,
          permission: model.permission
        }
      };
    });

    console.log(`Formatted ${formattedModels.length} LM Studio models`);
    return formattedModels;

  } catch (error) {
    console.warn('LM Studio models fetch error:', error);
    return [];
  }
}

async function getLMStudioLocalModels(): Promise<AIModel[]> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/lmstudio/models`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Local LM Studio scanner error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.error || 'Scanner error');
    }

    return data.models.map((model: any) => ({
      id: model.id,
      name: `${model.name} (${model.author})`,
      provider: 'lm-studio-local',
      capabilities: model.capabilities || ['text-generation'],
      contextLength: model.contextLength,
      size: model.sizeFormatted,
      quantization: model.quantization,
      filepath: model.filepath
    }));

  } catch (error) {
    console.warn('Local LM Studio models fetch error:', error);
    return [];
  }
}

async function getOpenRouterModels(): Promise<AIModel[]> {
  try {
    // First get settings to get API key
    const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.openRouter.apiKey) {
      return [];
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${settingsData.settings.openRouter.apiKey}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // Filter and sort models
    return models
      .filter((model: any) => {
        // Filter for good chat/vision models
        return model.id.includes('chat') ||
               model.id.includes('instruct') ||
               model.id.includes('vision') ||
               model.id.includes('vila') ||
               model.id.includes('llava');
      })
      .sort((a: any, b: any) => {
        // Prioritize free and popular models
        const aFree = a.id.includes(':free') || a.id.includes('free');
        const bFree = b.id.includes(':free') || b.id.includes('free');

        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;

        return 0;
      })
      .slice(0, 50) // Limit to top 50 models
      .map((model: any) => ({
        id: model.id,
        name: `${model.name} (${model.id.split(':')[0]})`,
        provider: 'openrouter',
        capabilities: determineCapabilities(model.id),
        contextLength: model.context_length,
        pricing: model.pricing
      }));

  } catch (error) {
    console.warn('OpenRouter models fetch error:', error);
    return [];
  }
}

function determineCapabilities(modelId: string): string[] {
  const capabilities = ['text-generation'];
  const id = modelId.toLowerCase();

  if (id.includes('vision') ||
      id.includes('vila') ||
      id.includes('llava') ||
      id.includes('bakllava') ||
      id.includes('multimodal') ||
      id.includes('image')) {
    capabilities.push('vision');
    capabilities.push('image-analysis');
  }

  if (id.includes('plant') ||
      id.includes('agriculture') ||
      id.includes('botany') ||
      id.includes('cannai')) {
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

async function getAvailableProviders(): Promise<AIProvider[]> {
  const providers: AIProvider[] = [];

  // LM Studio (running instance)
  try {
    const lmStudioModels = await getLMStudioModels();
    providers.push({
      id: 'lm-studio',
      name: 'LM Studio (Running)',
      type: 'local',
      models: lmStudioModels,
      config: { url: 'http://localhost:1234' },
      status: lmStudioModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'lm-studio',
      name: 'LM Studio (Running)',
      type: 'local',
      models: [],
      config: { url: 'http://localhost:1234' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  // LM Studio (local models)
  try {
    const localLMStudioModels = await getLMStudioLocalModels();
    providers.push({
      id: 'lm-studio-local',
      name: 'LM Studio (Local Models)',
      type: 'local',
      models: localLMStudioModels,
      config: { url: 'http://localhost:1234' },
      status: localLMStudioModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'lm-studio-local',
      name: 'LM Studio (Local Models)',
      type: 'local',
      models: [],
      config: { url: 'http://localhost:1234' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  // OpenRouter
  try {
    const openRouterModels = await getOpenRouterModels();
    providers.push({
      id: 'openrouter',
      name: 'OpenRouter',
      type: 'cloud',
      models: openRouterModels,
      config: { baseUrl: 'https://openrouter.ai/api/v1' },
      status: openRouterModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'openrouter',
      name: 'OpenRouter',
      type: 'cloud',
      models: [],
      config: { baseUrl: 'https://openrouter.ai/api/v1' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  return providers;
}

export async function GET(request: NextRequest) {
  try {
    const providers = await getAvailableProviders();

    // Calculate summary
    const summary = {
      totalProviders: providers.length,
      availableProviders: providers.filter(p => p.status === 'available').length,
      totalModels: providers.reduce((sum, p) => sum + p.models.length, 0),
      localModels: providers
        .filter(p => p.type === 'local')
        .reduce((sum, p) => sum + p.models.length, 0),
      cloudModels: providers
        .filter(p => p.type === 'cloud')
        .reduce((sum, p) => sum + p.models.length, 0),
      visionModels: providers
        .reduce((sum, p) => sum + p.models.filter(m => m.capabilities.includes('vision')).length, 0)
    };

    return NextResponse.json({
      success: true,
      providers,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI providers fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        providers: [],
        summary: {
          totalProviders: 0,
          availableProviders: 0,
          totalModels: 0,
          localModels: 0,
          cloudModels: 0,
          visionModels: 0
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, providerId, modelId } = body;

    switch (action) {
      case 'refresh':
        const providers = await getAvailableProviders();
        return NextResponse.json({
          success: true,
          providers,
          message: 'Providers refreshed successfully'
        });

      case 'test':
        // Test specific provider/model combination
        const testResult = await testProviderModel(providerId, modelId);
        return NextResponse.json(testResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('AI providers POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}

async function testProviderModel(providerId: string, modelId: string): Promise<any> {
  try {
    if (providerId === 'lm-studio' || providerId === 'lm-studio-local') {
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'user', content: 'Hello, this is a test.' }
          ],
          max_tokens: 10,
          temperature: 0.7
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Model test successful',
          provider: providerId,
          model: modelId
        };
      } else {
        return {
          success: false,
          message: 'Model test failed',
          provider: providerId,
          model: modelId,
          error: `${response.status}: ${response.statusText}`
        };
      }
    }

    if (providerId === 'openrouter') {
      // Get settings for API key
      const settingsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/settings`);
      const settingsData = await settingsResponse.json();

      if (!settingsData.success || !settingsData.settings.openRouter.apiKey) {
        return {
          success: false,
          message: 'OpenRouter API key not configured',
          provider: providerId,
          model: modelId
        };
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settingsData.settings.openRouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'CannaAI Pro'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'user', content: 'Hello, this is a test.' }
          ],
          max_tokens: 10,
          temperature: 0.7
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Model test successful',
          provider: providerId,
          model: modelId
        };
      } else {
        return {
          success: false,
          message: 'Model test failed',
          provider: providerId,
          model: modelId,
          error: `${response.status}: ${response.statusText}`
        };
      }
    }

    return {
      success: false,
      message: 'Unknown provider',
      provider: providerId,
      model: modelId
    };

  } catch (error) {
    return {
      success: false,
      message: 'Test failed',
      provider: providerId,
      model: modelId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}