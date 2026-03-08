/**
 * OpenRouter AI Provider Integration for CannaAI
 * Priority: FREE tier vision models (qwen-vl-max, etc.)
 *
 * Available Vision Models (FREE tier prioritized):
 * - qwen-vl-max: Alibaba's best vision model (FREE quota)
 * - qwen-vl-max-latest: Latest Qwen vision model
 * - meta-llama/llama-3.2-90b-vision-instruct: Meta's vision model (free tier)
 * - openai/gpt-4-vision-preview: OpenAI vision (paid)
 * - google/gemini-pro-vision: Google vision (paid)
 *
 * Fallback chain for vision:
 * 1. qwen-vl-max (FREE, best for plant analysis)
 * 2. meta-llama/llama-3.2-90b-vision-instruct (free tier)
 * 3. qwen-vl-max-latest (backup)
 * 4. Text-only fallback if vision unavailable
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_TIMEOUT_MS = parseInt(process.env.OPENROUTER_TIMEOUT || '60000');

// Vision-capable models prioritized by cost-effectiveness for plant analysis
export const VISION_MODELS = [
  {
    id: 'qwen-vl-max',
    name: 'Qwen-VL-Max (Best for Plants)',
    vision: true,
    cost: 'FREE quota',
    recommended: true
  },
  {
    id: 'qwen-vl-max-latest',
    name: 'Qwen-VL-Max Latest',
    vision: true,
    cost: 'FREE quota'
  },
  {
    id: 'meta-llama/llama-3.2-90b-vision-instruct',
    name: 'Llama 3.2 90B Vision',
    vision: true,
    cost: 'Free tier available'
  },
  {
    id: 'qwen/qwen-2.5-vl-72b-instruct',
    name: 'Qwen 2.5 VL 72B',
    vision: true,
    cost: 'Low cost'
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    vision: true,
    cost: 'FREE'
  }
] as const;

// Text-only fallback models (FREE tier)
export const TEXT_MODELS = [
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B (Free)',
    vision: false,
    cost: 'FREE'
  },
  {
    id: 'google/gemma-2-9b-it:free',
    name: 'Gemma 2 9B (Free)',
    vision: false,
    cost: 'FREE'
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B (Free)',
    vision: false,
    cost: 'FREE'
  }
] as const;

/**
 * Check if OpenRouter is available
 */
export async function checkOpenRouter(): Promise<ProviderDetectionResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      isAvailable: false,
      provider: 'openrouter',
      reason: 'OpenRouter API key not configured',
      config: {
        type: 'openrouter',
        baseUrl: OPENROUTER_BASE_URL,
        models: VISION_MODELS.map(m => m.id)
      },
      recommendations: [
        'Set OPENROUTER_API_KEY in .env.local',
        'Get API key from https://openrouter.ai/keys',
        'FREE tier available with limited quota'
      ]
    };
  }

  try {
    // Quick health check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const models = await response.json();
      const availableVisionModels = VISION_MODELS.filter(vm =>
        models.data?.some((m: any) => m.id === vm.id)
      );

      return {
        isAvailable: true,
        provider: 'openrouter',
        reason: `OpenRouter API accessible, ${availableVisionModels.length} vision models available`,
        config: {
          type: 'openrouter',
          baseUrl: OPENROUTER_BASE_URL,
          apiKey: OPENROUTER_API_KEY,
          models: VISION_MODELS.map(m => m.id),
          visionModels: availableVisionModels.map(m => m.id),
          timeout: OPENROUTER_TIMEOUT_MS
        },
        recommendations: availableVisionModels.length > 0
          ? ['OpenRouter ready for vision-based plant analysis']
          : ['Consider using text-only analysis or configure different models']
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
      config: {
        type: 'openrouter',
        baseUrl: OPENROUTER_BASE_URL,
        models: VISION_MODELS.map(m => m.id)
      },
      recommendations: [
        'Check API key validity at openrouter.ai',
        'Verify network connectivity',
        'Check if FREE tier quota is exhausted'
      ]
    };
  }
}

/**
 * Execute analysis using OpenRouter with vision support
 */
export async function executeWithOpenRouter(params: {
  image?: string;
  prompt: string;
  model?: string;
  requireVision?: boolean;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  provider: string;
  model?: string;
  usage?: any;
}> {
  try {
    const { image, prompt, requireVision = false } = params;

    // Select model based on vision requirement
    let selectedModel = params.model;
    if (!selectedModel) {
      if (image && requireVision) {
        // Use best vision model
        selectedModel = VISION_MODELS.find(m => m.recommended)?.id || VISION_MODELS[0].id;
      } else if (image) {
        // Image provided but vision not explicitly required - try vision anyway
        selectedModel = VISION_MODELS[0].id;
      } else {
        // Text-only - use free tier
        selectedModel = TEXT_MODELS[0].id;
      }
    }

    const isVisionModel = VISION_MODELS.some(m => m.id === selectedModel);

    // Build messages array
    const messages: any[] = [{
      role: 'system',
      content: 'You are an expert cannabis cultivation specialist with deep knowledge of plant physiology, nutrient deficiencies, pests, diseases, and strain-specific characteristics. You provide detailed, accurate analysis with clear reasoning and visual assessment when images are provided.'
    }];

    if (image && isVisionModel) {
      // Vision-capable request
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: image } },
          { type: 'text', text: prompt }
        ]
      });
      console.log(`👁️ OpenRouter: Using vision model "${selectedModel}" for plant image analysis`);
    } else {
      if (image && !isVisionModel) {
        console.warn('⚠️ OpenRouter: Image provided but using text-only model - visual analysis unavailable');
      }
      // Text-only request
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'CannaAI Pro'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        max_tokens: 2048,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle specific error cases
      if (response.status === 402) {
        return {
          success: false,
          error: `OpenRouter quota exceeded: ${errorText}`,
          provider: 'openrouter',
          model: selectedModel
        };
      }

      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter returned empty response');
    }

    return {
      success: true,
      result: content,
      provider: 'openrouter',
      model: selectedModel,
      usage: result.usage
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      provider: 'openrouter'
    };
  }
}

/**
 * Get OpenRouter provider configuration
 */
export function getOpenRouterConfig() {
  return {
    type: 'openrouter',
    baseUrl: OPENROUTER_BASE_URL,
    apiKey: OPENROUTER_API_KEY,
    models: VISION_MODELS,
    textModels: TEXT_MODELS,
    features: [
      'vision',
      'chat',
      'code_analysis',
      'multi_model_selection',
      'free_tier_available'
    ],
    advantages: [
      'FREE tier models available',
      'Multiple vision model options',
      'qwen-vl-max: Best for plant/leaf analysis',
      'Pay-as-you-go pricing',
      'High rate limits',
      'No credit card required for free tier'
    ],
    recommendedVisionModel: 'qwen-vl-max',
    recommendedTextModel: 'meta-llama/llama-3.1-8b-instruct:free',
    pricing: {
      freeTier: 'Available with select models',
      visionModels: '$0.002-0.01 per image',
      textModels: 'FREE for basic models'
    }
  };
}

/**
 * Get the best available vision model for plant analysis
 */
export function getBestVisionModel(): string {
  return VISION_MODELS.find(m => m.recommended)?.id || VISION_MODELS[0].id;
}

/**
 * Get a fallback text model when vision is unavailable
 */
export function getFallbackTextModel(): string {
  return TEXT_MODELS[0].id;
}
