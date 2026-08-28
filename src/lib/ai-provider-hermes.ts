/**
 * Hermes Agent integration.
 *
 * Hermes owns authentication, tools, sessions, model routing, and vision.
 * CannaAI only speaks to its authenticated API server (with the legacy proxy
 * fallback retained inside AgentCommandProvider).
 */
import { AgentCommandProvider } from './ai-providers/agent-command-provider';
import type { ProviderDetectionResult } from './ai-provider-detection';

const provider = () => new AgentCommandProvider('hermes', {
  command: process.env.HERMES_AGENT_COMMAND,
  model: process.env.HERMES_MODEL || '',
  timeout: Number(process.env.HERMES_TIMEOUT_MS || 120000),
});

function textFromAgentMessage(message: any): string {
  const content = message?.content;
  if (Array.isArray(content)) {
    const text = content
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('')
      .trim();
    if (text) return text;
  }
  if (typeof content === 'string' && content.trim()) return content.trim();
  return typeof message?.reasoning_content === 'string'
    ? message.reasoning_content.trim()
    : '';
}

function normalizeAgentMessage(message: any, fallbackImage?: string) {
  const parts = Array.isArray(message?.content) ? message.content : [];
  const content = parts.length > 0
    ? parts
      .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
      .map((part: any) => part.text)
      .join('\n')
    : typeof message?.content === 'string'
      ? message.content
      : String(message?.text || '');
  const image = message?.image || parts.find((part: any) => (
    (part?.type === 'image_url' && typeof part?.image_url?.url === 'string') ||
    (part?.type === 'image' && typeof part?.image_url === 'string')
  ))?.image_url?.url || parts.find((part: any) => (
    part?.type === 'image' && typeof part?.image_url === 'string'
  ))?.image_url || (message?.role === 'user' ? fallbackImage : undefined);
  return { role: message?.role || 'user', content, image };
}

export async function checkHermes(): Promise<ProviderDetectionResult> {
  if (process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return {
      isAvailable: false,
      provider: 'hermes',
      reason: 'Hermes local agent is not supported in serverless environments',
      recommendations: ['Run Hermes alongside CannaAI on a dedicated local host'],
    };
  }
  const available = await provider().isAvailable();
  return {
    isAvailable: available,
    provider: 'hermes',
    reason: available
      ? 'Hermes API server or authenticated proxy is reachable'
      : 'Hermes API server or authenticated proxy is not reachable',
    config: {
      type: 'hermes',
      transport: process.env.HERMES_API_KEY || process.env.HERMES_API_SERVER_KEY
        ? 'api-server'
        : 'legacy-proxy',
      baseUrl: process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1',
    },
    recommendations: available
      ? []
      : ['Start Hermes API server with `hermes gateway` or configure the legacy Hermes proxy'],
  };
}

export async function executeWithHermes(params: any, options: any = {}): Promise<any> {
  const request = Array.isArray(params)
    ? { messages: params, model: options.model, temperature: options.temperature, maxTokens: options.maxTokens, image: options.image }
    : params;
  const messages = (request.messages || [{ role: 'user', content: request.prompt || '', image: request.image }])
    .map((message: any) => normalizeAgentMessage(message, request.image));

  try {
    const response = await provider().execute({
      messages,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
    const message = response.choices[0]?.message as { content?: string; reasoning_content?: string } | undefined;
    const content = textFromAgentMessage(message);
    if (!content.trim()) {
      return {
        success: false,
        provider: 'hermes',
        error: 'Hermes returned no usable content',
      };
    }
    return {
      success: true,
      result: content,
      provider: 'hermes',
      model: response.model,
      endpoint: process.env.HERMES_API_KEY || process.env.HERMES_API_SERVER_KEY
        ? 'hermes-api-server'
        : 'hermes-proxy',
      visionUsed: messages.some((message: any) => Boolean(message.image)),
      usage: response.usage,
    };
  } catch (error) {
    return { success: false, provider: 'hermes', error: error instanceof Error ? error.message : String(error) };
  }
}
