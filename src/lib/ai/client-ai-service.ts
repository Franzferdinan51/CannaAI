'use client'

import { safeLocalStorage } from '@/lib/safe-local-storage';

// Guard against SSR
if (typeof window === 'undefined') {
  // @ts-ignore
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}


// Client-side AI service for static hosting compatibility
interface AIConfig {
  provider: 'lm-studio' | 'openrouter' | 'fallback';
  lmStudio: {
    url: string;
    model: string;
    apiKey: string;
  };
  openRouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  fallbackEnabled: boolean;
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  response?: string;
  model?: string;
  provider?: string;
  error?: string;
  fallbackUsed?: boolean;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const timeout = (AbortSignal as typeof AbortSignal & {
    timeout?: (milliseconds: number) => AbortSignal;
  }).timeout;
  if (typeof timeout === 'function') return timeout(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const unref = (timer as ReturnType<typeof setTimeout> & { unref?: () => void }).unref;
  unref?.call(timer);
  return controller.signal;
}

export class ClientAIService {
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    this.config = { ...this.loadConfig(), ...config } as AIConfig;
  }

  private loadConfig(): AIConfig {
    const defaults: AIConfig = {
      provider: 'lm-studio',
      lmStudio: {
        url: 'http://127.0.0.1:1234',
        model: '',
        apiKey: ''
      },
      openRouter: {
        apiKey: '',
        model: '',
        baseUrl: 'https://openrouter.ai/api/v1'
      },
      fallbackEnabled: false
    };

    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      let saved = null; try { saved = safeLocalStorage.getItem('ai-config'); } catch (e) {}
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AIConfig>;
        // Migrate configurations from the removed canned-response mode.
        if (parsed.provider === 'fallback') {
          return { ...defaults, ...parsed, provider: 'lm-studio', fallbackEnabled: false } as AIConfig;
        }
        return { ...defaults, ...parsed } as AIConfig;
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }

    return defaults;
  }

  updateConfig(config: AIConfig) {
    this.config = config;
    if (typeof window !== 'undefined') {
      try { safeLocalStorage.setItem('ai-config', JSON.stringify(config)); } catch (e) {}
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // The canned fallback provider was removed. Never report it as a
      // healthy AI connection or make the Settings UI appear configured.
      if (this.config.provider === 'fallback') return false;
      if (this.config.provider === 'lm-studio') {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'test_connection',
            provider: 'lm-studio',
            config: this.config.lmStudio,
          }),
          // Local models may be cold or loading through LM Studio JIT;
          // report a real failure only after the local provider's health
          // window has elapsed.
          signal: createTimeoutSignal(60000),
        });
        const result = await response.json().catch(() => ({}));
        return response.ok && result.success === true;
      }
      const response = await fetch(`${this.config.openRouter.baseUrl.replace(/\/$/, '')}/models`, {
        headers: this.config.openRouter.apiKey
          ? { Authorization: `Bearer ${this.config.openRouter.apiKey}` }
          : undefined
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateResponse(messages: AIMessage[] | string, mode: string = 'chat', context?: any): Promise<AIResponse> {
    if (typeof messages === 'string') {
      messages = [{ role: 'user', content: messages }];
    }
    const userMessage = messages[messages.length - 1]?.content || '';

    // Try the configured provider first
    if (this.config.provider !== 'fallback') {
      try {
        const response = await this.callProvider(userMessage, mode, context);
        if (response.success) {
          return response;
        }
      } catch (error) {
        console.warn(`Provider ${this.config.provider} failed:`, error);
        if (!this.config.fallbackEnabled) {
          return {
            success: false,
            response: '',
            error: `Provider ${this.config.provider} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fallbackUsed: false
          };
        }
      }
    }

    // Never turn provider failure into fabricated cultivation advice. The UI
    // can use this explicit state to offer configuration/retry controls.
    return {
      success: false,
      response: '',
      provider: this.config.provider,
      error: `No response from the configured ${this.config.provider} provider. Connect a provider and retry.`,
      fallbackUsed: false
    };
  }

  private async callProvider(message: string, mode: string, context?: any): Promise<AIResponse> {
    const basePrompt = this.getContextualPrompt(mode, message, context);

    if (this.config.provider === 'openrouter') {
      return await this.callOpenRouter(basePrompt, context);
    } else if (this.config.provider === 'lm-studio') {
      return await this.callLMStudio(basePrompt, context);
    }

    throw new Error('Unknown provider');
  }

  private async callOpenRouter(prompt: string, context?: any): Promise<AIResponse> {
    const response = await fetch(`${this.config.openRouter.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openRouter.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'CannaAI Assistant',
      },
      body: JSON.stringify({
        model: this.config.openRouter.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No response generated';

    return {
      success: true,
      response: aiResponse,
      model: this.config.openRouter.model,
      provider: 'OpenRouter',
    };
  }

  private async callLMStudio(prompt: string, context?: any): Promise<AIResponse> {
    const configuredModel = this.config.lmStudio.model.trim();
    // Keep inference server-side: browser calls to LM Studio are vulnerable to
    // CORS failures and cannot use the machine's token-file authentication.
    // The backend performs model discovery and accepts explicit JIT model IDs.
    const response = await fetch('/api/lmstudio/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        modelId: configuredModel || undefined,
        baseUrl: this.config.lmStudio.url,
        apiKey: this.config.lmStudio.apiKey || undefined,
        maxTokens: 1000,
        temperature: 0.7,
      }),
      signal: createTimeoutSignal(600000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `LM Studio error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = typeof payload.content === 'string' ? payload.content.trim() : '';
    if (!aiResponse) {
      throw new Error('LM Studio returned an empty response');
    }

    return {
      success: true,
      response: aiResponse,
      model: payload.model || configuredModel || undefined,
      provider: 'LM Studio',
    };
  }

  private generateFallbackResponse(message: string, mode: string, context?: any): AIResponse {
    void message;
    void mode;
    void context;
    return {
      success: false,
      response: '',
      provider: 'fallback',
      error: 'Canned fallback responses are disabled. Configure LM Studio or another AI provider.',
      fallbackUsed: false,
    };
  }

  private getContextualPrompt(mode: string, message: string, context?: any): string {
    const baseContext = `Current page context: ${context?.title || 'CannaAI Pro'} (${context?.page || 'unknown'})
Page description: ${context?.description || 'Cannabis cultivation management system'}

Current environmental conditions:
- Temperature: ${context?.sensorData?.temperature || 'N/A'}°C
- Humidity: ${context?.sensorData?.humidity || 'N/A'}%
- pH Level: ${context?.sensorData?.ph || 'N/A'}
- EC Level: ${context?.sensorData?.ec || 'N/A'} mS/cm`;

    return `${baseContext}

User question: ${message}

${this.getModeSpecificPrompt(mode)}`;
  }

  private getModeSpecificPrompt(mode: string): string {
    const prompts = {
      chat: 'Provide helpful, concise cannabis cultivation advice.',
      analysis: 'Analyze plant health and provide detailed assessment.',
      diagnosis: 'Diagnose plant problems systematically.',
      recommendation: 'Give practical growing recommendations.',
      trichome: 'Provide trichome analysis and harvest timing advice.',
      harvest: 'Give harvest planning guidance.',
      autonomous: 'Act autonomously to monitor and optimize growing conditions.',
      proactive: 'Provide proactive suggestions for plant care.',
      predictive: 'Predict future conditions based on current data.',
      planner: 'Create strategic cultivation plans.',
      monitor: 'Provide monitoring status and alerts.',
      thinking: 'Provide thorough analysis with reasoning process.',
      'study-plan': 'Create detailed growth plans.',
      quiz: 'Create educational content and quizzes.',
      research: 'Provide evidence-based information.',
      troubleshoot: 'Systematically solve plant problems.'
    };

    return prompts[mode as keyof typeof prompts] || prompts.chat;
  }

  // The canned "fallback" response generators that used to live here —
  // random chat replies picked with Math.random(), a "Plant Analysis
  // Report" built from default 25°C / 60% / pH 6.2 values when no sensor
  // context existed, and canned diagnosis / recommendation / harvest /
  // monitoring text — were removed deliberately. They fabricated
  // cultivation advice and environmental readings whenever a real
  // provider was unavailable. Provider failure now surfaces only as the
  // explicit unavailable result returned by generateResponse() and
  // generateFallbackResponse(): success=false with an error message,
  // never invented numbers or advice.
}

// Export singleton instance
export const clientAI = new ClientAIService();
export default ClientAIService;
