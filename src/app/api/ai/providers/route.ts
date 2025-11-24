import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  models: AIModel[];
  config: any;
  status: 'available' | 'unavailable' | 'error';
  lastChecked: string;
  metadata?: any; // Additional provider-specific metadata
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength?: number;
  size?: string;
  quantization?: string;
  source?: 'running' | 'local' | 'both'; // For LM Studio: where model is available
  filepath?: string; // For LM Studio local models
  metadata?: any; // Additional model-specific metadata
}

const SETTINGS_BASE = process.env.NEXTAUTH_URL || process.env.SITE_URL || 'http://localhost:3000';

async function getLMStudioModels(): Promise<AIModel[]> {
  // Check if we're on a serverless platform
  const isServerless = !!process.env.NETLIFY ||
                      !!process.env.VERCEL ||
                      !process.platform;

  if (isServerless) {
    console.log('Serverless platform detected - returning demo LM Studio models');
    return [
      {
        id: 'demo_llava_vision',
        name: 'LLaVA Vision (Demo - Serverless)',
        provider: 'lm-studio-demo',
        capabilities: ['text-generation', 'vision', 'image-analysis', 'plant-analysis'],
        contextLength: 4096,
        size: '4.1 GB (Demo)',
        quantization: 'Q4_K_M',
        metadata: {
          note: 'Demo data - Real LM Studio requires local deployment',
          platform: 'serverless'
        }
      },
      {
        id: 'demo_cannabis_expert',
        name: 'Cannabis Expert (Demo - Serverless)',
        provider: 'lm-studio-demo',
        capabilities: ['text-generation', 'plant-analysis', 'classification', 'analysis'],
        contextLength: 8192,
        size: '8.5 GB (Demo)',
        quantization: 'Q5_K_M',
        metadata: {
          note: 'Demo data - Real LM Studio requires local deployment',
          platform: 'serverless'
        }
      }
    ];
  }

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
  // Local scanning is not supported on Netlify/Serverless environments
  return [];
}

/**
 * Unified LM Studio model fetcher that combines running instance and local models
 * Returns deduplicated models with source information
 */
async function getUnifiedLMStudioModels(): Promise<AIModel[]> {
  const runningModels = await getLMStudioModels();
  const localModels = await getLMStudioLocalModels();

  // Mark running models with source
  const markedRunningModels = runningModels.map(model => ({
    ...model,
    source: 'running' as 'running' | 'local' | 'both' // Mark as from running instance
  }));

  // Merge and deduplicate models by ID
  const modelMap = new Map<string, AIModel>();

  // Add running models first
  markedRunningModels.forEach(model => {
    modelMap.set(model.id, model as AIModel);
  });

  // Add local models, merging if they exist in running
  localModels.forEach(localModel => {
    const existing = modelMap.get(localModel.id);
    if (existing) {
      // Model exists in both - merge information
      modelMap.set(localModel.id, {
        ...existing,
        ...localModel,
        source: 'both' as 'running' | 'local' | 'both', // Available in both running instance and locally
        name: existing.name, // Prefer running instance name format
      } as AIModel);
    } else {
      // Local-only model
      modelMap.set(localModel.id, localModel as AIModel);
    }
  });

  return Array.from(modelMap.values());
}

async function getOpenRouterModels(): Promise<AIModel[]> {
  try {
    // First get settings to get API key
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.openRouter.apiKey) {
      return [];
    }

    const { apiKey, model: manualModel } = settingsData.settings.openRouter;

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${settingsData.settings.openRouter.apiKey}`,
        'HTTP-Referer': SETTINGS_BASE,
        'X-Title': 'CannaAI Pro'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    let models = data.data || [];

    // Always include manual model at the top if it exists
    if (manualModel) {
      const existingModelIndex = models.findIndex((m: any) => m.id === manualModel);
      if (existingModelIndex >= 0) {
        // Move existing model to the top
        const [existingModel] = models.splice(existingModelIndex, 1);
        models.unshift({
          ...existingModel,
          name: `${existingModel.name} (Selected)`
        });
      } else {
        // Add manual model to the top
        models.unshift({
          id: manualModel,
          name: `${manualModel} (Manual)`,
        });
      }
    }

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

async function getOpenAICompatibleModels(): Promise<AIModel[]> {
  try {
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.openai?.apiKey || !settingsData.settings.openai?.baseUrl) {
      return [];
    }

    const { apiKey, baseUrl, model } = settingsData.settings.openai;

    // For OpenAI-compatible endpoints, we can't always list models.
    // We'll start with the user-provided model.
    if (!model) {
      return [];
    }

    return [{
      id: model,
      name: model,
      provider: 'openai-compatible',
      capabilities: determineCapabilities(model),
    }];
  } catch (error) {
    console.warn('OpenAI-Compatible models fetch error:', error);
    return [];
  }
}

async function getGeminiModels(): Promise<AIModel[]> {
  try {
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.gemini?.apiKey) {
      return [];
    }

    const { apiKey, baseUrl } = settingsData.settings.gemini;

    const response = await fetch(`${baseUrl}models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      // Return known models if API fails
      return [
        {
          id: 'gemini-2.0-flash-exp',
          name: 'Gemini 2.0 Flash (Experimental)',
          provider: 'gemini',
          capabilities: ['text-generation', 'vision', 'long-context'],
          contextLength: 1000000
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          provider: 'gemini',
          capabilities: ['text-generation', 'vision', 'long-context'],
          contextLength: 2000000
        },
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          provider: 'gemini',
          capabilities: ['text-generation', 'vision', 'long-context'],
          contextLength: 1000000
        }
      ];
    }

    const data = await response.json();
    let models = data.data || [];

    return models
      .filter((model: any) => model.id.includes('gemini'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'gemini',
        capabilities: determineCapabilities(model.id),
        contextLength: model.context_length || 32768
      }));

  } catch (error) {
    console.warn('Gemini models fetch error:', error);
    return [];
  }
}

async function getGroqModels(): Promise<AIModel[]> {
  try {
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.groq?.apiKey) {
      return [];
    }

    const { apiKey, baseUrl } = settingsData.settings.groq;

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      // Return known models if API fails
      return [
        {
          id: 'llama-3.3-70b-versatile',
          name: 'Llama 3.3 70B Versatile',
          provider: 'groq',
          capabilities: ['text-generation', 'long-context'],
          contextLength: 32768
        },
        {
          id: 'mixtral-8x7b-32768',
          name: 'Mixtral 8x7B',
          provider: 'groq',
          capabilities: ['text-generation', 'long-context'],
          contextLength: 32768
        },
        {
          id: 'llama-3.1-70b-versatile',
          name: 'Llama 3.1 70B Versatile',
          provider: 'groq',
          capabilities: ['text-generation', 'long-context'],
          contextLength: 131072
        }
      ];
    }

    const data = await response.json();
    const models = data.data || [];

    return models
      .filter((model: any) => {
        return model.id.includes('llama') ||
               model.id.includes('mixtral') ||
               model.id.includes('gemma');
      })
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: 'groq',
        capabilities: determineCapabilities(model.id),
        contextLength: model.context_length || 8192
      }));

  } catch (error) {
    console.warn('Groq models fetch error:', error);
    return [];
  }
}

async function getAnthropicModels(): Promise<AIModel[]> {
  try {
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
    const settingsData = await settingsResponse.json();

    if (!settingsData.success || !settingsData.settings.anthropic?.apiKey) {
      return [];
    }

    // Anthropic doesn't have a models endpoint, return known models
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        capabilities: ['text-generation', 'vision', 'long-context', 'analysis'],
        contextLength: 200000
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        capabilities: ['text-generation', 'vision', 'long-context'],
        contextLength: 200000
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        capabilities: ['text-generation', 'vision', 'long-context', 'analysis'],
        contextLength: 200000
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        capabilities: ['text-generation', 'vision', 'long-context'],
        contextLength: 200000
      }
    ];

  } catch (error) {
    console.warn('Anthropic models fetch error:', error);
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

  // LM Studio (unified: combines running instance + local models)
  try {
    const unifiedModels = await getUnifiedLMStudioModels();

    // Determine status based on model sources
    let status: 'available' | 'unavailable' | 'error' = 'unavailable';
    if (unifiedModels.length > 0) {
      const hasRunning = unifiedModels.some((m: any) => m.source === 'running' || m.source === 'both');
      status = hasRunning ? 'available' : 'unavailable';
    }

    providers.push({
      id: 'lm-studio',
      name: 'LM Studio',
      type: 'local',
      models: unifiedModels,
      config: {
        url: 'http://localhost:1234',
        note: 'Unified provider combining running instance and local models'
      },
      status,
      lastChecked: new Date().toISOString(),
      metadata: {
        totalModels: unifiedModels.length,
        runningModels: unifiedModels.filter((m: any) => m.source === 'running' || m.source === 'both').length,
        localModels: unifiedModels.filter((m: any) => m.source === 'local' || m.source === 'both').length
      }
    });
  } catch (error) {
    providers.push({
      id: 'lm-studio',
      name: 'LM Studio',
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

  // OpenAI-Compatible
  try {
    const openAICompatibleModels = await getOpenAICompatibleModels();
    providers.push({
      id: 'openai-compatible',
      name: 'OpenAI-Compatible',
      type: 'cloud',
      models: openAICompatibleModels,
      config: { baseUrl: '' }, // This will be pulled from settings
      status: openAICompatibleModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'openai-compatible',
      name: 'OpenAI-Compatible',
      type: 'cloud',
      models: [],
      config: { baseUrl: '' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  // Google Gemini
  try {
    const geminiModels = await getGeminiModels();
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      type: 'cloud',
      models: geminiModels,
      config: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
      status: geminiModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      type: 'cloud',
      models: [],
      config: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  // Groq
  try {
    const groqModels = await getGroqModels();
    providers.push({
      id: 'groq',
      name: 'Groq (Fast Inference)',
      type: 'cloud',
      models: groqModels,
      config: { baseUrl: 'https://api.groq.com/openai/v1' },
      status: groqModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'groq',
      name: 'Groq (Fast Inference)',
      type: 'cloud',
      models: [],
      config: { baseUrl: 'https://api.groq.com/openai/v1' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  // Anthropic Claude
  try {
    const anthropicModels = await getAnthropicModels();
    providers.push({
      id: 'anthropic',
      name: 'Anthropic Claude',
      type: 'cloud',
      models: anthropicModels,
      config: { baseUrl: 'https://api.anthropic.com/v1' },
      status: anthropicModels.length > 0 ? 'available' : 'unavailable',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    providers.push({
      id: 'anthropic',
      name: 'Anthropic Claude',
      type: 'cloud',
      models: [],
      config: { baseUrl: 'https://api.anthropic.com/v1' },
      status: 'error',
      lastChecked: new Date().toISOString()
    });
  }

  return providers;
}

export async function GET(request: NextRequest) {
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

  try {
    const isServerless = !!process.env.NETLIFY ||
                        !!process.env.VERCEL ||
                        !process.platform;

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

    const response: any = {
      success: true,
      providers,
      summary,
      timestamp: new Date().toISOString()
    };

    // Add deployment information for serverless platforms
    if (isServerless) {
      response.deploymentInfo = {
        platform: 'Serverless (Netlify/Vercel)',
        limitations: [
          'LM Studio requires local deployment',
          'Local network access is restricted',
          'File system access is limited'
        ],
        recommendations: [
          'Use OpenRouter for cloud AI models',
          'Deploy locally with Docker for full functionality',
          'Use a VPS for self-hosted deployment'
        ],
        note: 'Demo models shown above are placeholders. Configure OpenRouter API key for real cloud models.'
      };
    }

    return NextResponse.json(response);

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
    if (providerId === 'lm-studio') {
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
      const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);
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
          'HTTP-Referer': SETTINGS_BASE,
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
