// In-process scheduler — drives CannaAI's due work on a timer so nothing
// depends on a human POSTing to the manual endpoints.
//
// Started once from server.ts. Each tick:
//   1. Runs due Schedule rows and due AnalysisScheduler rows through the
//      shared automation engine (src/lib/automation-engine.ts) — the exact
//      code path the manual /api/automation/engine endpoint uses. The
//      engine advances lastRun/nextRun as it goes, so a second tick finds
//      nothing due and never double-fires.
//   2. Ensures yesterday's DailyReport exists. generateDailyReport() is
//      itself idempotent (it checks for an existing report first); the
//      scheduler pre-checks so the common case stays quiet and cheap.
//   3. Drains due NotificationQueueItems through the existing queue
//      processor (src/lib/notification-queue.ts processQueue — the same
//      function the notification system's 5s worker uses). This is a
//      backstop: if the notification workers never started (e.g. the
//      database was not ready at boot), the queue still moves.
//   4. On a slower maintenance cadence, runs the engine's anomaly scan
//      and milestone generation over recent analyses.
//
// Deliberately NOT automated here:
//   - Data cleanup (analytics-utils cleanupOldData and the engine's
//     cleanup action) DELETES retained records. Grow data is never
//     deleted by a timer; cleanup stays an explicit manual action.
//   - AnalysisBatch execution (/api/automation/run type=batch) runs many
//     AI analyses back to back; it stays a manual trigger.
//   - Anything that could change AC Infinity control state. No such code
//     path exists in this app (see automation-engine.ts header), and the
//     engine's action vocabulary is a closed safe set.
//
// Config (env):
//   CANNAAI_SCHEDULER_DISABLED=true     — do not start the scheduler.
//   CANNAAI_SCHEDULER_INTERVAL_MS       — tick interval (default 60000,
//                                         minimum 5000).
//   CANNAAI_SCHEDULER_MAINTENANCE_EVERY_TICKS
//                                       — anomaly/milestone passes every
//                                         N ticks (default 15, minimum 1).
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';
import { checkSchedules, checkForAnomalies, generateMilestones } from '@/lib/automation-engine';
import { processQueue } from '@/lib/notification-queue';
import { generateDailyReport } from '@/lib/analytics-utils';

const TAG = '[SCHEDULER]';
const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 5_000;
const DEFAULT_MAINTENANCE_EVERY_TICKS = 15;
const INITIAL_TICK_DELAY_MS = 5_000;

let started = false;
let tickRunning = false;
let intervalHandle: NodeJS.Timeout | null = null;
let initialHandle: NodeJS.Timeout | null = null;
let ticksSinceMaintenance = 0;

// Last completed (non-skipped) tick, kept so the health endpoint can
// surface scheduler/queue failures instead of them being log-only.
// The state lives on globalThis (the same singleton pattern as
// src/lib/prisma.ts): under tsx the custom server and the API-route
// module graph can hold SEPARATE instances of this module, so plain
// module-level state written by the server's scheduler is invisible to
// the health route's copy. globalThis is shared by both.
interface SchedulerSharedState {
  running: boolean;
  lastTickAt: string | null;
  lastTickSummary: SchedulerTickSummary | null;
}

const sharedState: SchedulerSharedState = ((
  globalThis as { __cannaaiSchedulerState?: SchedulerSharedState }
).__cannaaiSchedulerState ??= {
  running: false,
  lastTickAt: null,
  lastTickSummary: null,
});

export interface SchedulerStatus {
  running: boolean;
  lastTickAt: string | null;
  lastErrors: string[];
  lastQueueDrained: boolean | null;
  lastSummary: SchedulerTickSummary | null;
}

export function getSchedulerStatus(): SchedulerStatus {
  const { lastTickSummary } = sharedState;
  return {
    running: sharedState.running,
    lastTickAt: sharedState.lastTickAt,
    lastErrors: lastTickSummary ? [...lastTickSummary.errors] : [],
    lastQueueDrained: lastTickSummary ? lastTickSummary.queueDrained : null,
    lastSummary: lastTickSummary
      ? { ...lastTickSummary, errors: [...lastTickSummary.errors] }
      : null,
  };
}

export interface SchedulerTickSummary {
  skipped?: boolean;
  schedulesChecked?: number;
  schedulesExecuted?: number;
  dailyReport: 'exists' | 'generated' | 'error';
  queueDrained: boolean;
  maintenance?: { anomaliesChecked: number; milestonesGenerated: number } | 'error';
  errors: string[];
}

function parsePositiveInt(value: string | undefined, fallback: number, minimum: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, parsed);
}

export function schedulerIntervalMs(): number {
  return parsePositiveInt(process.env.CANNAAI_SCHEDULER_INTERVAL_MS, DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS);
}

export function schedulerMaintenanceEveryTicks(): number {
  return parsePositiveInt(process.env.CANNAAI_SCHEDULER_MAINTENANCE_EVERY_TICKS, DEFAULT_MAINTENANCE_EVERY_TICKS, 1);
}

export function isSchedulerDisabled(): boolean {
  return process.env.CANNAAI_SCHEDULER_DISABLED === 'true';
}

/**
 * Run one scheduler tick. Safe to call concurrently — overlapping calls
 * are skipped (returns { skipped: true }) so a slow tick can never pile
 * up or double-fire work.
 */
export async function runSchedulerTick(now: Date = new Date()): Promise<SchedulerTickSummary> {
  if (tickRunning) {
    console.log(`${TAG} Tick skipped — previous tick still running`);
    return { skipped: true, dailyReport: 'exists', queueDrained: false, errors: [] };
  }

  tickRunning = true;
  const summary: SchedulerTickSummary = { dailyReport: 'exists', queueDrained: false, errors: [] };

  try {
    // 1. Due schedules + due analysis schedulers (shared engine path;
    //    the engine advances nextRun/lastRun itself).
    try {
      const result = await checkSchedules();
      summary.schedulesChecked = result.checked;
      summary.schedulesExecuted = result.executed;
      if (result.checked > 0) {
        console.log(`${TAG} Schedules: checked ${result.checked}, executed ${result.executed}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`schedules: ${message}`);
      console.error(`${TAG} Schedule pass failed:`, error);
    }

    // 2. Daily report for yesterday (the manual scheduled-tasks endpoint
    //    generates yesterday's report too — a report covers a full day).
    try {
      const yesterday = subDays(now, 1);
      const existing = await prisma.dailyReport.findUnique({
        where: { date: startOfDay(yesterday) },
        select: { id: true }
      });
      if (existing) {
        summary.dailyReport = 'exists';
      } else {
        await generateDailyReport(yesterday);
        summary.dailyReport = 'generated';
        console.log(`${TAG} Daily report generated for ${startOfDay(yesterday).toISOString().split('T')[0]}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      summary.dailyReport = 'error';
      summary.errors.push(`dailyReport: ${message}`);
      console.error(`${TAG} Daily report pass failed:`, error);
    }

    // 3. Notification queue drain — the existing processor claims each
    //    item by flipping its status before sending, so items are never
    //    sent twice; failed items follow its built-in retry semantics.
    try {
      const queueResult = await processQueue(now);
      if (queueResult?.skipped) {
        // The queue was NOT drained (e.g. its table is missing, P2021) —
        // say so in the summary instead of reporting a false drain.
        summary.queueDrained = false;
        const reason = queueResult.skipReason || 'queue processing skipped';
        summary.errors.push(`queue: ${reason}`);
        console.warn(`${TAG} Queue drain skipped: ${reason}`);
      } else {
        summary.queueDrained = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`queue: ${message}`);
      console.error(`${TAG} Queue drain failed:`, error);
    }

    // 4. Maintenance cadence: anomaly scan + milestone generation over
    //    recent analyses (the rest of a manual engine "run").
    ticksSinceMaintenance++;
    if (ticksSinceMaintenance >= schedulerMaintenanceEveryTicks()) {
      ticksSinceMaintenance = 0;
      try {
        const anomalies = await checkForAnomalies();
        const milestones = await generateMilestones();
        summary.maintenance = {
          anomaliesChecked: anomalies.checked,
          milestonesGenerated: milestones.generated
        };
        if (anomalies.checked > 0 || milestones.generated > 0) {
          console.log(`${TAG} Maintenance: anomaly scan checked ${anomalies.checked}, milestones generated ${milestones.generated}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        summary.maintenance = 'error';
        summary.errors.push(`maintenance: ${message}`);
        console.error(`${TAG} Maintenance pass failed:`, error);
      }
    }

    // Record the tick for getSchedulerStatus()/health. Only non-skipped
    // ticks reach here — the overlapping-tick guard returns earlier and
    // must not overwrite the last real tick's state.
    sharedState.lastTickAt = now.toISOString();
    sharedState.lastTickSummary = { ...summary, errors: [...summary.errors] };

    return summary;
  } finally {
    tickRunning = false;
  }
}

/**
 * Start the scheduler loop. Idempotent; honors
 * CANNAAI_SCHEDULER_DISABLED. An initial tick runs shortly after start
 * so work that came due while the server was down is caught up.
 */
export function startScheduler(): void {
  if (isSchedulerDisabled()) {
    console.log(`${TAG} Disabled via CANNAAI_SCHEDULER_DISABLED=true`);
    return;
  }
  if (started) {
    console.log(`${TAG} Already running`);
    return;
  }

  started = true;
  sharedState.running = true;
  const intervalMs = schedulerIntervalMs();
  console.log(`${TAG} Started (tick every ${intervalMs}ms, maintenance every ${schedulerMaintenanceEveryTicks()} ticks)`);

  initialHandle = setTimeout(() => {
    void runSchedulerTick().catch((error) => console.error(`${TAG} Initial tick failed:`, error));
  }, INITIAL_TICK_DELAY_MS);
  // Background work must not keep short-lived processes alive.
  initialHandle.unref?.();

  intervalHandle = setInterval(() => {
    void runSchedulerTick().catch((error) => console.error(`${TAG} Tick failed:`, error));
  }, intervalMs);
  intervalHandle.unref?.();
}

/** Stop the scheduler loop (used by graceful shutdown). */
export function stopScheduler(): void {
  if (initialHandle) {
    clearTimeout(initialHandle);
    initialHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (started) {
    console.log(`${TAG} Stopped`);
  }
  started = false;
  sharedState.running = false;
}
