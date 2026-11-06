/**
 * alert-evaluation — creates Alert rows from incoming climate readings.
 *
 * Before this module, nothing ever created alerts: checkThresholds() in
 * analytics-utils.ts had no callers, and the AC Infinity ingest route only
 * buried hardcoded 65/85 °F warnings in SensorAnalytics JSON. The dashboard
 * (/api/grow/today) returns unacknowledged Alert rows, so evaluating here —
 * on ingest, right after a reading is stored — is what makes alerts real.
 *
 * Two evaluations run per reading:
 *   1. Stage-band alerts: the reading is compared against the shared
 *      env-targets bands for the sensor's room (plants grouped by stage;
 *      strain optimalConditions win over stage defaults per metric).
 *   2. User-defined AlertThreshold rows, using the same condition logic
 *      (checkCondition) and alert shape checkThresholds() has always used.
 *      checkThresholds() itself is not called: it requires a live Socket.IO
 *      Server instance to broadcast through, which route handlers cannot
 *      reach, and its query ANDs sensorId+roomId so partially-scoped
 *      thresholds would never match.
 *
 * Dedupe: a new alert is not created when an unacknowledged alert for the
 * same sensor + metric + direction already exists within the cooldown
 * window. Detected breaches are still reported to the caller either way,
 * so per-reading warning surfaces keep their previous behavior.
 */

import { prisma } from '@/lib/prisma';
import { checkCondition } from '@/lib/analytics-utils';
import { resolveEnvTargets, type EnvTargets } from '@/lib/env-targets';

export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

export interface ClimateValues {
  temperatureF: number;
  humidity: number;
  vpdKpa: number;
}

export interface BandAlert {
  type: string;
  value: number;
  message: string;
}

export interface EnvironmentAlertResult {
  /** Every out-of-band breach detected in this reading (deduped or not). */
  bandAlerts: BandAlert[];
  bandAlertsCreated: number;
  thresholdAlertsCreated: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

interface MetricSpec {
  targetKey: keyof EnvTargets;
  valueKey: keyof ClimateValues;
  label: string;
  highType: string;
  lowType: string;
  format: (value: number) => string;
}

const METRICS: MetricSpec[] = [
  {
    targetKey: 'temperatureF',
    valueKey: 'temperatureF',
    label: 'temperature',
    highType: 'HIGH_TEMP',
    lowType: 'LOW_TEMP',
    format: (value) => `${round1(value)}°F`,
  },
  {
    targetKey: 'humidity',
    valueKey: 'humidity',
    label: 'humidity',
    highType: 'HIGH_HUMIDITY',
    lowType: 'LOW_HUMIDITY',
    format: (value) => `${round1(value)}%`,
  },
  {
    targetKey: 'vpd',
    valueKey: 'vpdKpa',
    label: 'VPD',
    highType: 'HIGH_VPD',
    lowType: 'LOW_VPD',
    format: (value) => `${round2(value)} kPa`,
  },
];

/**
 * Create an Alert row unless an unacknowledged alert for the same sensor +
 * type (+ optional message prefix, for threshold alerts) already exists
 * within the cooldown window. Returns true when a row was created.
 */
async function createAlertOnce(input: {
  sensorId: string;
  type: string;
  severity: string;
  message: string;
  dedupeMessagePrefix?: string;
}): Promise<boolean> {
  const existing = await prisma.alert.findFirst({
    where: {
      sensorId: input.sensorId,
      type: input.type,
      acknowledged: false,
      createdAt: { gte: new Date(Date.now() - ALERT_COOLDOWN_MS) },
      ...(input.dedupeMessagePrefix
        ? { message: { startsWith: input.dedupeMessagePrefix } }
        : {}),
    },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.alert.create({
    data: {
      sensorId: input.sensorId,
      type: input.type,
      severity: input.severity,
      message: input.message,
    },
  });
  return true;
}

interface StageBand {
  stageLabel: string;
  targets: EnvTargets;
}

/** Widest band across a set of resolved targets, per metric. */
function unionTargets(list: EnvTargets[]): EnvTargets {
  return {
    temperatureF: [
      Math.min(...list.map((targets) => targets.temperatureF[0])),
      Math.max(...list.map((targets) => targets.temperatureF[1])),
    ],
    humidity: [
      Math.min(...list.map((targets) => targets.humidity[0])),
      Math.max(...list.map((targets) => targets.humidity[1])),
    ],
    vpd: [
      Math.min(...list.map((targets) => targets.vpd[0])),
      Math.max(...list.map((targets) => targets.vpd[1])),
    ],
  };
}

/**
 * Bands to evaluate a room reading against: one per growth stage present
 * among the room's active plants, resolved with each plant's strain
 * conditions and unioned per stage so mixed-strain rooms alert on the
 * widest agreed band rather than once per strain. Falls back to the
 * ingest payload's growthStage when the room has no tracked plants.
 */
async function resolveRoomBands(
  roomId: string | null,
  growthStage?: string | null,
): Promise<StageBand[]> {
  if (roomId) {
    const plants = await prisma.plant.findMany({
      where: { locationId: roomId, isActive: true },
      include: { strain: { select: { optimalConditions: true } } },
    });
    if (plants.length > 0) {
      const byStage = new Map<string | null, EnvTargets[]>();
      for (const plant of plants) {
        const resolved = resolveEnvTargets({
          stage: plant.stage,
          optimalConditions: plant.strain?.optimalConditions,
        });
        const list = byStage.get(plant.stage ?? null) ?? [];
        list.push(resolved);
        byStage.set(plant.stage ?? null, list);
      }
      return [...byStage.entries()].map(([stage, resolvedList]) => ({
        stageLabel: stage ?? 'general',
        targets: unionTargets(resolvedList),
      }));
    }
  }
  if (growthStage) {
    return [{ stageLabel: growthStage, targets: resolveEnvTargets({ stage: growthStage }) }];
  }
  return [];
}

/** Metric names an AlertThreshold row may use, mapped to reading values. */
function thresholdMetricValues(values: ClimateValues): Record<string, number> {
  return {
    temperature: values.temperatureF,
    temperaturef: values.temperatureF,
    temp: values.temperatureF,
    humidity: values.humidity,
    vpd: values.vpdKpa,
  };
}

/**
 * Evaluate enabled AlertThreshold rows scoped to this sensor/room (a null
 * scope matches everything). Creates 'threshold' alerts in the exact shape
 * checkThresholds() uses, deduped per threshold within the cooldown.
 */
async function evaluateUserThresholds(input: {
  sensorId: string;
  roomId: string | null;
  values: ClimateValues;
}): Promise<number> {
  const thresholds = await prisma.alertThreshold.findMany({ where: { enabled: true } });
  if (thresholds.length === 0) return 0;

  const metricValues = thresholdMetricValues(input.values);
  let created = 0;
  for (const threshold of thresholds) {
    if (threshold.sensorId && threshold.sensorId !== input.sensorId) continue;
    if (threshold.roomId && threshold.roomId !== input.roomId) continue;
    const value = metricValues[threshold.metric.toLowerCase()];
    if (value === undefined) continue;
    if (!checkCondition(threshold.condition, value, threshold.value)) continue;

    const messagePrefix = `${threshold.metric} ${threshold.condition} ${threshold.value}`;
    const wasCreated = await createAlertOnce({
      sensorId: input.sensorId,
      type: 'threshold',
      severity: threshold.severity,
      message: `${messagePrefix} (current: ${value})`,
      dedupeMessagePrefix: messagePrefix,
    });
    if (wasCreated) created += 1;
  }
  return created;
}

/**
 * Evaluate one stored climate reading and persist any alerts it warrants.
 * Alert rows are a side effect; callers keep their existing response
 * shapes and use `bandAlerts` for per-reading warning surfaces.
 */
export async function evaluateEnvironmentAlerts(input: {
  sensorId: string;
  roomId: string | null;
  roomName: string | null;
  values: ClimateValues;
  growthStage?: string | null;
}): Promise<EnvironmentAlertResult> {
  const place = input.roomName || 'Grow room';
  const bandAlerts: BandAlert[] = [];
  let bandAlertsCreated = 0;

  const bands = await resolveRoomBands(input.roomId, input.growthStage);
  for (const band of bands) {
    for (const spec of METRICS) {
      const value = input.values[spec.valueKey];
      const [min, max] = band.targets[spec.targetKey];
      if (value > max) {
        const message = `${place} ${spec.label} is ${spec.format(value)} — above the ${spec.format(max)} target for ${band.stageLabel} plants.`;
        bandAlerts.push({ type: spec.highType, value, message });
        if (await createAlertOnce({ sensorId: input.sensorId, type: spec.highType, severity: 'warning', message })) {
          bandAlertsCreated += 1;
        }
      } else if (value < min) {
        const message = `${place} ${spec.label} is ${spec.format(value)} — below the ${spec.format(min)} target for ${band.stageLabel} plants.`;
        bandAlerts.push({ type: spec.lowType, value, message });
        if (await createAlertOnce({ sensorId: input.sensorId, type: spec.lowType, severity: 'warning', message })) {
          bandAlertsCreated += 1;
        }
      }
    }
  }

  const thresholdAlertsCreated = await evaluateUserThresholds(input);
  return { bandAlerts, bandAlertsCreated, thresholdAlertsCreated };
}
