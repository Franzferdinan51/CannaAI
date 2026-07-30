import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BaseProvider, AIRequest, AIResponse } from './base-provider';

const execFileAsync = promisify(execFile);

export type AgentCommandProviderName = 'openclaw' | 'hermes';

/**
 * Provider for agents that own their own auth/model routing.
 *
 * OpenClaw and Hermes intentionally run through their supported CLIs here:
 * their current gateways are session/RPC services, not stable REST model APIs.
 * This keeps OAuth and provider credentials inside the agent that owns them.
 */
export class AgentCommandProvider extends BaseProvider {
  private readonly command: string;
  private readonly commandArgs: string[];
  private readonly provider: AgentCommandProviderName;

  constructor(provider: AgentCommandProviderName, config: any = {}) {
    super({
      name: provider,
      baseUrl: config.baseUrl || `${provider}://local`,
      model: config.model || '',
      timeout: config.timeout || 120000,
      maxRetries: 1,
      retryDelay: 500,
      capabilities: {
        text: true,
        vision: false,
        streaming: false,
        functionCalling: false,
        jsonMode: false,
        maxTokens: 16384,
        contextWindow: 128000,
        supportsBatching: false,
        realtime: false,
        ...config.capabilities
      },
      pricing: { input: 0, output: 0, currency: 'USD', ...config.pricing }
    });
    this.provider = provider;
    this.command = config.command || provider;
    this.commandArgs = Array.isArray(config.commandArgs) ? config.commandArgs : [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execFileAsync(this.command, [...this.commandArgs, '--version'], {
        timeout: 5000,
        maxBuffer: 1024 * 1024
      });
      return true;
    } catch {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startedAt = Date.now();
    const prompt = request.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');
    const args = [...this.commandArgs];

    if (this.provider === 'openclaw') {
      args.push('infer', 'model', 'run', '--gateway', '--json', '--thinking', 'off', '--prompt', prompt);
      if (request.model || this.config.model) args.push('--model', request.model || this.config.model);
    } else {
      if (request.model || this.config.model) args.push('-m', request.model || this.config.model);
      args.push('-z', prompt, '--cli');
    }

    try {
      const { stdout } = await execFileAsync(this.command, args, {
        timeout: this.config.timeout,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env }
      });
      const content = this.extractContent(stdout);
      if (!content) throw new Error(`${this.provider} returned an empty response.`);
      const latency = Date.now() - startedAt;
      this.updateHealth(true, latency);
      this.recordMetrics(latency, 0, 0, 0, true);
      return {
        id: `${this.provider}_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || this.config.model || 'agent-default',
        choices: [{ index: 0, message: { role: 'assistant', content }, finishReason: 'stop' }],
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
        metadata: {
          provider: this.provider,
          latency,
          modelUsed: request.model || this.config.model || 'agent-default'
        }
      };
    } catch (error) {
      const latency = Date.now() - startedAt;
      this.updateHealth(false, latency, error as Error);
      this.recordMetrics(latency, 0, 0, 0, false);
      throw error;
    }
  }

  private extractContent(stdout: string): string {
    const text = stdout.trim();
    if (!text) return '';
    if (this.provider !== 'openclaw') return text;
    try {
      const parsed = JSON.parse(text);
      return String(parsed.reply || parsed.response || parsed.content || parsed.result?.reply || parsed.outputs?.[0]?.text || '').trim();
    } catch {
      return text;
    }
  }
}
