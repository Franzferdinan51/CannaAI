/**
 * Alibaba Bailian (Qwen) AI Provider Integration
 * Uses Singapore/International endpoint: dashscope-intl.aliyuncs.com
 * FREE Quota: 18K tokens/month, 9K/week, 1.2K/5hr
 *
 * Model Selection:
 * - qwen3.5-plus: Text-only analysis (default)
 * - qwen-vl-max-latest: Vision-capable for image analysis (auto-selected when image provided)
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const BAILIAN_BASE_URL = process.env.QWEN_BASE_URL || 'https://coding-intl.dashscope.aliyuncs.com/v1';
const BAILIAN_MODEL = process.env.QWEN_MODEL || 'qwen3.5-plus';
const BAILIAN_API_KEY = process.env.ALIBABA_API_KEY || 'sk-sp-e1b3a679b93047978549f49bfcf73480';
const BAILIAN_TIMEOUT_MS = parseInt(process.env.BAILIAN_TIMEOUT_MS || '120000');

// Vision-capable model for plant image analysis (qwen3.5-plus supports vision)
const BAILIAN_VISION_MODEL = process.env.QWEN_VISION_MODEL || 'qwen3.5-plus';

/**
 * Check if Alibaba Bailian (Qwen) is available
 */
export async function checkBailian(): Promise<ProviderDetectionResult> {
  // Simple availability check: API key present and non-empty
  if (BAILIAN_API_KEY && BAILIAN_API_KEY.startsWith('sk-')) {
    return {
      isAvailable: true,
      provider: 'bailian',
      reason: 'Alibaba Bailian API key configured',
      config: {
        type: 'bailian',
        baseUrl: BAILIAN_BASE_URL,
        model: BAILIAN_MODEL,
        visionModel: BAILIAN_VISION_MODEL,
        apiKey: BAILIAN_API_KEY,
        quota: {
          monthly: '18K tokens',
          weekly: '9K tokens',
          hourly: '1.2K tokens/5hr'
        }
      },
      recommendations: [
        'Auto-uses qwen-vl-max-latest when image provided',
        'Uses qwen3.5-plus for text-only analysis'
      ]
    };
  }

  return {
    isAvailable: false,
    provider: 'bailian',
    reason: 'API key not configured or invalid format',
    config: { type: 'bailian', baseUrl: BAILIAN_BASE_URL },
    recommendations: [
      'Set ALIBABA_API_KEY in .env.local',
      'Key should start with "sk-"'
    ]
  };
}

/**
 * Execute analysis using Alibaba Bailian (Qwen)
 * Auto-selects vision model when image is provided
 */
export async function executeWithBailian(params: {
  image?: string;
  prompt: string;
  model?: string;
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  provider: string;
  model?: string;
  usage?: any;
}> {
  try {
    const {
      image,
      prompt,
      model,
      timeoutMs = BAILIAN_TIMEOUT_MS,
      maxTokens = 3500,
      temperature = 0.2
    } = params;

    // Auto-select vision model when image is provided
    const selectedModel = model || (image ? BAILIAN_VISION_MODEL : BAILIAN_MODEL);
    const isVisionModel = selectedModel.includes('vl') || selectedModel.includes('vision');

    // Build messages based on whether we have vision capability
    let messages: any[];

    if (image && isVisionModel) {
      // Vision-capable request with image
      messages = [{
        role: 'user',
        content: [
          { type: 'image', image_url: image },
          { type: 'text', text: prompt }
        ]
      }];
      console.log(`👁️ Bailian: Using vision model "${selectedModel}" for plant image analysis`);
    } else {
      // Text-only request (either no image or text-only model)
      if (image && !isVisionModel) {
        console.warn(`⚠️ Bailian: Image provided but using text-only model "${selectedModel}" - visual analysis unavailable`);
      }
      messages = [{
        role: 'user',
        content: prompt
      }];
    }

    const response = await fetch(`${BAILIAN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAILIAN_API_KEY}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: maxTokens,
        temperature
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bailian API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return {
      success: true,
      result: result.choices[0].message.content,
      provider: 'bailian',
      model: selectedModel,
      usage: result.usage
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      provider: 'bailian'
    };
  }
}

/**
 * Get Bailian provider configuration
 */
export function getBailianConfig() {
  return {
    type: 'bailian',
    baseUrl: BAILIAN_BASE_URL,
    model: BAILIAN_MODEL,
    visionModel: BAILIAN_VISION_MODEL,
    apiKey: BAILIAN_API_KEY,
    endpoint: 'Singapore/International',
    features: [
      'vision',
      'chat',
      'code_analysis',
      'multilingual',
      'auto_vision_selection'
    ],
    advantages: [
      'FREE quota: 18K tokens/month',
      'Auto-uses qwen-vl-max-latest for vision tasks',
      'Uses qwen3.5-plus for text-only analysis',
      'Singapore endpoint (international)',
      'High rate limits',
      'Excellent for plant analysis'
    ],
    quota: {
      monthly: '18,000 tokens',
      weekly: '9,000 tokens',
      per5hours: '1,200 tokens'
    },
    modelSelection: {
      textOnly: BAILIAN_MODEL,
      withVision: BAILIAN_VISION_MODEL,
      automatic: true
    }
  };
}
