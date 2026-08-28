/**
 * OpenClaw integration for CannaAI.
 *
 * OpenClaw is an authenticated Gateway/WebSocket runtime. It is not a model
 * server and CannaAI must not guess REST URLs or own OpenClaw credentials.
 * The provider therefore uses OpenClaw's official ACP stdio bridge, which in
 * turn connects to the configured Gateway and preserves the active agent,
 * OAuth, model routing, tools, and session policy.
 */
import { AgentCommandProvider } from './ai-providers/agent-command-provider';
import type { ProviderDetectionResult } from './ai-provider-detection';

const provider = () => new AgentCommandProvider('openclaw', {
  command: process.env.OPENCLAW_AGENT_COMMAND,
  model: process.env.OPENCLAW_MODEL || '',
  timeout: Number(process.env.OPENCLAW_TIMEOUT_MS || 120000)
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

// OpenClaw's status command can be slow on macOS launchd installations even
// with --no-probe. Keep a bounded timeout, but do not turn a healthy gateway
// into a false outage merely because the CLI takes longer than a few seconds.
// `openclaw gateway status --json` may take several seconds while the
// authenticated gateway performs its local RPC handshake.
const DETECT_TIMEOUT_MS = Number(process.env.OPENCLAW_HEALTH_TIMEOUT_MS || 40000);
const DETECT_CACHE_MS = 30000;

let cachedAvailability: { value: boolean; expiresAt: number } | undefined;

function withDetectTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('detect-timeout')), DETECT_TIMEOUT_MS);
    timer.unref?.();
  });
  return Promise.race([promise, timeout])
    .catch(() => fallback)
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
}

export async function checkOpenClaw(): Promise<ProviderDetectionResult> {
  if (cachedAvailability && cachedAvailability.expiresAt > Date.now()) {
    const available = cachedAvailability.value;
    return {
      isAvailable: available,
      provider: 'openclaw',
      reason: available ? 'OpenClaw Gateway is reachable through its official ACP bridge' : 'OpenClaw Gateway is not reachable',
      config: { type: 'openclaw', transport: 'acp', gateway: 'configured in OpenClaw' },
      recommendations: available ? [] : ['Start OpenClaw Gateway: openclaw gateway start', 'Check: openclaw gateway status']
    };
  }
  const available = await withDetectTimeout(
    provider().isAvailable(),
    false
  );
  cachedAvailability = { value: available, expiresAt: Date.now() + DETECT_CACHE_MS };
  return {
    isAvailable: available,
    provider: 'openclaw',
    reason: available ? 'OpenClaw Gateway is reachable through its official ACP bridge' : 'OpenClaw Gateway is not reachable',
    config: { type: 'openclaw', transport: 'acp', gateway: 'configured in OpenClaw' },
    recommendations: available ? [] : ['Start OpenClaw Gateway: openclaw gateway start', 'Check: openclaw gateway status']
  };
}

export async function executeWithOpenClaw(params: any, options: any = {}): Promise<any> {
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
      maxTokens: request.maxTokens
    });
    const message = response.choices[0]?.message as { content?: string; reasoning_content?: string } | undefined;
    const content = textFromAgentMessage(message);
    if (!content.trim()) {
      return {
        success: false,
        provider: 'openclaw',
        error: 'OpenClaw returned no usable content',
      };
    }
    return {
      success: true,
      result: content,
      provider: 'openclaw',
      model: response.model,
      endpoint: 'openclaw-acp',
      visionUsed: messages.some((message: any) => Boolean(message.image)),
      usage: response.usage
    };
  } catch (error) {
    return { success: false, provider: 'openclaw', error: error instanceof Error ? error.message : String(error) };
  }
}

export function getOpenClawConfig() {
  return {
    type: 'openclaw',
    transport: 'acp',
    baseUrl: 'openclaw://gateway/acp',
    model: process.env.OPENCLAW_MODEL || '',
    managedAuth: true,
    features: ['vision', 'chat', 'code_analysis', 'multi_model_routing', 'automatic_fallback'],
    recommendations: ['Configure the Gateway with `openclaw config set gateway.remote.url ...` when remote', 'Authenticate models with `openclaw models auth login`']
  };
}
