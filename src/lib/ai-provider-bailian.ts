/**
 * Alibaba Bailian (Qwen) AI Provider Integration
 * Uses Singapore/International endpoint: dashscope-intl.aliyuncs.com
 * FREE Quota: 18K tokens/month, 9K/week, 1.2K/5hr
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const BAILIAN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const BAILIAN_MODEL = process.env.QWEN_MODEL || 'qwen-vl-max-latest';
const BAILIAN_API_KEY = process.env.ALIBABA_API_KEY || 'sk-0a5ffe492bfe4222b8964b685554aa00';

/**
 * Check if Alibaba Bailian (Qwen) is available
 */
export async function checkBailian(): Promise<ProviderDetectionResult> {
  try {
    // Test API key validity with a simple models request
    const modelsCheck = await fetch(`${BAILIAN_BASE_URL.replace('/compatible-mode/v1', '')}/api/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BAILIAN_API_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    });

    if (modelsCheck.ok) {
      const models = await modelsCheck.json();
      return {
        isAvailable: true,
        provider: 'bailian',
        reason: 'Alibaba Qwen API responding (Singapore endpoint)',
        config: {
          type: 'bailian',
          baseUrl: BAILIAN_BASE_URL,
          model: BAILIAN_MODEL,
          apiKey: BAILIAN_API_KEY,
          models: models.data || [],
          quota: {
            monthly: '18K tokens',
            weekly: '9K tokens',
            hourly: '1.2K tokens/5hr'
          }
        },
        recommendations: []
      };
    } else if (modelsCheck.status === 401 || modelsCheck.status === 403) {
      return {
        isAvailable: false,
        provider: 'bailian',
        reason: `API key invalid/expired (${modelsCheck.status})`,
        config: { type: 'bailian', baseUrl: BAILIAN_BASE_URL },
        recommendations: [
          'Check API key in .env file',
          'Verify key is for Singapore/International endpoint',
          'Generate new key at: https://dashscope.console.aliyun.com/'
        ]
      };
    } else {
      return {
        isAvailable: false,
        provider: 'bailian',
        reason: `API returned status ${modelsCheck.status}`,
        config: { type: 'bailian', baseUrl: BAILIAN_BASE_URL },
        recommendations: ['Check API endpoint and network connectivity']
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isAvailable: false,
      provider: 'bailian',
      reason: `Bailian API not reachable: ${errorMessage}`,
      config: { type: 'bailian', baseUrl: BAILIAN_BASE_URL },
      recommendations: [
        'Check internet connection',
        'Verify Singapore endpoint URL',
        'Ensure API key is valid'
      ]
    };
  }
}

/**
 * Execute analysis using Alibaba Bailian (Qwen)
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

    // Build messages for OpenAI-compatible API
    const messages: any[] = [{
      role: 'user',
      content: image 
        ? [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: prompt }
          ]
        : prompt
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
      signal: AbortSignal.timeout(60000)
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
