/**
 * Process-level health counters, surfaced by /api/health-check.
 *
 * server.ts deliberately keeps the process alive on unhandled promise
 * rejections (some libraries reject spuriously under Node), but logging
 * alone let real route bugs hide in the noise forever. Counting them —
 * with the most recent error kept — makes the accumulation visible.
 *
 * State lives on globalThis: under tsx the server entry and the route
 * module graph can hold separate module instances (the same pattern the
 * scheduler's tick state uses), and the counter health-check reads must
 * be the one server.ts actually increments.
 */
export interface UnhandledRejectionInfo {
  message: string;
  at: string;
}

export interface ProcessHealth {
  unhandledRejections: number;
  lastUnhandledRejection: UnhandledRejectionInfo | null;
}

interface ProcessHealthGlobal {
  __cannaaiProcessHealth?: ProcessHealth;
}

function state(): ProcessHealth {
  const g = globalThis as ProcessHealthGlobal;
  if (!g.__cannaaiProcessHealth) {
    g.__cannaaiProcessHealth = { unhandledRejections: 0, lastUnhandledRejection: null };
  }
  return g.__cannaaiProcessHealth;
}

export function recordUnhandledRejection(reason: unknown): void {
  const s = state();
  s.unhandledRejections += 1;
  s.lastUnhandledRejection = {
    message: reason instanceof Error ? reason.message : String(reason),
    at: new Date().toISOString(),
  };
}

export function getProcessHealth(): ProcessHealth {
  const s = state();
  return {
    unhandledRejections: s.unhandledRejections,
    lastUnhandledRejection: s.lastUnhandledRejection,
  };
}
