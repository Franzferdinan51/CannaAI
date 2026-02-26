/**
 * OpenClaw Gateway AI Provider Integration
 * Routes AI requests through OpenClaw Gateway for centralized model management
 * 
 * Benefits:
 * - Single auth (OpenClaw OAuth/device auth)
 * - Access to all configured models (Qwen, Kimi, MiniMax, etc.)
 * - Centralized quota management
 * - Automatic model fallback
 * 
 * Endpoint: http://localhost:18789/api/chat (or /v1/chat/completions if available)
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'qwen3.5-plus';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || 'openclaw-local';

/**
 * Check if OpenClaw Gateway is available
 */
export async function checkOpenClaw(): Promise<ProviderDetectionResult> {
  try {
    // Check gateway health
    const healthCheck = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (healthCheck.ok || healthCheck.status === 200) {
      return {
        isAvailable: true,
        provider: 'openclaw',
        reason: 'OpenClaw Gateway is running',
        config: {
          type: 'openclaw',
          baseUrl: OPENCLAW_GATEWAY_URL,
          model: OPENCLAW_MODEL,
          apiKey: OPENCLAW_API_KEY,
          models: ['qwen3.5-plus', 'kimi-k2.5', 'minimax-m2.5', 'glm-4.5']
        },
        recommendations: []
      };
    } else {
      return {
        isAvailable: false,
        provider: 'openclaw',
        reason: `Gateway returned status ${healthCheck.status}`,
        config: { type: 'openclaw', baseUrl: OPENCLAW_GATEWAY_URL },
        recommendations: ['Ensure OpenClaw Gateway is running on port 18789']
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isAvailable: false,
      provider: 'openclaw',
      reason: `Gateway not reachable: ${errorMessage}`,
      config: { type: 'openclaw', baseUrl: OPENCLAW_GATEWAY_URL },
      recommendations: [
        'Start OpenClaw Gateway: openclaw gateway start',
        'Check gateway status: openclaw gateway status',
        `Expected at: ${OPENCLAW_GATEWAY_URL}`
      ]
    };
  }
}

/**
 * Execute analysis using OpenClaw Gateway
 * 
 * Two modes supported:
 * 1. Direct /api/chat endpoint (current OpenClaw format)
 * 2. OpenAI-compatible /v1/chat/completions (if available)
 */
export async function executeWithOpenClaw(params: {
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
    const { image, prompt, model = OPENCLAW_MODEL } = params;

    // Try OpenAI-compatible endpoint first (if Gateway supports it)
    try {
      const messages: any[] = [{
        role: 'user',
        content: image 
          ? [
              { type: 'image_url', image_url: { url: image } },
              { type: 'text', text: prompt }
            ]
          : prompt
      }];

      const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 2048,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          result: result.choices[0].message.content,
          provider: 'openclaw',
          usage: result.usage
        };
      }
    } catch (openaiError) {
      // OpenAI endpoint not available, try direct API
      console.log('OpenAI endpoint not available, trying direct API...');
    }

    // Fallback: Direct OpenClaw API
    const directResponse = await fetch(`${OPENCLAW_GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`
      },
      body: JSON.stringify({
        message: prompt,
        model: model,
        image: image,
        stream: false
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!directResponse.ok) {
      throw new Error(`OpenClaw API error: ${directResponse.status} ${directResponse.statusText}`);
    }

    const result = await directResponse.json();
    
    return {
      success: true,
      result: result.response || result.message || result.content,
      provider: 'openclaw',
      usage: result.usage
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      provider: 'openclaw'
    };
  }
}

/**
 * Get OpenClaw provider configuration
 */
export function getOpenClawConfig() {
  return {
    type: 'openclaw',
    baseUrl: OPENCLAW_GATEWAY_URL,
    model: OPENCLAW_MODEL,
    apiKey: OPENCLAW_API_KEY,
    features: [
      'vision',
      'chat',
      'code_analysis',
      'multi_model_routing',
      'automatic_fallback'
    ],
    advantages: [
      'Uses your existing OpenClaw model configuration',
      'Access to Qwen 3.5 Plus, Kimi K2.5, MiniMax, etc.',
      'No additional API keys needed',
      'Centralized model management',
      'FREE quota models (Alibaba, NVIDIA, MiniMax)',
      'Automatic model fallback if primary fails'
    ],
    availableModels: [
      { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus', vision: true, cost: 'FREE quota' },
      { id: 'kimi-k2.5', name: 'Kimi K2.5 (NVIDIA)', vision: true, cost: 'FREE' },
      { id: 'minimax-m2.5', name: 'MiniMax M2.5', vision: false, cost: 'FREE' },
      { id: 'glm-4.5', name: 'GLM-4.5', vision: false, cost: 'FREE quota' },
      { id: 'qwen-vl-max', name: 'Qwen-VL-Max', vision: true, cost: 'FREE quota' }
    ]
  };
}
