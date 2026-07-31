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
import { AgentCommandProvider } from './ai-providers/agent-command-provider';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || resolveOpenClawGatewayUrl();
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL || 'minimax-portal/MiniMax-M3';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || 'openclaw-local';
const OPENCLAW_COMMAND = process.env.OPENCLAW_AGENT_COMMAND || path.join(process.env.HOME || '', '.npm-global', 'bin', 'openclaw');
const OPENCLAW_HEALTHCHECK_TIMEOUT_MS = parseInt(process.env.OPENCLAW_HEALTHCHECK_TIMEOUT_MS || '2000', 10);
const OPENCLAW_REQUEST_TIMEOUT_MS = parseInt(process.env.OPENCLAW_TIMEOUT_MS || '90000', 10);

type OpenClawEndpoint = 'direct' | 'openai';

function normalizeImageDataUrl(image?: string): string | undefined {
  if (!image) return undefined;
  const value = String(image).trim();
  if (!value) return undefined;
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `data:image/png;base64,${value}`;
}

function hasUsableContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value && typeof value === 'object' && Object.keys(value as object).length > 0);
}

let preferredOpenClawEndpoint: OpenClawEndpoint =
  process.env.OPENCLAW_PREFERRED_ENDPOINT === 'openai' ? 'openai' : 'direct';

/**
 * Check if OpenClaw Gateway is available
 */
export async function checkOpenClaw(): Promise<ProviderDetectionResult> {
  try {
    // Check gateway health
    const healthCheck = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(OPENCLAW_HEALTHCHECK_TIMEOUT_MS)
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
      await execFileAsync(OPENCLAW_COMMAND, ['gateway', 'health'], { timeout: OPENCLAW_HEALTHCHECK_TIMEOUT_MS });
      return {
        isAvailable: true,
        provider: 'openclaw',
        reason: 'OpenClaw Gateway is healthy through its supported CLI',
        config: { type: 'openclaw', baseUrl: OPENCLAW_GATEWAY_URL },
        recommendations: []
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`OpenClaw vision/text execution failed: ${errorMessage}`);
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
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  provider: string;
  model?: string;
  endpoint?: string;
  usage?: any;
}> {
  try {
    const {
      image,
      prompt,
      model = OPENCLAW_MODEL,
      timeoutMs = OPENCLAW_REQUEST_TIMEOUT_MS,
      maxTokens = 1400,
      temperature = 0.2
      } = params;
    const normalizedImage = normalizeImageDataUrl(image);

    const deadline = Date.now() + timeoutMs;

    // The current OpenClaw gateway is an authenticated WebSocket/RPC service,
    // so its supported CLI is the reliable text bridge. Keep REST probing for
    // image-capable/older installations, but do not make current users wait
    // through dead REST endpoints first.
    if (process.env.OPENCLAW_TRANSPORT !== 'rest') {
      let imagePath: string | undefined;
      if (normalizedImage) {
        const match = String(normalizedImage).match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s);
        if (!match) throw new Error('OpenClaw image input must be a data URL');
        const extension = match[1].toLowerCase().replace('jpeg', 'jpg');
        imagePath = path.join(os.tmpdir(), `cannaai-openclaw-${process.pid}-${Date.now()}.${extension}`);
        await fs.writeFile(imagePath, Buffer.from(match[2], 'base64'), { mode: 0o600 });
      }

      if (imagePath) {
        try {
          const args = ['infer', 'model', 'run', '--gateway', '--json', '--thinking', 'off', '--prompt', prompt, '--file', imagePath];
          if (model) args.push('--model', model);
          const { stdout } = await execFileAsync(OPENCLAW_COMMAND, args, {
            timeout: timeoutMs,
            maxBuffer: 8 * 1024 * 1024,
            env: { ...process.env }
          });
          const parsed = JSON.parse(stdout.trim());
          const content = parsed.outputs?.[0]?.text || parsed.reply || parsed.response || parsed.content || '';
          if (!hasUsableContent(content)) throw new Error('OpenClaw vision CLI returned an empty response');
          return {
            success: true,
            result: content,
            provider: 'openclaw',
            model: parsed.model || model,
            endpoint: 'openclaw-infer-model-run-vision',
            visionUsed: true
          };
        } finally {
          await fs.rm(imagePath, { force: true }).catch(() => undefined);
        }
      }

      const bridge = new AgentCommandProvider('openclaw', { model });
      const response = await bridge.execute({
        messages: [{ role: 'user', content: prompt }],
        model,
        temperature,
        maxTokens
      });
      const content = response.choices[0]?.message.content;
      if (!hasUsableContent(content)) {
        return {
          success: false,
          error: 'OpenClaw returned an empty response',
          provider: 'openclaw',
          model: response.metadata?.modelUsed || model,
          endpoint: 'openclaw-agent-cli'
        };
      }
      return {
        success: true,
        result: content,
        provider: 'openclaw',
        model: response.metadata?.modelUsed || model,
        endpoint: 'openclaw-agent-cli',
        visionUsed: false,
        usage: response.usage
      };
    }
    const endpointOrder: OpenClawEndpoint[] = preferredOpenClawEndpoint === 'openai'
      ? ['openai', 'direct']
      : ['direct', 'openai'];
    let lastError: Error | null = null;

    for (const endpoint of endpointOrder) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 750) {
        break;
      }

      try {
        if (endpoint === 'direct') {
          const directResponse = await fetch(`${OPENCLAW_GATEWAY_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENCLAW_API_KEY}`
            },
            body: JSON.stringify({
              message: prompt,
              model,
              image: normalizedImage,
              stream: false,
              max_tokens: maxTokens,
              temperature
            }),
            signal: AbortSignal.timeout(remainingMs)
          });

          if (!directResponse.ok) {
            throw new Error(`OpenClaw direct API error: ${directResponse.status} ${directResponse.statusText}`);
          }

          const result = await directResponse.json();
          const content = result.response || result.message || result.content;
          if (!hasUsableContent(content)) {
            throw new Error('OpenClaw direct API returned an empty response');
          }
          preferredOpenClawEndpoint = 'direct';

          return {
            success: true,
            result: content,
            provider: 'openclaw',
            model,
            endpoint: 'api/chat',
            visionUsed: Boolean(normalizedImage),
            usage: result.usage
          };
        }

        const messages: any[] = [{
          role: 'user',
          content: normalizedImage
            ? [
                { type: 'image_url', image_url: { url: normalizedImage } },
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
            model,
            messages,
            max_tokens: maxTokens,
            temperature
          }),
          signal: AbortSignal.timeout(remainingMs)
        });

        if (!response.ok) {
          throw new Error(`OpenClaw OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;
        if (!hasUsableContent(content)) {
          throw new Error('OpenClaw OpenAI API returned an empty response');
        }
        preferredOpenClawEndpoint = 'openai';

        return {
          success: true,
          result: content,
            provider: 'openclaw',
            model,
            endpoint: 'v1/chat/completions',
            visionUsed: Boolean(normalizedImage),
            usage: result.usage
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`OpenClaw ${endpoint} endpoint failed: ${lastError.message}`);
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('OpenClaw request timed out before any endpoint could be tried');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      provider: 'openclaw'
    };
  }
}

function resolveOpenClawGatewayUrl(): string {
  try {
    const fs = require('node:fs');
    const path = require('node:path');
    const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return `http://127.0.0.1:${config?.gateway?.port || 18790}`;
  } catch {
    return 'http://127.0.0.1:18790';
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
