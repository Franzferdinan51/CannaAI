/** Backwards-compatible OpenClaw helpers.
 *
 * Kept for older CannaAI callers, but deliberately delegates to the official
 * ACP transport. Do not add HTTP Gateway URLs here: OpenClaw's Gateway is a
 * WebSocket/RPC service and its ACP bridge owns authentication and routing.
 */
import { executeWithOpenClaw } from './ai-provider-openclaw';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface OpenClawMessage { role: 'system' | 'user' | 'assistant'; content: string; image?: string }

export async function sendToOpenClaw(messages: OpenClawMessage[], options: any = {}) {
  const result = await executeWithOpenClaw({ messages, model: options.model, temperature: options.temperature, maxTokens: options.maxTokens });
  return { success: result.success, content: result.result, error: result.error, model: result.model };
}

export async function testOpenClawConnection(): Promise<boolean> {
  const result = await executeWithOpenClaw({ prompt: 'Reply with exactly: OPENCLAW_CONNECTED', model: process.env.OPENCLAW_MODEL });
  return result.success === true && Boolean(result.result?.trim());
}

export async function getOpenClawModels(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(process.env.OPENCLAW_AGENT_COMMAND || '/opt/homebrew/bin/openclaw', ['models', 'list', '--json'], { timeout: 8000, maxBuffer: 2 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    return (parsed?.models || parsed?.data || []).map((model: any) => String(model.id || model.name || '')).filter(Boolean);
  } catch {
    return [];
  }
}
