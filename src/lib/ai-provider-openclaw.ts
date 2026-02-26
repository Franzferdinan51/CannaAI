/**
 * OpenClaw Gateway AI Provider Integration
 * Uses OpenClaw Gateway (port 18789) to route AI requests to configured models
 * Supports: Qwen 3.5 Plus, Kimi K2.5, MiniMax, and all OpenClaw-configured models
 */

import { ProviderDetectionResult } from './ai-provider-detection';

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789/v1';
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'qwen3.5-plus';

/**
 * Check if OpenClaw Gateway is available
 */
export async function checkOpenClaw(): Promise<ProviderDetectionResult> {
  try {
    // Check gateway health - OpenClaw serves web UI at root
    const healthCheck = await fetch(`${OPENCLAW_GATEWAY_URL.replace('/v1', '')}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (healthCheck.ok || healthCheck.status === 200) {
      // Gateway is running (serving web UI = gateway is up)
      // Trust that OpenClaw is configured correctly
      return {
        isAvailable: true,
        provider: 'openclaw',
        reason: 'OpenClaw Gateway is running',
        config: {
          type: 'openclaw',
          baseUrl: OPENCLAW_GATEWAY_URL,
          model: OPENCLAW_MODEL,
          models: ['qwen3.5-plus', 'kimi-k2.5', 'minimax-m2.5']
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
}> {
  try {
    const { image, prompt, model = OPENCLAW_MODEL } = params;

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

    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY || 'openclaw-local'}`
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
      throw new Error(`OpenClaw API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      result: result.choices[0].message.content,
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
    apiKey: process.env.OPENCLAW_API_KEY || 'openclaw-local',
    features: [
      'vision',
      'chat',
      'code_analysis',
      'multi_model_routing'
    ],
    advantages: [
      'Uses your existing OpenClaw model configuration',
      'Access to Qwen 3.5 Plus, Kimi K2.5, MiniMax, etc.',
      'No additional API keys needed',
      'Centralized model management',
      'Free quota models (Alibaba, NVIDIA, MiniMax)'
    ]
  };
}
