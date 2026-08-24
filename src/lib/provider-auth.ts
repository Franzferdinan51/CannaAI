import { execFile, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const stateDir = path.join(os.tmpdir(), 'cannaai-provider-auth');
const stateFile = path.join(stateDir, 'sessions.json');

export type AuthProvider = 'openai' | 'grok' | 'openclaw' | 'hermes' | 'nous' | 'xai';
type Session = { provider: AuthProvider; command: string; args: string[]; startedAt: string; log: string; pid?: number };

function commandPath(command: string): string {
  // LaunchAgents have a minimal PATH. These are the only binaries we invoke.
  return command === 'openclaw' ? (process.env.OPENCLAW_BIN || '/opt/homebrew/bin/openclaw') :
    (process.env.HERMES_BIN || '/Users/duckets/.local/bin/hermes');
}

async function readSessions(): Promise<Record<string, Session>> {
  try { return JSON.parse(await readFile(stateFile, 'utf8')); } catch { return {}; }
}

async function writeSessions(sessions: Record<string, Session>) {
  await mkdir(stateDir, { recursive: true });
  await writeFile(stateFile, JSON.stringify(sessions, null, 2), { mode: 0o600 });
}

export function authCommand(provider: AuthProvider): { command: string; args: string[]; label: string } {
  // OpenClaw renamed the Codex provider to `openai`; openai-codex is legacy
  // and silently fails on current releases.
  if (provider === 'openai') return { command: commandPath('openclaw'), args: ['models', 'auth', 'login', '--agent', 'main', '--provider', 'openai', '--method', 'oauth'], label: 'OpenAI / ChatGPT OAuth' };
  if (provider === 'grok' || provider === 'xai') return { command: commandPath('openclaw'), args: ['models', 'auth', 'login', '--agent', 'main', '--provider', 'xai', '--method', 'oauth'], label: 'xAI / Grok OAuth' };
  if (provider === 'nous') return { command: commandPath('hermes'), args: ['portal', 'login'], label: 'Nous Portal OAuth' };
  if (provider === 'hermes') return { command: commandPath('hermes'), args: ['portal', 'login'], label: 'Hermes / Nous Portal OAuth' };
  if (provider === 'openclaw') return { command: commandPath('openclaw'), args: ['gateway', 'status', '--json'], label: 'OpenClaw Gateway connection' };
  return { command: commandPath('hermes'), args: ['portal', 'login'], label: 'Hermes OAuth' };
}

export async function startProviderAuth(provider: AuthProvider) {
  const spec = authCommand(provider);
  // OpenClaw is a local gateway connection, not an OAuth profile. Avoid
  // spawning a detached status command and pretending it launched a login.
  if (provider === 'openclaw') {
    const status = await providerAuthStatus(provider);
    return { started: false, running: status.connected, ...status, label: spec.label, instruction: status.summary };
  }
  const sessions = await readSessions();
  const existing = sessions[provider];
  if (existing?.pid) {
    try { process.kill(existing.pid, 0); return { started: false, running: true, ...existing, label: spec.label }; } catch { /* stale */ }
  }
  await mkdir(stateDir, { recursive: true });
  const log = path.join(stateDir, `${provider}.log`);
  const child = spawn(spec.command, spec.args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  const chunks: Buffer[] = [];
  child.stdout?.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  child.stderr?.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const session: Session = { provider, command: spec.command, args: spec.args, startedAt: new Date().toISOString(), log, pid: child.pid };
  sessions[provider] = session;
  await writeSessions(sessions);
  const flush = async () => { if (chunks.length) await writeFile(log, Buffer.concat(chunks).toString('utf8'), { mode: 0o600 }); };
  child.on('close', flush);
  child.unref();
  return { started: true, running: true, ...session, label: spec.label };
}

async function run(command: string, args: string[], timeout = 8000) {
  try { return (await execFileAsync(command, args, { timeout, maxBuffer: 2 * 1024 * 1024, env: process.env })).stdout; }
  catch (error: any) { return `${error.stdout || ''}\n${error.stderr || ''}`.trim(); }
}

function redact(value: string): string {
  return value.replace(/(token|secret|key|apiKey|authorization|password)[^\n]*/gim, '$1: [redacted]');
}

function parseJson(value: string): any | null {
  try { return JSON.parse(value); } catch { return null; }
}

export async function providerAuthStatus(provider: AuthProvider) {
  if (provider === 'openclaw') {
    const output = await run(commandPath('openclaw'), ['gateway', 'status', '--json']);
    const parsed = parseJson(output);
    const connected = parsed?.rpc?.ok === true || parsed?.gateway?.service?.runtime?.status === 'running';
    return { provider, authenticated: connected, connected, source: 'openclaw-gateway', summary: connected ? 'OpenClaw Gateway is connected' : 'OpenClaw Gateway is not reachable', rawStatus: redact(output) };
  }
  if (provider === 'openai' || provider === 'grok' || provider === 'xai') {
    const output = await run(commandPath('openclaw'), ['models', 'auth', 'list', '--json']);
    const parsed = parseJson(output);
    const profiles = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
    const target = provider === 'openai' ? 'openai' : 'xai';
    const authenticated = profiles.some((item: any) => item?.provider === target && item?.type === 'oauth');
    return { provider, authenticated, connected: authenticated, source: 'openclaw-auth', summary: authenticated ? `${target} OAuth profile is available` : `No ${target} OAuth profile found`, rawStatus: redact(output) };
  }
  // Hermes' proxy is the supported integration surface for external apps. Its
  // status command reflects the actual upstream OAuth adapters (Nous/xAI),
  // whereas `hermes auth status openai-codex` only describes one credential
  // entry and can report a false negative for the proxy.
  const output = await run(commandPath('hermes'), ['proxy', 'status']);
  const target = provider === 'nous' ? 'nous' : undefined;
  const targetLine = target ? new RegExp(`\\[${target}\\][^\\n]*(ready|logged in|authenticated|✓)`, 'i') : null;
  const authenticated = targetLine ? targetLine.test(output) : /\[[^\]]+\][^\n]*(ready|logged in|authenticated|✓)/i.test(output);
  return { provider, authenticated, connected: authenticated, source: 'hermes-proxy', summary: authenticated ? 'Hermes proxy has an authenticated upstream' : 'No authenticated Hermes proxy upstream found', rawStatus: redact(output) };
}

export async function providerAuthLog(provider: AuthProvider) {
  const sessions = await readSessions();
  const session = sessions[provider];
  if (!session) return { provider, output: '' };
  try { return { provider, output: (await readFile(session.log, 'utf8')).slice(-8000) }; } catch { return { provider, output: '' }; }
}
