/**
 * OpenClaw AI Provider for CannaAI
 * 
 * Uses OpenClaw Gateway as the AI provider, which can route to multiple models:
 * - MiniMax M2.5 (free, no ban risk)
 * - Kimi K2.5 (free vision via NVIDIA)
 * - Qwen 3.5 Plus (Alibaba free quota)
 * - LM Studio (local models)
 * - And more...
 * 
 * Configuration:
 * - OpenClaw Gateway URL: http://localhost:18789
 * - Model selection via OpenClaw routing
 */

const OPENCLAW_CONFIG = {
  baseUrl: process.env.OPENCLAW_URL || 'http://localhost:18789',
  apiKey: process.env.OPENCLAW_API_KEY || '',
  // Default model for general tasks (FREE)
  defaultModel: process.env.OPENCLAW_MODEL || 'minimax-portal/MiniMax-M2.5',
  // BEST models for visual plant analysis
  visualAnalysisModel: process.env.OPENCLAW_VISUAL_MODEL || 'bailian/qwen3.5-plus',
  // Alternative: GPT-4 for complex diagnosis
  advancedAnalysisModel: process.env.OPENCLAW_ADVANCED_MODEL || 'openai-codex:default',
};

interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenClawResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Send request to OpenClaw Gateway
 * 
 * Model Selection:
 * - Visual analysis (plant photos): Qwen 3.5 Plus or GPT-4 (BEST for vision)
 * - Text analysis: MiniMax M2.5 (FREE, fast)
 * - Complex diagnosis: GPT-4 (when available)
 */
export async function sendToOpenClaw(
  messages: OpenClawMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    taskType?: 'visual' | 'text' | 'complex';
  } = {}
): Promise<OpenClawResponse> {
  // Auto-select best model for task type
  let selectedModel = options.model;
  if (!selectedModel) {
    if (options.taskType === 'visual') {
      // Use Qwen 3.5 Plus for visual plant analysis (BEST for plant diseases, nutrients, pests)
      selectedModel = OPENCLAW_CONFIG.visualAnalysisModel;
    } else if (options.taskType === 'complex') {
      // Use GPT-4 for complex diagnosis
      selectedModel = OPENCLAW_CONFIG.advancedAnalysisModel;
    } else {
      // Use MiniMax for general text tasks (FREE)
      selectedModel = OPENCLAW_CONFIG.defaultModel;
    }
  }
  
  try {
    const response = await fetch(`${OPENCLAW_CONFIG.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_CONFIG.apiKey && {
          'Authorization': `Bearer ${OPENCLAW_CONFIG.apiKey}`
        })
      },
      body: JSON.stringify({
        model: selectedModel,
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
      model: selectedModel,
    };
  } catch (error) {
    console.error('OpenClaw provider error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test OpenClaw connection
 */
export async function testOpenClawConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_CONFIG.baseUrl}/api/status`, {
      method: 'GET',
      timeout: 5000,
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from OpenClaw
 */
export async function getOpenClawModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OPENCLAW_CONFIG.baseUrl}/v1/models`, {
      method: 'GET',
      timeout: 5000,
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.data?.map((m: any) => m.id) || [];
  } catch {
    return [];
  }
}

export default {
  sendToOpenClaw,
  testOpenClawConnection,
  getOpenClawModels,
  config: OPENCLAW_CONFIG,
};
