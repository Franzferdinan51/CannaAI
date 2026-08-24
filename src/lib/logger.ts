/**
 * Lightweight structured logger + bounded rotating file sink.
 *
 * Why: 20 files in src/lib/ use raw console.log, which means:
 *   - no log levels (can't filter INFO vs DEBUG)
 *   - no JSON shape (downstream observability tools can't parse it)
 *   - no rotation (dev-direct.log grew to MBs during this work)
 *   - no correlation id per request
 *
 * What this gives us:
 *   - JSON-line output to stdout (already captured by nodemon) for prod tools
 *   - Optional rotating file sink under ~/.cannaai/logs/ (size-bounded, no leak)
 *   - Per-request child logger via withRequest(req) that stamps requestId +
 *     route + ip so traces can be correlated across handler logs
 *   - Tunable via env: LOG_LEVEL, LOG_FILE, LOG_FILE_MAX_BYTES, LOG_FILE_BACKUPS
 *
 * This is intentionally small — no Winston/Pino dep added.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function readMinLevel(): LogLevel {
  const v = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  return LEVEL_RANK[v] !== undefined ? v : 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[readMinLevel()];
}

function readBoolEnv(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

interface Sink {
  write(level: LogLevel, record: Record<string, any>, message: string): void;
}

class StdoutSink implements Sink {
  write(level: LogLevel, record: Record<string, any>, message: string) {
    const payload = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...record });
    if (level === 'error') console.error(payload);
    else if (level === 'warn') console.warn(payload);
    else console.log(payload);
  }
}

class RotatingFileSink implements Sink {
  private stream: fs.WriteStream | null = null;
  private currentSize = 0;
  private dir: string;
  private baseName: string;
  private maxBytes: number;
  private maxBackups: number;

  constructor(opts: { dir: string; baseName: string; maxBytes: number; maxBackups: number }) {
    this.dir = opts.dir;
    this.baseName = opts.baseName;
    this.maxBytes = opts.maxBytes;
    this.maxBackups = opts.maxBackups;
  }

  private ensureStream(): fs.WriteStream | null {
    if (this.stream) return this.stream;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const file = path.join(this.dir, `${this.baseName}.log`);
      if (fs.existsSync(file)) {
        this.currentSize = fs.statSync(file).size;
      }
      this.stream = fs.createWriteStream(file, { flags: 'a' });
      this.stream.on('error', (e) => {
        // If logging itself breaks, fall back silently — never crash the app.
        console.warn('[logger] file sink error:', e?.message);
        this.stream = null;
      });
      return this.stream;
    } catch {
      return null;
    }
  }

  private rotate() {
    try {
      const file = path.join(this.dir, `${this.baseName}.log`);
      // Shift backups: .3 → delete, .2 → .3, .1 → .2, current → .1
      for (let i = this.maxBackups; i >= 1; i--) {
        const src = i === 1 ? file : path.join(this.dir, `${this.baseName}.${i - 1}.log`);
        const dst = path.join(this.dir, `${this.baseName}.${i}.log`);
        if (fs.existsSync(src)) {
          if (i === this.maxBackups) {
            try { fs.unlinkSync(dst); } catch {}
          }
          fs.renameSync(src, dst);
        }
      }
    } catch {
      // ignore rotation failures
    }
  }

  write(level: LogLevel, record: Record<string, any>, message: string) {
    const s = this.ensureStream();
    if (!s) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...record }) + '\n';
    s.write(line);
    this.currentSize += Buffer.byteLength(line, 'utf8');
    if (this.currentSize > this.maxBytes) {
      try {
        s.end();
      } catch {}
      this.stream = null;
      this.rotate();
      this.currentSize = 0;
    }
  }
}

function buildSinks(): Sink[] {
  const sinks: Sink[] = [new StdoutSink()];
  if (readBoolEnv('LOG_FILE', true)) {
    const dir = process.env.LOG_DIR || path.join(process.env.HOME || '', '.cannaai', 'logs');
    const maxBytes = Number(process.env.LOG_FILE_MAX_BYTES) || 5 * 1024 * 1024; // 5 MB per file
    const maxBackups = Number(process.env.LOG_FILE_BACKUPS) || 3;
    sinks.push(new RotatingFileSink({
      dir,
      baseName: process.env.LOG_FILE_BASE || 'cannaai',
      maxBytes,
      maxBackups,
    }));
  }
  return sinks;
}

const sinks = buildSinks();

function emit(level: LogLevel, record: Record<string, any>, message: string) {
  if (!shouldLog(level)) return;
  for (const s of sinks) {
    try { s.write(level, record, message); } catch { /* never throw from logger */ }
  }
}

export interface Logger {
  debug: (msg: string, fields?: Record<string, any>) => void;
  info:  (msg: string, fields?: Record<string, any>) => void;
  warn:  (msg: string, fields?: Record<string, any>) => void;
  error: (msg: string, fields?: Record<string, any>) => void;
  child: (extra: Record<string, any>) => Logger;
}

let rootLogger: Logger | null = null;

export function getLogger(): Logger {
  if (rootLogger) return rootLogger;
  rootLogger = makeLogger({});
  return rootLogger;
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

/**
 * Build a child logger stamped with a fresh request id, route, method, and
 * client ip so handlers can log a coherent trace across provider calls.
 */
export function withRequest(req: { method?: string; url?: string; headers?: Headers }, extra: Record<string, any> = {}): Logger {
  const requestId = crypto.randomUUID();
  const url = (() => {
    try {
      return req?.url ? new URL(req.url, 'http://localhost').pathname : 'unknown';
    } catch {
      return 'unknown';
    }
  })();
  const ip = (() => {
    try {
      const xff = req?.headers?.get?.('x-forwarded-for');
      if (xff) return xff.split(',')[0].trim();
      return 'local';
    } catch {
      return 'local';
    }
  })();
  return makeLogger({ requestId, route: url, method: req?.method || '-', ip, ...extra });
}
