import { spawn, type ChildProcess } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable, Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ClientSideConnection, PROTOCOL_VERSION, ndJsonStream } from '@agentclientprotocol/sdk';
import { BaseProvider, AIRequest, AIResponse } from './base-provider';

const execFileAsync = promisify(execFile);
type AgentCommandProviderName = 'openclaw' | 'hermes';

const children = new Map<string, ChildProcess>();

function timeoutSignal(milliseconds: number): AbortSignal {
  const nativeTimeout = (AbortSignal as typeof AbortSignal & { timeout?: (ms: number) => AbortSignal }).timeout;
  if (nativeTimeout) return nativeTimeout(milliseconds);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error(`Request timed out after ${milliseconds}ms`)), milliseconds).unref?.();
  return controller.signal;
}

function commandPath(provider: AgentCommandProviderName, configured?: string): string {
  if (configured) return configured;
  // Resolve through PATH by default. Hard-coding one developer's install
  // path caused false outages for npm/pnpm and service-manager installs.
  return provider === 'openclaw'
    ? process.env.OPENCLAW_BIN || process.env.OPENCLAW_AGENT_COMMAND || 'openclaw'
    : process.env.HERMES_BIN || 'hermes';
}

function contentFromParts(parts: string[]): string {
  return parts.join('').trim();
}

/**
 * Connects to the agents through their supported integration surfaces.
 * OpenClaw owns the Gateway WebSocket and exposes ACP over stdio; Hermes owns
 * OAuth and exposes its credential-attaching OpenAI-compatible proxy locally.
 */
export class AgentCommandProvider extends BaseProvider {
  private readonly provider: AgentCommandProviderName;
  private readonly command: string;
  private readonly model: string;
  private readonly proxyPort: number;
  private readonly proxyProvider: string;

  constructor(provider: AgentCommandProviderName, config: any = {}) {
    super({
      name: provider,
      baseUrl: provider === 'openclaw'
        // OpenClaw is not an OpenAI-compatible HTTP server. Its supported
        // app-facing transport is ACP, backed by the authenticated Gateway.
        // Keep this as a URI describing the transport, never a fake URL.
        ? 'openclaw://gateway/acp'
        : `http://127.0.0.1:${Number(process.env.HERMES_PROXY_PORT || config.proxyPort || 8645)}/v1`,
      model: config.model || '',
      timeout: config.timeout || 120000,
      maxRetries: 1,
      retryDelay: 500,
      capabilities: {
        text: true,
        // Hermes API Server and OpenClaw ACP both accept native image input.
        // Hermes' legacy proxy is also OpenAI-vision compatible when its
        // selected upstream model supports images.
        vision: true,
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
    this.command = commandPath(provider, config.command);
    this.model = config.model || '';
    this.proxyPort = Number(process.env.HERMES_PROXY_PORT || config.proxyPort || 8645);
    // An explicit provider wins. Otherwise select the first authenticated
    // Hermes proxy adapter at runtime instead of assuming Nous is logged in.
    this.proxyProvider = process.env.HERMES_PROXY_PROVIDER || config.proxyProvider || '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (this.provider === 'openclaw') {
        // The full status command performs an RPC probe that can take tens of
        // seconds on a healthy Gateway. Detection only needs the service state;
        // ACP execution performs the authenticated request-level proof later.
        // `--no-probe` avoids reporting a running Gateway as unavailable just
        // because the diagnostic CLI probe is slow.
        const { stdout } = await execFileAsync(this.command, ['gateway', 'status', '--json', '--no-probe'], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
        const parsed = JSON.parse(stdout);
        return parsed?.rpc?.ok === true
          || parsed?.service?.runtime?.status === 'running'
          || parsed?.gateway?.service?.runtime?.status === 'running';
      }
      if (await this.isHermesApiAvailable()) return true;
      for (const provider of this.hermesProxyCandidates()) {
        if (await this.isHermesProxyAvailable(this.hermesProxyPort(provider))) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startedAt = Date.now();
    try {
      const result = this.provider === 'openclaw'
        ? (request.messages.some((message) => Boolean(message.image))
          ? await this.executeOpenClawAcp(request)
          : await this.executeOpenClawCli(request))
        : await this.executeHermesProxy(request);
      const latency = Date.now() - startedAt;
      if (!result.content) throw new Error(`${this.provider} returned an empty response.`);
      this.updateHealth(true, latency);
      this.recordMetrics(latency, result.usage?.prompt_tokens || 0, result.usage?.completion_tokens || 0, 0, true);
      return {
        id: `${this.provider}_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.model || request.model || this.model || 'agent-default',
        choices: [{ index: 0, message: { role: 'assistant', content: result.content }, finishReason: 'stop' }],
        usage: result.usage ? {
          promptTokens: result.usage.prompt_tokens || 0,
          completionTokens: result.usage.completion_tokens || 0,
          totalTokens: result.usage.total_tokens || 0
        } : undefined,
        metadata: { provider: this.provider, latency, modelUsed: result.model || request.model || this.model || 'agent-default' }
      };
    } catch (error) {
      const latency = Date.now() - startedAt;
      this.updateHealth(false, latency, error as Error);
      this.recordMetrics(latency, 0, 0, 0, false);
      throw error;
    }
  }

  private async executeHermesProxy(request: AIRequest): Promise<{ content: string; model?: string; usage?: any }> {
    // Prefer Hermes' full API server. It preserves the agent's tools, memory,
    // sessions, native vision routing, and model selection. The older proxy
    // remains a compatibility fallback for existing installations.
    if (await this.isHermesApiAvailable()) {
      try {
        return await this.executeHermesApiServer(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!this.shouldTryHermesFallback(message)) throw error;
      }
    }

    const messages = request.messages.map((message) => {
      if (!message.image) return { role: message.role, content: message.content };
      const image = message.image.startsWith('data:image/') ? message.image : `data:image/jpeg;base64,${message.image}`;
      return { role: message.role, content: [{ type: 'text', text: message.content }, { type: 'image_url', image_url: { url: image } }] };
    });
    const errors: string[] = [];
    for (const provider of this.hermesProxyCandidates()) {
      const port = this.hermesProxyPort(provider);
      try {
        await this.ensureHermesProxy(provider, port);
        const model = await this.resolveHermesModel(request.model || this.model, port);
        const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer cannaai-managed-by-hermes' },
          body: JSON.stringify({ model, messages, temperature: request.temperature, max_tokens: request.maxTokens || 2048 }),
          signal: timeoutSignal(this.config.timeout)
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(`Hermes ${provider} proxy error ${response.status}: ${body?.error?.message || body?.message || response.statusText}`);
        }
        const content = String(body?.choices?.[0]?.message?.content || '').trim();
        if (!content) throw new Error(`Hermes ${provider} returned an empty response`);
        return { content, model: body.model || model, usage: body.usage };
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);
        if (!this.shouldTryHermesFallback(message)) throw error;
      }
    }
    throw new Error(`All Hermes proxy providers failed: ${errors.join(' | ')}`);
  }

  private hermesApiBaseUrl(): string {
    const configured = process.env.HERMES_API_URL || 'http://127.0.0.1:8642/v1';
    return configured.replace(/\/+$/, '').replace(/\/v1$/i, '');
  }

  private hermesApiHeaders(): Record<string, string> {
    const key = process.env.HERMES_API_KEY || process.env.HERMES_API_SERVER_KEY;
    return {
      'content-type': 'application/json',
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    };
  }

  private async isHermesApiAvailable(): Promise<boolean> {
    // Hermes API Server is bearer-protected by design. Do not advertise a
    // reachable but unauthenticated port as an available agent provider.
    if (!process.env.HERMES_API_KEY && !process.env.HERMES_API_SERVER_KEY) return false;
    try {
      const response = await fetch(`${this.hermesApiBaseUrl()}/health`, {
        headers: this.hermesApiHeaders(),
        signal: timeoutSignal(1500),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async resolveHermesApiModel(requested: string | undefined): Promise<string> {
    if (requested && requested !== 'auto') return requested;
    const response = await fetch(`${this.hermesApiBaseUrl()}/v1/models`, {
      headers: this.hermesApiHeaders(),
      signal: timeoutSignal(5000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Hermes API model discovery failed (${response.status})`);
    }
    const model = Array.isArray(body?.data)
      ? body.data.find((item: any) => typeof item?.id === 'string')?.id
      : undefined;
    return model || process.env.HERMES_MODEL || 'hermes-agent';
  }

  private async executeHermesApiServer(request: AIRequest): Promise<{ content: string; model?: string; usage?: any }> {
    const messages = request.messages.map((message) => {
      if (!message.image) return { role: message.role, content: message.content };
      const image = message.image.startsWith('data:image/')
        ? message.image
        : `data:image/jpeg;base64,${message.image}`;
      return {
        role: message.role,
        content: [
          { type: 'text', text: message.content },
          { type: 'image_url', image_url: { url: image, detail: 'high' } },
        ],
      };
    });
    const model = await this.resolveHermesApiModel(request.model || this.model);
    const response = await fetch(`${this.hermesApiBaseUrl()}/v1/chat/completions`, {
      method: 'POST',
      headers: this.hermesApiHeaders(),
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens || 2048,
        stream: false,
      }),
      signal: timeoutSignal(this.config.timeout),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Hermes API error ${response.status}: ${body?.error?.message || body?.message || response.statusText}`);
    }
    const rawContent = body?.choices?.[0]?.message?.content;
    const content = Array.isArray(rawContent)
      ? rawContent.filter((part: any) => part?.type === 'text' && typeof part?.text === 'string').map((part: any) => part.text).join('')
      : String(rawContent || '').trim();
    if (!content) throw new Error('Hermes API returned an empty response');
    return { content: content.trim(), model: body.model || model, usage: body.usage };
  }

  private async resolveHermesModel(requested: string | undefined, port: number): Promise<string> {
    if (requested && requested !== 'auto') return requested;
    const response = await fetch(`http://127.0.0.1:${port}/v1/models`, { signal: timeoutSignal(5000) });
    const body = await response.json().catch(() => ({}));
    const models = Array.isArray(body?.data)
      ? body.data.filter((item: any) => typeof item?.id === 'string' && !/imagine|video|embed/i.test(item.id))
      : [];
    const freeModel = models.find((item: any) => {
      const prompt = Number(item?.pricing?.prompt);
      const completion = Number(item?.pricing?.completion);
      return (Number.isFinite(prompt) && prompt === 0) || (Number.isFinite(completion) && completion === 0) || /:free$/i.test(item.id);
    });
    const model = (freeModel || models[0])?.id;
    if (!model) throw new Error('Hermes proxy returned no text-capable models');
    return model;
  }

  private async executeOpenClawCli(request: AIRequest): Promise<{ content: string; model?: string; usage?: any }> {
    const prompt = request.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
    const args = ['agent', '--json', '--agent', process.env.OPENCLAW_AGENT_ID || 'main', '--session-key', `cannaai:${process.pid}`, '--thinking', 'off', '--timeout', String(Math.ceil(this.config.timeout / 1000)), '--message', prompt];
    if (request.model || this.model) args.push('--model', request.model || this.model);
    const { stdout } = await execFileAsync(this.command, args, { timeout: this.config.timeout + 5000, maxBuffer: 12 * 1024 * 1024, env: { ...process.env } });
    const parsed = JSON.parse(stdout.trim());
    const payload = parsed?.result?.payloads?.find((item: any) => typeof item?.text === 'string' && item.text.trim());
    return {
      content: String(payload?.text || parsed?.result?.text || parsed?.summary || '').trim(),
      model: parsed?.result?.meta?.agentMeta?.model || request.model || this.model || 'openclaw-agent',
      usage: parsed?.result?.meta?.agentMeta?.usage
    };
  }

  private async ensureHermesProxy(provider: string, port: number): Promise<void> {
    if (await this.isHermesProxyAvailable(port)) return;
    const key = `${this.command}:${port}:${provider}`;
    if (!children.has(key)) {
      const child = spawn(this.command, ['proxy', 'start', '--provider', provider, '--host', '127.0.0.1', '--port', String(port)], {
        detached: true, stdio: 'ignore', env: { ...process.env }
      });
      child.unref();
      children.set(key, child);
      // A failed or intentionally stopped Hermes proxy must be restartable on
      // the next request. Keeping an exited ChildProcess in this registry
      // made the connection look permanently stuck until CannaAI restarted.
      child.once('exit', () => {
        if (children.get(key) === child) children.delete(key);
      });
      child.once('error', () => {
        if (children.get(key) === child) children.delete(key);
      });
    }
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await this.isHermesProxyAvailable(port)) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const child = children.get(key);
    if (child && !child.killed) child.kill('SIGTERM');
    children.delete(key);
    throw new Error(`Hermes ${provider} proxy is not reachable on 127.0.0.1:${port}; authenticate Hermes first with hermes portal login or connect an upstream with hermes proxy providers.`);
  }

  private hermesProxyCandidates(): string[] {
    if (this.proxyProvider) return [this.proxyProvider];
    return ['nous', 'xai'];
  }

  private hermesProxyPort(provider: string): number {
    if (this.proxyProvider || provider === 'nous') return this.proxyPort;
    return Number(process.env.HERMES_XAI_PROXY_PORT || this.proxyPort + 1);
  }

  private async isHermesProxyAvailable(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: timeoutSignal(1500) });
      return response.ok;
    } catch {
      return false;
    }
  }

  private shouldTryHermesFallback(message: string): boolean {
    return /(?:no usable credits|requires available credits|credit|not found|unauthorized|forbidden|empty response|capacity|rate limit|\b429\b|\b5\d\d\b|not reachable)/i.test(message);
  }

  private async resolveHermesProxyProvider(): Promise<string> {
    if (this.proxyProvider) return this.proxyProvider;
    try {
      const { stdout } = await execFileAsync(this.command, ['proxy', 'status'], { timeout: 5000, maxBuffer: 1024 * 1024 });
      if (/\[nous\s*\][^\n]*\bready\b/i.test(stdout)) return 'nous';
      if (/\[xai\s*\][^\n]*\bready\b/i.test(stdout)) return 'xai';
    } catch { /* report the normal proxy-auth error below */ }
    return 'nous';
  }

  private async executeOpenClawAcp(request: AIRequest): Promise<{ content: string; model?: string; usage?: any }> {
    const tempFiles: string[] = [];
    let child: ChildProcess | undefined;
    try {
      const prompt: any[] = [];
      for (const message of request.messages) {
        prompt.push({ type: 'text', text: `${message.role.toUpperCase()}: ${message.content}` });
        if (message.image) {
          const raw = message.image.replace(/^data:image\/[^;]+;base64,/, '');
          const filePath = path.join(os.tmpdir(), `cannaai-acp-${process.pid}-${Date.now()}.jpg`);
          await writeFile(filePath, Buffer.from(raw, 'base64'), { mode: 0o600 });
          tempFiles.push(filePath);
          prompt.push({ type: 'resource_link', uri: pathToFileURL(filePath).href, name: 'plant-image.jpg', mimeType: 'image/jpeg' });
        }
      }
      child = spawn(this.command, ['acp', ...await this.openClawAcpArgs()], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, OPENCLAW_HIDE_BANNER: '1', OPENCLAW_SUPPRESS_NOTES: '1' } });
      if (!child.stdin || !child.stdout) throw new Error('Could not start OpenClaw ACP bridge');
      const stream = ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout) as unknown as ReadableStream<Uint8Array>);
      const parts: string[] = [];
      const client = new ClientSideConnection(() => ({
        sessionUpdate: async (notification: any) => {
          const update = notification?.update;
          if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') parts.push(update.content.text);
        },
        requestPermission: async (params: any) => ({ outcome: { outcome: 'cancelled' } })
      }), stream);
      const timeout = <T>(promise: Promise<T>, label: string): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`OpenClaw ACP ${label} timed out`)),
            this.config.timeout,
          );
          timer.unref?.();
        });
        return Promise.race([promise, timeoutPromise]).finally(() => {
          if (timer) clearTimeout(timer);
        });
      };
      await timeout(client.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {}, clientInfo: { name: 'cannaai', version: '1.0.0' } }), 'initialization');
      const session = await timeout(client.newSession({ cwd: process.cwd(), mcpServers: [] }), 'session creation');
      const response = await timeout(client.prompt({ sessionId: session.sessionId, prompt }), 'prompt');
      const content = contentFromParts(parts);
      if (!content) throw new Error(`OpenClaw ACP completed with stop reason ${response.stopReason} but no message content`);
      return { content, model: request.model || this.model || 'openclaw-agent' };
    } finally {
      // ACP is a one-request child process here; always close it on success,
      // timeout, or protocol failure so a vision request cannot leak a child.
      if (child && !child.killed) child.kill('SIGTERM');
      await Promise.all(tempFiles.map((file) => rm(file, { force: true })));
    }
  }

  private async openClawAcpArgs(): Promise<string[]> {
    const args = ['--session', `cannaai:${process.pid}`];
    if (process.env.OPENCLAW_ACP_URL) args.push('--url', process.env.OPENCLAW_ACP_URL);
    try {
      const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(process.env.HOME || os.homedir(), '.openclaw', 'openclaw.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      if (!process.env.OPENCLAW_ACP_URL) {
        const port = config?.gateway?.port || 18789;
        args.push('--url', `ws://127.0.0.1:${port}`);
      }
      const token = process.env.OPENCLAW_GATEWAY_TOKEN || config?.gateway?.auth?.token;
      if (token) args.push('--token', token);
    } catch {
      // Let OpenClaw resolve its own configured target if no local config is available.
    }
    return args;
  }

  protected normalizeRequest(request: AIRequest): AIRequest {
    return request;
  }

  protected normalizeResponse(response: any, _metadata: any): AIResponse {
    return response as AIResponse;
  }
}
