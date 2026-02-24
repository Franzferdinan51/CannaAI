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
  
  // BEST available models for visual plant analysis
  // Configure to use CURRENT BEST models (update as better models release)
  visualAnalysisModel: process.env.OPENCLAW_VISUAL_MODEL || 'bailian/qwen3.5-plus',  // Currently: Qwen 3.5 Plus
  advancedAnalysisModel: process.env.OPENCLAW_ADVANCED_MODEL || 'openai-codex:default',  // Currently: ChatGPT 5.2 (OpenAI - BEST reasoning!)
  
  // NOTE: ChatGPT 5.2 = OpenAI's GPT-5.2, NOT GLM-5 (Z.ai)
  
  // Model version tracking - update these as better models release
  modelVersions: {
    visual: '2026-Q1',  // Q1 2026 best: Qwen 3.5 Plus
    advanced: '2026-Q1',  // Q1 2026 best: GLM-5
    lastUpdated: '2026-02-24',
  },
  
  // Future model upgrade path (document here)
  // When new models release, update above:
  // - Qwen 4.0+ (visual)
  // - GLM-6+ (advanced)
  // - Any new SOTA vision models
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
 * Model Selection Strategy (FUTURE-PROOF):
 * - Visual analysis: Uses CURRENT BEST vision model (configurable)
 * - Complex diagnosis: Uses CURRENT BEST reasoning model (configurable)
 * - Text analysis: Uses FREE model (MiniMax)
 * 
 * UPDATE MODELS AS BETTER ONES RELEASE:
 * - Update OPENCLAW_CONFIG.visualAnalysisModel when better vision models release
 * - Update OPENCLAW_CONFIG.advancedAnalysisModel when better reasoning models release
 * - Update modelVersions tracking
 * 
 * Current Best (2026-Q1):
 * - Visual: Qwen 3.5 Plus (bailian/qwen3.5-plus)
 * - Advanced: ChatGPT 5.2 (openai-codex:default) - OpenAI's BEST!
 * 
 * NOTE: ChatGPT 5.2 = OpenAI GPT-5.2, NOT GLM-5 (Z.ai)
 */
export async function sendToOpenClaw(
  messages: OpenClawMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    taskType?: 'visual' | 'text' | 'complex';
    useLatest?: boolean;  // If true, uses latest configured best model
  } = {}
): Promise<OpenClawResponse> {
  // Auto-select best CURRENT model for task type
  let selectedModel = options.model;
  if (!selectedModel) {
    if (options.taskType === 'visual' || options.useLatest) {
      // Use CURRENT BEST vision model (update config as better models release)
      selectedModel = OPENCLAW_CONFIG.visualAnalysisModel;
    } else if (options.taskType === 'complex') {
      // Use CURRENT BEST reasoning model (update config as better models release)
      selectedModel = OPENCLAW_CONFIG.advancedAnalysisModel;
    } else {
      // Use MiniMax for general text tasks (FREE, unlimited)
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
