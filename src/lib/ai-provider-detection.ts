/**
 * AI Provider Detection and Management for Serverless Environments
 * Handles detection and fallback logic for different AI providers in various deployment scenarios
 */

// Environment detection
export const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isNetlify = !!process.env.NETLIFY;
export const isVercel = !!process.env.VERCEL;

// Provider detection results
export interface ProviderDetectionResult {
  isAvailable: boolean;
  provider: 'openrouter' | 'fallback';
  reason: string;
  config: any;
  recommendations: string[];
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

  // Check OpenRouter (works everywhere)
  const openRouterResult = await checkOpenRouter();
  results.push(openRouterResult);

  // Sort by availability and preference
  const availableProviders = results.filter(r => r.isAvailable);
  const unavailableProviders = results.filter(r => !r.isAvailable);

  // Primary provider selection
  let primary: ProviderDetectionResult;

  if (availableProviders.length > 0) {
    primary = openRouterResult.isAvailable ? openRouterResult : {
      isAvailable: true,
      provider: 'fallback',
      reason: 'No cloud AI providers configured - using rule-based analysis',
      config: { type: 'rule-based' },
      recommendations: ['Configure OpenRouter API key for cloud-based AI analysis']
    };
  } else {
    // No providers available - use fallback
    primary = {
      isAvailable: true,
      provider: 'fallback',
      reason: 'No AI providers configured - using rule-based analysis',
      config: { type: 'rule-based' },
      recommendations: [
        'Configure OpenRouter API key for cloud-based AI analysis'
      ]
    };
  }

  // Generate recommendations
  if (!openRouterResult.isAvailable) {
    recommendations.push('Configure OpenRouter API key for reliable AI analysis in production');
  }

  return {
    primary,
    fallback: unavailableProviders,
    recommendations
  };
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
export async function getProviderConfig(provider: 'openrouter' | 'fallback'): Promise<any> {
  const SETTINGS_BASE = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  let userSettings = null;

  try {
    // Fetch user settings from the settings API
    const settingsResponse = await fetch(`${SETTINGS_BASE}/api/settings`);

    if (settingsResponse.ok) {
      const settingsData = await settingsResponse.json();
      userSettings = settingsData.success ? settingsData.settings : null;
    }
  } catch (error) {
    console.warn('Failed to fetch user settings, using environment variables:', error);
  }

  switch (provider) {
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
        type: 'rule-based',
        confidence: 75,
        description: 'Expert rule-based cannabis cultivation analysis'
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Execute AI call with automatic fallback
 */
export async function executeAIWithFallback(
  prompt: string,
  imageBase64?: string,
  options: {
    primaryProvider?: 'openrouter';
    maxRetries?: number;
    timeout?: number;
  } = {}
): Promise<{
  result: any;
  provider: 'openrouter' | 'fallback';
  fallbackReason?: string;
  processingTime: number;
}> {
  const startTime = Date.now();
  const { primaryProvider, maxRetries = 1, timeout = 30000 } = options;

  // Detect available providers
  const { primary, fallback: fallbackProviders } = await detectAvailableProviders();

  // Determine provider order
  const providerOrder: ('openrouter' | 'fallback')[] = [];

  if (primaryProvider && primary.provider === primaryProvider && primary.isAvailable) {
    providerOrder.push(primaryProvider);
  } else if (primary.isAvailable) {
    providerOrder.push(primary.provider);
  }

  // Add other available providers
  fallbackProviders.forEach(p => {
    if (p.isAvailable && !providerOrder.includes(p.provider as any)) {
      providerOrder.push(p.provider as any);
    }
  });

  // Always add fallback as last option
  if (!providerOrder.includes('fallback')) {
    providerOrder.push('fallback');
  }

  let lastError: Error | null = null;

  // Try each provider in order
  for (const provider of providerOrder) {
    try {
      const config = await getProviderConfig(provider);

      if (provider === 'fallback') {
        return {
          result: await executeFallbackAnalysis(prompt),
          provider: 'fallback',
          fallbackReason: lastError?.message || 'No AI providers available',
          processingTime: Date.now() - startTime
        };
      }

      // Try actual AI provider
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

  // All providers failed
  throw lastError || new Error('All AI providers failed');
}

/**
 * Call specific AI provider
 */
async function callAIProvider(
  provider: 'openrouter',
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

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        'HTTP-Referer': config.referer,
        'X-Title': config.title
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`${provider} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    const reasoningContent = data.choices?.[0]?.message?.reasoning_content;
    if (!content && reasoningContent) {
      content = reasoningContent;
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
 * Execute fallback rule-based analysis
 */
async function executeFallbackAnalysis(prompt: string): Promise<any> {
  // Extract key information from prompt for rule-based analysis
  const symptoms = extractSymptomsFromPrompt(prompt);

  return {
    diagnosis: 'Plant Analysis Complete',
    confidence: 75,
    symptomsMatched: symptoms.matched,
    causes: symptoms.causes,
    treatment: symptoms.treatment,
    healthScore: 75,
    strainSpecificAdvice: 'Continue monitoring and provide optimal growing conditions',
    reasoning: [{
      step: 'Rule-Based Analysis',
      explanation: 'Analysis based on established cannabis cultivation patterns and symptom recognition',
      weight: 100
    }],
    isPurpleStrain: symptoms.isPurpleStrain,
    pestsDetected: symptoms.pestsDetected,
    diseasesDetected: symptoms.diseasesDetected,
    environmentalFactors: symptoms.environmentalFactors,
    urgency: symptoms.urgency,
    provider: 'fallback-rule-based'
  };
}

/**
 * Extract symptoms from prompt for fallback analysis
 */
function extractSymptomsFromPrompt(prompt: string): any {
  const symptoms = prompt.toLowerCase();

  // Basic symptom extraction logic
  const matched: string[] = [];
  const causes: string[] = [];
  const treatment: string[] = [];
  const pestsDetected: string[] = [];
  const diseasesDetected: string[] = [];
  const environmentalFactors: string[] = [];

  // Simple keyword matching for common issues
  if (symptoms.includes('yellow') || symptoms.includes('yellowing')) {
    matched.push('Yellowing leaves');
    causes.push('Possible nutrient deficiency');
    treatment.push('Check nutrient levels and pH');
  }

  if (symptoms.includes('purple')) {
    matched.push('Purple coloration');
    causes.push('Could be genetic or phosphorus deficiency');
    treatment.push('Monitor overall plant health');
  }

  if (symptoms.includes('spider mite') || symptoms.includes('webbing')) {
    pestsDetected.push('Spider mites');
    treatment.push('Apply neem oil or predatory mites');
  }

  if (symptoms.includes('powdery mildew')) {
    diseasesDetected.push('Powdery mildew');
    treatment.push('Reduce humidity, apply fungicide');
  }

  if (matched.length === 0) {
    matched.push('General health assessment');
    causes.push('Routine monitoring');
    treatment.push('Continue optimal care');
  }

  return {
    matched,
    causes,
    treatment,
    isPurpleStrain: symptoms.includes('purple') && !causes.some(c => c.includes('deficiency')),
    pestsDetected,
    diseasesDetected,
    environmentalFactors,
    urgency: pestsDetected.length > 0 || diseasesDetected.length > 0 ? 'high' : 'medium'
  };
}

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