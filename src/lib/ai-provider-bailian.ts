/**
 * Alibaba Bailian (Qwen) AI Provider Integration
 * Uses Singapore/International endpoint: dashscope-intl.aliyuncs.com
 * FREE Quota: 18K tokens/month, 9K/week, 1.2K/5hr
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const BAILIAN_BASE_URL = process.env.QWEN_BASE_URL || 'https://coding-intl.dashscope.aliyuncs.com/v1';
const BAILIAN_MODEL = process.env.QWEN_MODEL || 'qwen3.5-plus';
const BAILIAN_API_KEY = process.env.ALIBABA_API_KEY || 'sk-sp-e1b3a679b93047978549f49bfcf73480';
const BAILIAN_TIMEOUT_MS = parseInt(process.env.BAILIAN_TIMEOUT_MS || '120000');

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
        apiKey: BAILIAN_API_KEY,
        quota: {
          monthly: '18K tokens',
          weekly: '9K tokens',
          hourly: '1.2K tokens/5hr'
        }
      },
      recommendations: []
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
 * Note: qwen3.5-plus is text-only. For vision, use OpenRouter or LM Studio.
 */
export async function executeWithBailian(params: {
  image?: string;
  prompt: string;
  model?: string;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  provider: string;
  usage?: any;
}> {
  try {
    const { image, prompt, model = BAILIAN_MODEL } = params;

    // qwen3.5-plus is text-only - ignore image if provided
    const messages: any[] = [{
      role: 'user',
      content: prompt
    }];

    const response = await fetch(`${BAILIAN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAILIAN_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 2048,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(BAILIAN_TIMEOUT_MS)
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
    apiKey: BAILIAN_API_KEY,
    endpoint: 'Singapore/International',
    features: [
      'vision',
      'chat',
      'code_analysis',
      'multilingual'
    ],
    advantages: [
      'FREE quota: 18K tokens/month',
      'Qwen-VL-Max for vision tasks',
      'Singapore endpoint (international)',
      'High rate limits',
      'Excellent for plant analysis'
    ],
    quota: {
      monthly: '18,000 tokens',
      weekly: '9,000 tokens',
      per5hours: '1,200 tokens'
    }
  };
}
