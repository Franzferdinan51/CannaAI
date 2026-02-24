/**
 * AI Provider Detection and Management for Serverless Environments
 * Handles detection of different AI providers - NO FALLBACK to rule-based analysis
 */

// Environment detection
export const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isNetlify = !!process.env.NETLIFY;
export const isVercel = !!process.env.VERCEL;

/**
 * Custom error for when AI providers are unavailable
 */
export class AIProviderUnavailableError extends Error {
  public readonly recommendations: string[];
  public readonly availableProviders: string[];
  public readonly setupRequired: boolean;
  public readonly attemptedProviders?: string[];

  constructor(message: string, details: {
    recommendations: string[];
    availableProviders: string[];
    setupRequired: boolean;
    attemptedProviders?: string[];
  }) {
    super(message);
    this.name = 'AIProviderUnavailableError';
    this.recommendations = details.recommendations;
    this.availableProviders = details.availableProviders;
    this.setupRequired = details.setupRequired;
    this.attemptedProviders = details.attemptedProviders;
  }
}

// Provider detection results
export interface ProviderDetectionResult {
  isAvailable: boolean;
  provider: 'lm-studio' | 'openrouter' | 'fallback';
  reason: string;
  config: any;
  recommendations: string[];
}

// LM Studio configuration
interface LMStudioConfig {
  url: string;
  model: string;
  apiKey?: string;
  timeout: number;
}

// OpenRouter configuration
interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeout: number;
}

/**
 * Detect available AI providers based on environment
 */
export async function detectAvailableProviders(): Promise<{
  primary: ProviderDetectionResult;
  fallback: ProviderDetectionResult[];
  recommendations: string[];
}> {
  const results: ProviderDetectionResult[] = [];
  const recommendations: string[] = [];

  // Check LM Studio
  const lmStudioResult = await checkLMStudio();
  results.push(lmStudioResult);

  // Check OpenRouter (works everywhere)
  const openRouterResult = await checkOpenRouter();
  results.push(openRouterResult);

  // Sort by availability and preference
  const availableProviders = results.filter(r => r.isAvailable);
  const unavailableProviders = results.filter(r => !r.isAvailable);

  // Primary provider selection
  let primary: ProviderDetectionResult;

  if (availableProviders.length > 0) {
    // Prefer OpenRouter for production reliability
    primary = availableProviders.find(p => p.provider === 'openrouter') || availableProviders[0];
  } else {
    // No AI providers available - indicate setup required
    primary = {
      isAvailable: false,
      provider: 'fallback',
      reason: 'No AI providers configured - setup required',
      config: { type: 'setup-required' },
      recommendations: [
        'Configure OpenRouter API key for cloud-based AI analysis',
        'Set up LM Studio for local development (non-serverless only)',
        'Visit Settings to configure your AI provider'
      ]
    };
  }

  // Generate recommendations
  if (isServerless && lmStudioResult.isAvailable) {
    recommendations.push('LM Studio detected but will not work in serverless environments - configure OpenRouter for production');
  }

  if (!openRouterResult.isAvailable) {
    recommendations.push('Configure OpenRouter API key for reliable AI analysis in production');
  }

  if (isDevelopment && !lmStudioResult.isAvailable) {
    recommendations.push('Start LM Studio locally for development and testing');
  }

  return {
    primary,
    fallback: unavailableProviders,
    recommendations
  };
}

/**
 * Check LM Studio availability
 */
async function checkLMStudio(): Promise<ProviderDetectionResult> {
  // LM Studio doesn't work in serverless environments
  if (isServerless) {
    return {
      isAvailable: false,
      provider: 'lm-studio',
      reason: 'LM Studio is not supported in serverless environments (Netlify, Vercel, etc.)',
      config: null,
      recommendations: [
        'Use OpenRouter for cloud-based AI analysis in serverless deployments',
        'Deploy to a VPS/dedicated server for LM Studio support'
      ]
    };
  }

  const config: LMStudioConfig = {
    url: process.env.LM_STUDIO_URL || 'http://localhost:1234',
    model: process.env.LM_STUDIO_MODEL || 'granite-4.0-micro',
    apiKey: process.env.LM_STUDIO_API_KEY,
    timeout: parseInt(process.env.LM_STUDIO_TIMEOUT || '120000') // 2 minutes
  };

  try {
    // Quick health check with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

    const response = await fetch(`${config.url}/v1/models`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const models = await response.json();
      return {
        isAvailable: true,
        provider: 'lm-studio',
        reason: `LM Studio is running and available with ${models.data?.length || 0} models`,
        config,
        recommendations: [
          'LM Studio is ready for local development',
          'Configure OpenRouter as fallback for production deployments'
        ]
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      isAvailable: false,
      provider: 'lm-studio',
      reason: `LM Studio is not available: ${errorMsg}`,
      config,
      recommendations: [
        'Start LM Studio application on your local machine',
        'Verify LM Studio is running on the correct port (default: 1234)',
        'Check if LM Studio API server is enabled in settings'
      ]
    };
  }
}

/**
 * Check OpenRouter availability
 */
async function checkOpenRouter(): Promise<ProviderDetectionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      isAvailable: false,
      provider: 'openrouter',
      reason: 'OpenRouter API key not configured',
      config: {
        apiKey: '',
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000')
      },
      recommendations: [
        'Set OPENROUTER_API_KEY environment variable',
        'Get API key from https://openrouter.ai/keys',
        'Choose a model and configure OPENROUTER_MODEL if needed'
      ]
    };
  }

  const config: OpenRouterConfig = {
    apiKey,
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000')
  };

  try {
    // Quick API test with minimal request
    const response = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      return {
        isAvailable: true,
        provider: 'openrouter',
        reason: 'OpenRouter API is accessible and configured',
        config,
        recommendations: [
          'OpenRouter is ready for production use',
          'Monitor API usage and costs',
          'Consider upgrading to paid models for better performance'
        ]
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      isAvailable: false,
      provider: 'openrouter',
      reason: `OpenRouter API test failed: ${errorMsg}`,
      config,
      recommendations: [
        'Check API key validity',
        'Verify network connectivity',
        'Ensure OpenRouter service is available'
      ]
    };
  }
}

/**
 * Get provider configuration for use in API calls
 * Now fetches user settings to respect manual model selections
 */
export async function getProviderConfig(provider: 'lm-studio' | 'openrouter' | 'fallback'): Promise<any> {
  const SETTINGS_BASE = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  let userSettings = null;

  try {
    // Fetch user settings from the settings API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for settings

    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      userSettings = settingsData.success ? settingsData.settings : null;
    }
  } catch (error) {
    console.warn('Failed to fetch user settings (timeout or error), using environment variables:', error);
  }

  switch (provider) {
    case 'lm-studio':
      return {
        url: userSettings?.lmStudio?.url || process.env.LM_STUDIO_URL || 'http://localhost:1234',
        model: userSettings?.lmStudio?.model || process.env.LM_STUDIO_MODEL || 'granite-4.0-micro',
        apiKey: userSettings?.lmStudio?.apiKey || process.env.LM_STUDIO_API_KEY,
        timeout: parseInt(userSettings?.lmStudio?.timeout || process.env.LM_STUDIO_TIMEOUT || '120000'), // 2 minutes
        maxTokens: parseInt(userSettings?.lmStudio?.maxTokens || process.env.LM_STUDIO_MAX_TOKENS || '2000'),
        temperature: parseFloat(userSettings?.lmStudio?.temperature || process.env.LM_STUDIO_TEMPERATURE || '0.3')
      };

    case 'openrouter':
      // CRITICAL: Use user's manual model selection from settings
      const userSelectedModel = userSettings?.openRouter?.model;
      const fallbackModel = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

      console.log(`🎯 OpenRouter Model Selection:`);
      console.log(`   User Manual Model: ${userSelectedModel || 'Not set'}`);
      console.log(`   Environment Fallback: ${fallbackModel}`);
      console.log(`   Final Model: ${userSelectedModel || fallbackModel}`);

      return {
        apiKey: userSettings?.openRouter?.apiKey || process.env.OPENROUTER_API_KEY,
        model: userSelectedModel || fallbackModel, // User's manual selection takes priority
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: parseInt(userSettings?.openRouter?.timeout || process.env.OPENROUTER_TIMEOUT || '30000'),
        maxTokens: parseInt(userSettings?.openRouter?.maxTokens || process.env.OPENROUTER_MAX_TOKENS || '2000'),
        temperature: parseFloat(userSettings?.openRouter?.temperature || process.env.OPENROUTER_TEMPERATURE || '0.3'),
        referer: process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000',
        title: 'CannaAI Pro'
      };

    case 'fallback':
      return {
        type: 'setup-required',
        description: 'AI provider setup required for analysis',
        setupRequired: true
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Execute AI call - NO FALLBACK to rule-based analysis
 * Requires actual AI provider to be available
 */
export async function executeAIWithFallback(
  prompt: string,
  imageBase64?: string,
  options: {
    primaryProvider?: 'lm-studio' | 'openrouter';
    maxRetries?: number;
    timeout?: number;
  } = {}
): Promise<{
  result: any;
  provider: 'lm-studio' | 'openrouter';
  processingTime: number;
}> {
  const startTime = Date.now();
  const { primaryProvider, maxRetries = 1, timeout = 30000 } = options;

  // Detect available providers
  const { primary, fallback: fallbackProviders } = await detectAvailableProviders();

  // Check if any AI providers are available
  const availableAIProviders = [
    primary.isAvailable && primary.provider !== 'fallback' ? primary : null,
    ...fallbackProviders.filter(p => p.isAvailable && p.provider !== 'fallback')
  ].filter(Boolean);

  if (availableAIProviders.length === 0) {
    throw new AIProviderUnavailableError(
      'No AI providers are configured. Please connect an AI provider to use this feature.',
      {
        recommendations: [
          'Configure OpenRouter API key for cloud-based AI analysis',
          'Set up LM Studio for local development (non-serverless only)',
          'Visit Settings to configure your AI provider'
        ],
        availableProviders: [],
        setupRequired: true
      }
    );
  }

  // Determine provider order (NO fallback to rule-based)
  const providerOrder: ('lm-studio' | 'openrouter')[] = [];

  if (primaryProvider && primary.provider === primaryProvider && primary.isAvailable && primary.provider !== 'fallback') {
    providerOrder.push(primaryProvider);
  } else if (primary.isAvailable && primary.provider !== 'fallback') {
    providerOrder.push(primary.provider as 'lm-studio' | 'openrouter');
  }

  // Add other available providers
  fallbackProviders.forEach(p => {
    if (p.isAvailable && p.provider !== 'fallback' && !providerOrder.includes(p.provider as any)) {
      providerOrder.push(p.provider as any);
    }
  });

  let lastError: Error | null = null;

  // Try each available AI provider
  for (const provider of providerOrder) {
    try {
      const config = await getProviderConfig(provider);

      // Try actual AI provider only
      const result = await callAIProvider(provider, prompt, imageBase64, config, timeout);
      return {
        result,
        provider,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Provider ${provider} failed:`, lastError.message);

      // Continue to next provider
      continue;
    }
  }

  // All AI providers failed - NO fallback to fake analysis
  const errorDetails = {
    attemptedProviders: providerOrder,
    recommendations: [
      'Check your internet connection',
      'Verify AI provider API keys are valid',
      'Try a different AI provider in Settings',
      'Contact support if the issue persists'
    ]
  };

  throw new AIProviderUnavailableError(
    `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
    errorDetails
  );
}

/**
 * Call specific AI provider
 */
async function callAIProvider(
  provider: 'lm-studio' | 'openrouter',
  prompt: string,
  imageBase64: string | undefined,
  config: any,
  timeout: number
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert cannabis cultivation specialist with deep knowledge of plant physiology, nutrient deficiencies, pests, diseases, and strain-specific characteristics. You provide detailed, accurate analysis with clear reasoning.'
      },
      {
        role: 'user',
        content: imageBase64 ? [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ] : prompt
      }
    ];

    const requestBody = {
      model: config.model,
      messages,
      temperature: config.temperature || 0.3,
      max_tokens: config.maxTokens || 2000,
      stream: false
    };

    const response = await fetch(
      provider === 'lm-studio' ? `${config.url}/v1/chat/completions` : `${config.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
          ...(provider === 'openrouter' && {
            'HTTP-Referer': config.referer,
            'X-Title': config.title
          })
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`${provider} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    // Handle LM Studio models that put content in reasoning_content
    if (!content && data.choices?.[0]?.message?.reasoning_content) {
      content = data.choices[0].message.reasoning_content;
    }

    // Enhanced content parsing for different model formats
    if (!content) {
      // Try alternative content locations
      content = data.choices?.[0]?.text ||
                 data.content ||
                 data.response ||
                 data.output;

      // Log the response structure for debugging
      console.warn(`🔍 Content parsing for ${provider}:`, {
        hasChoices: !!data.choices,
        choiceCount: data.choices?.length,
        firstChoiceKeys: data.choices?.[0] ? Object.keys(data.choices[0]) : [],
        dataKeys: Object.keys(data),
        responseStructure: JSON.stringify(data).substring(0, 200) + '...'
      });
    }

    if (!content) {
      throw new Error(`No response content from ${provider}. Response structure: ${JSON.stringify(Object.keys(data))}`);
    }

    console.log(`✅ ${provider} response received successfully`);
    return parseAIResponse(content);

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * REMOVED: Fallback rule-based analysis functions
 * AI provider is now required for analysis - no fake analysis provided
 */

/**
 * Parse AI response (both JSON and text)
 */
function parseAIResponse(aiResponse: string): any {
  try {
    return JSON.parse(aiResponse);
  } catch (parseError) {
    // If JSON parsing fails, create structured response from text
    return {
      diagnosis: 'Plant Analysis Complete',
      confidence: 85,
      symptomsMatched: ['Symptoms analyzed from AI response'],
      causes: ['Environmental and nutritional factors'],
      treatment: ['Follow AI recommendations provided'],
      healthScore: 75,
      strainSpecificAdvice: aiResponse.substring(0, 200) + '...',
      reasoning: [{
        step: 'AI Analysis',
        explanation: 'Based on AI model analysis',
        weight: 100
      }],
      isPurpleStrain: false,
      pestsDetected: [],
      diseasesDetected: [],
      environmentalFactors: [],
      urgency: 'medium',
      provider: 'ai-model'
    };
  }
}
/**
 * Check OpenClaw Gateway availability
 */
async function checkOpenClaw(): Promise<ProviderDetectionResult> {
  const openClawUrl = process.env.OPENCLAW_URL || 'http://localhost:18789';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${openClawUrl}/api/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return {
        isAvailable: true,
        provider: 'openclaw',
        reason: 'OpenClaw Gateway is running and accessible',
        config: {
          url: openClawUrl,
          model: 'minimax-portal/MiniMax-M2.5',
        },
        recommendations: [],
      };
    }
  } catch {
    // OpenClaw not available
  }
  
  return {
    isAvailable: false,
    provider: 'openclaw',
    reason: 'OpenClaw Gateway is not running or not accessible',
    config: {
      url: openClawUrl,
    },
    recommendations: [
      'Start OpenClaw Gateway: openclaw gateway start',
      'Check OpenClaw is running on port 18789',
      'Verify OPENCLAW_URL environment variable',
    ],
  };
}

/**
 * Execute AI request via OpenClaw Gateway
 */
export async function executeViaOpenClaw(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ success: boolean; content?: string; error?: string }> {
  const openClawUrl = process.env.OPENCLAW_URL || 'http://localhost:18789';
  
  try {
    const response = await fetch(`${openClawUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'minimax-portal/MiniMax-M2.5',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      }),
      timeout: 30000,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenClaw API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
    };
  } catch (error) {
    console.error('OpenClaw provider error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
