/**
 * Browser-safe structured logger — same shape as ./logger (getLogger/child,
 * JSON lines, level filtering) but console-only.
 *
 * Why this exists: ./logger is server-only — it imports node:fs/path/crypto
 * for its rotating file sink, which breaks webpack client bundles
 * (UnhandledSchemeError: node:fs) when a client module imports it.
 * Client-side modules (socket-client, browser components) import THIS file.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function readMinLevel(): LogLevel {
  const v = ((typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LOG_LEVEL) || 'info').toLowerCase() as LogLevel;
  return LEVEL_RANK[v] !== undefined ? v : 'info';
}

function emit(level: LogLevel, record: Record<string, any>, message: string) {
  if (LEVEL_RANK[level] < LEVEL_RANK[readMinLevel()]) return;
  const payload = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...record });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export interface Logger {
  debug: (msg: string, fields?: Record<string, any>) => void;
  info:  (msg: string, fields?: Record<string, any>) => void;
  warn:  (msg: string, fields?: Record<string, any>) => void;
  error: (msg: string, fields?: Record<string, any>) => void;
  child: (extra: Record<string, any>) => Logger;
}

function makeLogger(baseFields: Record<string, any>): Logger {
  const log = (level: LogLevel, msg: string, fields?: Record<string, any>) =>
    emit(level, { ...baseFields, ...(fields || {}) }, msg);
  return {
    debug: (m, f) => log('debug', m, f),
    info:  (m, f) => log('info', m, f),
    warn:  (m, f) => log('warn', m, f),
    error: (m, f) => log('error', m, f),
    child: (extra) => makeLogger({ ...baseFields, ...extra }),
  };
}

let rootLogger: Logger | null = null;

export function getLogger(): Logger {
  if (rootLogger) return rootLogger;
  rootLogger = makeLogger({});
  return rootLogger;
}
