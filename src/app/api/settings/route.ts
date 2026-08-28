import { NextRequest, NextResponse } from 'next/server';
import { maskSettings, safeMergeSettings } from '@/lib/settings-security';
import { getUnifiedAI } from '@/lib/ai-providers/unified-ai';
import { providerAuthStatus } from '@/lib/provider-auth';
import { prisma } from '@/lib/prisma';
import { getLMStudioApiKey } from '@/lib/ai-provider-lmstudio';

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
  // Keep the settings UI aligned with the runtime chain: LM Studio is the
  // local-first provider, while OpenClaw/Hermes remain agent fallbacks.
  aiProvider: 'lm-studio',
  lmStudio: {
    url: 'http://localhost:1234',
    apiKey: '',
    // Resolve the model currently loaded in LM Studio at request time.
    model: ''
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: 'nvidia/nemotron-nano-12b-v2-vl:free',  // FREE backup model
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
  grok: {
    apiKey: '',
    model: process.env.XAI_MODEL || 'grok-4.20-0309-reasoning',
    baseUrl: 'openclaw://xai',
    managedAuth: true
  },
  openclaw: {
    apiKey: '',
    model: process.env.OPENCLAW_MODEL || '',
    baseUrl: 'openclaw://gateway/acp',
    transport: 'acp',
    managedAuth: true
  },
  hermes: {
    apiKey: '',
    model: process.env.HERMES_MODEL || '',
    baseUrl: process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1',
    transport: 'hermes-api-server',
    managedAuth: true
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://ai.gigamind.dev/claude-code'
  },
  bailian: {
    apiKey: process.env.ALIBABA_API_KEY || '',
    model: process.env.QWEN_MODEL || 'qwen-vl-max-latest',
    baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
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

let settings: any = { ...defaultSettings };
let settingsLoaded = false;
let settingsRecordId = 1;
const SETTINGS_DATABASE_TIMEOUT_MS = 2000;

// AbortSignal.timeout is unavailable in older Node runtimes used by some
// local installs. Keep the settings probes portable without changing their
// timeout behavior.
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
}

async function withSettingsDatabaseTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Settings database operation timed out after ${SETTINGS_DATABASE_TIMEOUT_MS}ms`)), SETTINGS_DATABASE_TIMEOUT_MS);
      timer.unref?.();
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadSettings(): Promise<void> {
  if (settingsLoaded) return;
  try {
    const stored = await withSettingsDatabaseTimeout(
      prisma.automationSetting.findFirst({ orderBy: { updatedAt: 'desc' } }),
    );
    if (stored?.config && typeof stored.config === 'object' && !Array.isArray(stored.config)) {
      settings = safeMergeSettings(defaultSettings, stored.config);
      if (settings.lmStudio?.model === 'llama-3-8b-instruct') {
        settings.lmStudio.model = '';
      }
      settingsRecordId = stored.id;
    }
  } catch (error) {
    // Keep development/static installs usable before the Prisma schema exists.
    console.warn('[SETTINGS] Durable settings unavailable; using process memory:', error);
  } finally {
    settingsLoaded = true;
  }
}

async function persistSettings(): Promise<boolean> {
  try {
    await withSettingsDatabaseTimeout(
      prisma.automationSetting.upsert({
        where: { id: settingsRecordId },
        update: { config: settings },
        create: { id: settingsRecordId, config: settings },
      }),
    );
    return true;
  } catch (error) {
    console.warn('[SETTINGS] Could not persist settings; retaining process-local changes:', error);
    return false;
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

  try {
    await loadSettings();
    return NextResponse.json({
      success: true,
      settings: maskSettings(settings)
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
    await loadSettings();
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
          settings.lmStudio = safeMergeSettings(settings.lmStudio, config);
        } else if (provider === 'openrouter') {
          settings.openRouter = safeMergeSettings(settings.openRouter, config);
        } else if (provider === 'openai') {
          settings.openai = safeMergeSettings(settings.openai, config);
        } else if (provider === 'gemini') {
          settings.gemini = safeMergeSettings(settings.gemini, config);
        } else if (provider === 'groq') {
          settings.groq = safeMergeSettings(settings.groq, config);
        } else if (provider === 'anthropic') {
          settings.anthropic = safeMergeSettings(settings.anthropic, config);
        } else if (['grok', 'openclaw', 'hermes'].includes(provider)) {
          settings[provider] = safeMergeSettings(settings[provider], config);
        } else {
          return NextResponse.json(
            { error: 'Invalid provider' },
            { status: 400 }
          );
        }

        const providerPersisted = await persistSettings();
        return NextResponse.json({
          success: true,
          message: `${provider} settings updated successfully`,
          settings: maskSettings(settings[provider]),
          persistence: providerPersisted ? 'database' : 'memory'
        });

      case 'switch_provider':
        if (!provider) {
          return NextResponse.json(
            { error: 'Missing provider' },
            { status: 400 }
          );
        }

        if (!['lm-studio', 'openrouter', 'openai', 'gemini', 'groq', 'anthropic', 'grok', 'openclaw', 'hermes'].includes(provider)) {
          return NextResponse.json(
            { error: 'Invalid provider' },
            { status: 400 }
          );
        }

        settings.aiProvider = provider;

        const switchPersisted = await persistSettings();
        return NextResponse.json({
          success: true,
          message: `Switched to ${provider}`,
          currentProvider: settings.aiProvider,
          persistence: switchPersisted ? 'database' : 'memory'
        });

      case 'update_notifications':
        if (!config) {
          return NextResponse.json(
            { error: 'Missing config' },
            { status: 400 }
          );
        }

        settings.notifications = { ...settings.notifications, ...config };

        const notificationPersisted = await persistSettings();
        return NextResponse.json({
          success: true,
          message: 'Notification settings updated',
          notifications: settings.notifications,
          persistence: notificationPersisted ? 'database' : 'memory'
        });

      case 'update_units':
        if (!config) {
          return NextResponse.json(
            { error: 'Missing config' },
            { status: 400 }
          );
        }

        settings.units = { ...settings.units, ...config };

        const unitsPersisted = await persistSettings();
        return NextResponse.json({
          success: true,
          message: 'Unit settings updated',
          units: settings.units,
          persistence: unitsPersisted ? 'database' : 'memory'
        });

      case 'update_section': {
        const allowedSections = ['system', 'display', 'data', 'integrations'] as const;
        if (!allowedSections.includes(config?.section as typeof allowedSections[number]) || !config?.values) {
          return NextResponse.json(
            { error: 'Missing or invalid settings section' },
            { status: 400 }
          );
        }

        const section = config.section as typeof allowedSections[number];
        settings[section] = safeMergeSettings(settings[section] || {}, config.values);
        const sectionPersisted = await persistSettings();
        return NextResponse.json({
          success: true,
          message: `${section} settings updated`,
          settings: maskSettings(settings[section]),
          persistence: sectionPersisted ? 'database' : 'memory'
        });
      }

      case 'test_connection':
        if (!provider) {
          return NextResponse.json(
            { error: 'Missing provider' },
            { status: 400 }
          );
        }

        const testResult = await testAIConnection(provider, config);
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

        const modelsResult = await getProviderModels(provider, config);
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

async function getProviderModels(provider: string, configOverride?: Record<string, any>) {
  try {
    if (['grok', 'openclaw', 'hermes'].includes(provider)) {
      const auth = await providerAuthStatus(provider as 'grok' | 'openclaw' | 'hermes');
      const statuses = await getUnifiedAI().refreshProviderHealth();
      const target = provider === 'grok' ? statuses.find((item) => item.name === 'openclaw') : statuses.find((item) => item.name === provider);
      const authenticated = provider === 'openclaw' ? true : auth.authenticated;
      return {
        success: Boolean(target?.health.status === 'healthy' && authenticated),
        message: target?.health.status === 'healthy' && authenticated ? `${provider} is connected and authenticated` : `${provider} is not authenticated or unavailable`,
        models: target?.health.status === 'healthy' ? [{
          id: provider === 'grok' ? 'grok-managed-by-openclaw' : `${provider}-active`,
          name: provider === 'grok' ? 'Grok (OpenClaw OAuth)' : `${provider} active model`,
          provider,
          capabilities: ['text-generation', 'long-context']
        }] : []
      };
    }
    if (provider === 'lm-studio') {
      // Get LM Studio models - doesn't need API key
      const lmStudioConfig = configOverride && typeof configOverride === 'object'
        ? configOverride
        : settings.lmStudio;
      const baseUrl = String(lmStudioConfig.url || 'http://localhost:1234')
        .replace(/\/(?:api\/)?v1\/?$/i, '')
        .replace(/\/api\/?$/i, '')
        .replace(/\/$/, '');
      const apiKey = lmStudioConfig.apiKey || getLMStudioApiKey();
      let data: any = null;
      for (const endpoint of [`${baseUrl}/v1/models`, `${baseUrl}/api/v1/models`]) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            signal: createTimeoutSignal(5000)
          });
          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch {
          // Try the native catalog after the OpenAI-compatible endpoint.
        }
      }

      if (data) {
        const models = (Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [])
          .filter((model: any) => {
            const id = String(model?.id || model?.key || '').trim().toLowerCase();
            return Boolean(id) &&
              model?.type !== 'embedding' &&
              model?.type !== 'reranker' &&
              !id.includes('embedding') &&
              !id.includes('reranker') &&
              !id.includes('embed-') &&
              !id.endsWith('-embed');
          });

        // Format models for frontend
        const formattedModels = models.map((model: any) => {
          const id = model.id || model.key;
          return {
            id,
            name: id,
            provider: 'lm-studio',
            capabilities: [
              ...determineCapabilities(id),
              ...(model.capabilities?.vision === true ? ['vision', 'image-analysis'] : []),
            ].filter((capability, index, all) => all.indexOf(capability) === index),
            contextLength: model.context_length || 4096,
            size: model.size || 'Unknown'
          };
        });

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
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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

async function testAIConnection(provider: string, configOverride?: Record<string, any>) {
  try {
    if (['grok', 'openclaw', 'hermes'].includes(provider)) {
      const auth = await providerAuthStatus(provider as 'grok' | 'openclaw' | 'hermes');
      const statuses = await getUnifiedAI().refreshProviderHealth();
      const target = provider === 'grok' ? statuses.find((item) => item.name === 'openclaw') : statuses.find((item) => item.name === provider);
      const healthy = target?.health.status === 'healthy' && (provider === 'openclaw' || auth.authenticated);
      return {
        success: healthy,
        message: healthy ? `${provider} is connected through its native agent bridge` : `${provider} needs native OAuth login or is unavailable`,
        details: { managedAuth: true, authenticated: auth.authenticated, authSource: auth.source, provider: target?.name || provider, status: target?.health.status || 'unhealthy', next: healthy ? undefined : 'Use Connect OAuth in Settings, then Check.' }
      };
    }
    if (provider === 'lm-studio') {
      // LM Studio may require its local bearer token (newer LM Studio
      // versions do), so use the same authenticated probe as model discovery.
      const lmStudioConfig = configOverride && typeof configOverride === 'object'
        ? { ...settings.lmStudio, ...configOverride }
        : settings.lmStudio;
      const baseUrl = String(lmStudioConfig.url || 'http://localhost:1234')
        .replace(/\/(?:api\/)?v1\/?$/i, '')
        .replace(/\/api\/?$/i, '')
        .replace(/\/$/, '');
      const apiKey = lmStudioConfig.apiKey || getLMStudioApiKey();
      const response = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        // A large local model can take several seconds to answer its catalog
        // probe while it is loading. Keep a bounded timeout, but do not turn
        // normal model-load latency into a false connection failure.
        signal: createTimeoutSignal(15000)
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
        },
        signal: createTimeoutSignal(10000)
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
        },
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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
        signal: createTimeoutSignal(10000)
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
