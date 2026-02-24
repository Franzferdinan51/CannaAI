import { NextRequest, NextResponse } from 'next/server';

// Export configuration for dual-mode compatibility
export const dynamic = 'auto';
export const revalidate = false;

/**
 * Default Settings Configuration
 *
 * Environment Variables Supported:
 * - GEMINI_API_KEY, GEMINI_MODEL, GEMINI_BASE_URL
 * - GROQ_API_KEY, GROQ_MODEL, GROQ_BASE_URL
 * - ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL
 * - OPENROUTER_API_KEY, OPENROUTER_MODEL
 * - LM_STUDIO_URL
 *
 * Custom Base URLs allow using proxy services like:
 * - https://ai.gigamind.dev/claude-code (Claude via GigaMind)
 * - https://api.z.ai/api/anthropic (Claude via Z.AI)
 */

// Default settings
const defaultSettings = {
  aiProvider: 'openclaw',
  openclaw: {
    url: 'http://localhost:18789',
    apiKey: '',
    model: 'minimax-portal/MiniMax-M2.5'
  },
  lmStudio: {
    url: 'http://100.74.88.40:1234',
    apiKey: '',
    model: 'llama-3-8b-instruct'
  },
  openRouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  openai: {
    apiKey: '',
    model: '',
    baseUrl: 'https://api.openai.com/v1'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/'
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://ai.gigamind.dev/claude-code'
  },
  agentEvolver: {
    enabled: false,
    evolutionLevel: 'basic',
    learningRate: 0.1,
    performanceThreshold: 0.8,
    autoOptimization: false,
    riskTolerance: 'moderate',
    customPrompts: [
      {
        id: '1',
        name: 'Advanced Plant Analysis',
        description: 'Deep analysis of plant health with strain-specific considerations',
        prompt: 'Analyze this cannabis plant with consideration for genetics, environmental factors, and growth stage. Provide detailed recommendations...',
        category: 'analysis',
        enabled: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        successRate: 92
      }
    ],
    performanceMetrics: {
      accuracy: 0.85,
      responseTime: 2.3,
      resourceUsage: 0.45,
      evolutionProgress: 0.0,
      totalOptimizations: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      averageImprovement: 0.0
    },
    evolutionHistory: [],
    integrationSettings: {
      aiProviderIntegration: true,
      automationSync: false,
      dataAnalysisIntegration: true,
      realTimeOptimization: false,
      crossAgentLearning: false
    }
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
    const { action, provider, config, settings: newSettings } = body;

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
        } else if (provider === 'openai') {
          settings.openai = { ...settings.openai, ...config };
        } else if (provider === 'gemini') {
          settings.gemini = { ...settings.gemini, ...config };
        } else if (provider === 'groq') {
          settings.groq = { ...settings.groq, ...config };
        } else if (provider === 'anthropic') {
          settings.anthropic = { ...settings.anthropic, ...config };
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

        if (!['lm-studio', 'openrouter', 'openai', 'gemini', 'groq', 'anthropic'].includes(provider)) {
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

      case 'get_agent_evolver':
        return NextResponse.json({
          success: true,
          agentEvolverSettings: settings.agentEvolver
        });

      case 'update_agent_evolver':
        if (!newSettings) {
          return NextResponse.json(
            { error: 'Missing agent evolver settings' },
            { status: 400 }
          );
        }

        // Validate Agent Evolver settings
        if (newSettings.learningRate !== undefined) {
          if (typeof newSettings.learningRate !== 'number' ||
              newSettings.learningRate < 0.01 ||
              newSettings.learningRate > 1.0) {
            return NextResponse.json(
              { error: 'Learning rate must be between 0.01 and 1.0' },
              { status: 400 }
            );
          }
        }

        if (newSettings.performanceThreshold !== undefined) {
          if (typeof newSettings.performanceThreshold !== 'number' ||
              newSettings.performanceThreshold < 0.1 ||
              newSettings.performanceThreshold > 1.0) {
            return NextResponse.json(
              { error: 'Performance threshold must be between 0.1 and 1.0' },
              { status: 400 }
            );
          }
        }

        if (newSettings.evolutionLevel &&
            !['basic', 'advanced', 'expert'].includes(newSettings.evolutionLevel)) {
          return NextResponse.json(
            { error: 'Evolution level must be basic, advanced, or expert' },
            { status: 400 }
          );
        }

        if (newSettings.riskTolerance &&
            !['conservative', 'moderate', 'aggressive'].includes(newSettings.riskTolerance)) {
          return NextResponse.json(
            { error: 'Risk tolerance must be conservative, moderate, or aggressive' },
            { status: 400 }
          );
        }

        // Validate custom prompts if provided
        if (newSettings.customPrompts) {
          if (!Array.isArray(newSettings.customPrompts)) {
            return NextResponse.json(
              { error: 'Custom prompts must be an array' },
              { status: 400 }
            );
          }

          for (const prompt of newSettings.customPrompts) {
            if (!prompt.name || !prompt.prompt) {
              return NextResponse.json(
                { error: 'Each custom prompt must have a name and content' },
                { status: 400 }
              );
            }

            if (!['analysis', 'automation', 'troubleshooting', 'optimization', 'custom'].includes(prompt.category)) {
              return NextResponse.json(
                { error: 'Invalid prompt category' },
                { status: 400 }
              );
            }
          }
        }

        // Update Agent Evolver settings
        settings.agentEvolver = { ...settings.agentEvolver, ...newSettings };

        // Record evolution change if Agent Evolver is enabled
        if (newSettings.enabled && !settings.agentEvolver.enabled) {
          const evolutionRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            type: 'configuration_change',
            description: 'Agent Evolver enabled',
            success: true,
            improvement: 0,
            metadata: { previousState: 'disabled', newState: 'enabled' }
          };
          settings.agentEvolver.evolutionHistory = [
            evolutionRecord,
            ...(settings.agentEvolver.evolutionHistory || [])
          ].slice(0, 100); // Keep only last 100 records
        }

        return NextResponse.json({
          success: true,
          message: 'Agent Evolver settings updated successfully',
          agentEvolverSettings: settings.agentEvolver
        });

      case 'add_evolution_record':
        if (!newSettings || !newSettings.record) {
          return NextResponse.json(
            { error: 'Missing evolution record' },
            { status: 400 }
          );
        }

        const evolutionRecord = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ...newSettings.record
        };

        if (!settings.agentEvolver.evolutionHistory) {
          settings.agentEvolver.evolutionHistory = [];
        }

        settings.agentEvolver.evolutionHistory = [
          evolutionRecord,
          ...settings.agentEvolver.evolutionHistory
        ].slice(0, 100); // Keep only last 100 records

        // Update performance metrics
        if (evolutionRecord.success) {
          settings.agentEvolver.performanceMetrics.successfulEvolutions++;
          settings.agentEvolver.performanceMetrics.totalOptimizations++;
          if (evolutionRecord.improvement) {
            const currentAvg = settings.agentEvolver.performanceMetrics.averageImprovement;
            const count = settings.agentEvolver.performanceMetrics.successfulEvolutions;
            settings.agentEvolver.performanceMetrics.averageImprovement =
              (currentAvg * (count - 1) + evolutionRecord.improvement) / count;
          }
        } else {
          settings.agentEvolver.performanceMetrics.failedEvolutions++;
          settings.agentEvolver.performanceMetrics.totalOptimizations++;
        }

        return NextResponse.json({
          success: true,
          message: 'Evolution record added successfully',
          recordId: evolutionRecord.id
        });

      case 'clear_evolution_history':
        settings.agentEvolver.evolutionHistory = [];

        // Reset performance metrics
        settings.agentEvolver.performanceMetrics = {
          ...settings.agentEvolver.performanceMetrics,
          totalOptimizations: 0,
          successfulEvolutions: 0,
          failedEvolutions: 0,
          averageImprovement: 0,
          evolutionProgress: 0
        };

        return NextResponse.json({
          success: true,
          message: 'Evolution history cleared successfully'
        });

      case 'reset_agent_evolver':
        // Reset to default Agent Evolver settings
        settings.agentEvolver = { ...defaultSettings.agentEvolver };

        return NextResponse.json({
          success: true,
          message: 'Agent Evolver reset to default settings',
          agentEvolverSettings: settings.agentEvolver
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
    if (provider === 'lm-studio') {
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
    } else if (provider === 'openai') {
      // Get OpenAI-compatible models
      if (!settings.openai.apiKey) {
        return {
          success: false,
          message: 'API key required',
          models: []
        };
      }

      const response = await fetch(`${settings.openai.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];

        // Filter for suitable models
        const filteredModels = models
          .filter((model: any) => {
            return model.id.includes('gpt') ||
                   model.id.includes('chat') ||
                   model.id.includes('instruct') ||
                   model.id.includes('turbo');
          })
          .slice(0, 20)
          .map((model: any) => ({
            id: model.id,
            name: model.id,
            provider: 'openai',
            capabilities: determineCapabilities(model.id),
            contextLength: model.context_length || 4096
          }));

        return {
          success: true,
          message: `Found ${filteredModels.length} OpenAI-compatible models`,
          models: filteredModels
        };
      } else {
        return {
          success: false,
          message: 'OpenAI-compatible API error',
          models: []
        };
      }
    } else if (provider === 'gemini') {
      // Get Google Gemini models
      if (!settings.gemini.apiKey) {
        return {
          success: false,
          message: 'Gemini API key required',
          models: []
        };
      }

      // Gemini uses OpenAI-compatible API
      const response = await fetch(`${settings.gemini.baseUrl}models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.gemini.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];

        const filteredModels = models
          .filter((model: any) => model.id.includes('gemini'))
          .map((model: any) => ({
            id: model.id,
            name: model.id,
            provider: 'gemini',
            capabilities: determineCapabilities(model.id),
            contextLength: model.context_length || 32768
          }));

        // Add well-known models if not in response
        const knownModels = [
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

        const allModels = [...filteredModels];
        knownModels.forEach(known => {
          if (!allModels.find(m => m.id === known.id)) {
            allModels.push(known);
          }
        });

        return {
          success: true,
          message: `Found ${allModels.length} Gemini models`,
          models: allModels
        };
      } else {
        // Return known models even if API fails
        return {
          success: true,
          message: 'Using default Gemini models',
          models: [
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
          ]
        };
      }
    } else if (provider === 'groq') {
      // Get Groq models
      if (!settings.groq.apiKey) {
        return {
          success: false,
          message: 'Groq API key required',
          models: []
        };
      }

      // Groq uses OpenAI-compatible API
      const response = await fetch(`${settings.groq.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.groq.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];

        const filteredModels = models
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

        return {
          success: true,
          message: `Found ${filteredModels.length} Groq models`,
          models: filteredModels
        };
      } else {
        // Return known models even if API fails
        return {
          success: true,
          message: 'Using default Groq models',
          models: [
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
          ]
        };
      }
    } else if (provider === 'anthropic') {
      // Get Anthropic Claude models
      if (!settings.anthropic.apiKey) {
        return {
          success: false,
          message: 'Anthropic API key required',
          models: []
        };
      }

      // Anthropic doesn't have a models endpoint, return known models
      return {
        success: true,
        message: 'Anthropic Claude models',
        models: [
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
        ]
      };
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
    if (provider === 'lm-studio') {
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
    } else if (provider === 'openai') {
      // Test OpenAI-compatible connection
      if (!settings.openai.apiKey) {
        return {
          success: false,
          message: 'API key required',
          details: { error: 'Missing API key' }
        };
      }

      const response = await fetch(`${settings.openai.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.openai.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const models = await response.json();
        return {
          success: true,
          message: 'OpenAI-compatible connection successful',
          details: { availableModels: models.data?.length || 0 }
        };
      } else {
        return {
          success: false,
          message: 'OpenAI-compatible connection failed',
          details: { status: response.status, statusText: response.statusText }
        };
      }
    } else if (provider === 'gemini') {
      // Test Gemini connection
      if (!settings.gemini.apiKey) {
        return {
          success: false,
          message: 'Gemini API key required',
          details: { error: 'Missing API key' }
        };
      }

      const response = await fetch(`${settings.gemini.baseUrl}models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.gemini.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const models = await response.json();
        return {
          success: true,
          message: 'Gemini connection successful',
          details: {
            availableModels: models.data?.length || 3,
            note: 'Gemini uses OpenAI-compatible API format'
          }
        };
      } else {
        return {
          success: false,
          message: 'Gemini connection failed',
          details: { status: response.status, statusText: response.statusText }
        };
      }
    } else if (provider === 'groq') {
      // Test Groq connection
      if (!settings.groq.apiKey) {
        return {
          success: false,
          message: 'Groq API key required',
          details: { error: 'Missing API key' }
        };
      }

      const response = await fetch(`${settings.groq.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.groq.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const models = await response.json();
        return {
          success: true,
          message: 'Groq connection successful',
          details: {
            availableModels: models.data?.length || 3,
            note: 'Groq uses OpenAI-compatible API with fast inference'
          }
        };
      } else {
        return {
          success: false,
          message: 'Groq connection failed',
          details: { status: response.status, statusText: response.statusText }
        };
      }
    } else if (provider === 'anthropic') {
      // Test Anthropic connection
      if (!settings.anthropic.apiKey) {
        return {
          success: false,
          message: 'Anthropic API key required',
          details: { error: 'Missing API key' }
        };
      }

      // Test with a minimal request to Anthropic API
      const response = await fetch(`${settings.anthropic.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': settings.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.anthropic.model,
          max_tokens: 10,
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Anthropic connection successful',
          details: {
            model: settings.anthropic.model,
            note: 'Anthropic uses custom API format (not OpenAI-compatible)'
          }
        };
      } else {
        return {
          success: false,
          message: 'Anthropic connection failed',
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