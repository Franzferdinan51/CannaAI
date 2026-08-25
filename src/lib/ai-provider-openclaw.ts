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

// Detection timeout – intentionally short so it never blocks API responses
// `openclaw gateway status --json` may take several seconds while the
// authenticated gateway performs its local RPC handshake. Five seconds
// produced false negatives even though agent execution was healthy.
const DETECT_TIMEOUT_MS = 20000;

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
  const available = await withDetectTimeout(
    provider().isAvailable(),
    false
  );
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
  const messages = (request.messages || [{ role: 'user', content: request.prompt || '', image: request.image }]).map((message: any) => ({
    role: message.role || 'user',
    content: typeof message.content === 'string' ? message.content : String(message.text || ''),
    image: message.image || (message.role === 'user' ? request.image : undefined)
  }));
  try {
    const response = await provider().execute({
      messages,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens
    });
    return {
      success: true,
      result: response.choices[0]?.message?.content || '',
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
