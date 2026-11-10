/**
 * env-targets — the single source of truth for environment target bands.
 *
 * Historically every consumer hardcoded its own bands and they disagreed:
 * /api/grow/today used one stage map, /api/ai-insights used fixed bands
 * (VPD 1.0–1.5 regardless of stage), and the AC Infinity ingest route
 * warned against a hardcoded 65/85 °F. Everything now resolves bands here.
 *
 * Resolution precedence, per metric:
 *   1. The strain's `optimalConditions` (when it carries a usable band for
 *      the plant's stage, or a flat band that applies to every stage).
 *   2. Stage defaults — the grower-consensus bands in stageEnvTargets
 *      below (this is also what /api/grow/today returns).
 *
 * Strain optimalConditions in the wild (see seed data and the dashboard)
 * look like:
 *   {
 *     temperature: { veg: [22, 26], flower: [20, 24] },  // °C, stage-keyed
 *     humidity:    { veg: [60, 70], flower: [40, 50] },  // % RH, stage-keyed
 *     ph: { range: [6.0, 6.5] },
 *     light: { veg: '18/6', flower: '12/12' }
 *   }
 * Parsing is defensive: any metric whose stored band is missing, malformed,
 * or outside sane ranges falls back to the stage default for that metric.
 */

export interface EnvTargets {
  temperatureF: [number, number];
  humidity: [number, number];
  vpd: [number, number];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** A [min, max] pair from either an array or a { min, max } object. */
function asPair(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length === 2) {
    const min = finite(value[0]);
    const max = finite(value[1]);
    if (min !== null && max !== null && min < max) return [min, max];
    return null;
  }
  const rec = record(value);
  const min = finite(rec.min);
  const max = finite(rec.max);
  if (min !== null && max !== null && min < max) return [min, max];
  return null;
}

/**
 * Stage-bucket key candidates for stage-keyed condition maps, most specific
 * first. The legacy maps use `veg` / `flower`; newer data may use the full
 * stage names.
 */
function stageKeys(stage: string | null | undefined): string[] {
  switch ((stage || '').toLowerCase()) {
    case 'seedling':
    case 'germination':
    case 'clone':
    case 'cloning':
      return ['seedling', 'germination', 'clone', 'cloning'];
    case 'vegetative':
    case 'veg':
    case 'vegetation':
      return ['veg', 'vegetative', 'vegetation'];
    case 'flowering':
    case 'flower':
    case 'bloom':
    case 'ripening':
      return ['flower', 'flowering', 'bloom', 'ripening'];
    default:
      return stage ? [stage.toLowerCase()] : [];
  }
}

/**
 * Pull a band out of one optimalConditions section: a flat pair (applies to
 * every stage) or a stage-keyed map ({ veg: [...], flower: [...] }).
 */
function bandFromSection(section: unknown, stage: string | null | undefined): [number, number] | null {
  const flat = asPair(section);
  if (flat) return flat;
  const map = record(section);
  for (const key of stageKeys(stage)) {
    const band = asPair(map[key]);
    if (band) return band;
  }
  return null;
}

function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

function saneTemperatureF(band: [number, number]): boolean {
  return band[0] >= 32 && band[1] <= 120;
}

/**
 * Temperature bands in stored conditions are ambiguous across data sources:
 * `temperatureF` is explicit °F, `temperatureC` is explicit °C, and the
 * legacy `temperature` section is °C (the dashboard renders it with a "C"
 * suffix). A bare `temperature` band whose values sit in the overlapping
 * 45–55 range cannot be attributed to either unit and is treated as
 * unusable rather than guessed.
 */
function temperatureBandFromConditions(
  conditions: Record<string, unknown>,
  stage: string | null | undefined,
): [number, number] | null {
  const explicitF = bandFromSection(conditions.temperatureF, stage);
  if (explicitF && saneTemperatureF(explicitF)) return explicitF;

  const explicitC = bandFromSection(conditions.temperatureC, stage);
  if (explicitC) {
    const converted: [number, number] = [celsiusToFahrenheit(explicitC[0]), celsiusToFahrenheit(explicitC[1])];
    if (saneTemperatureF(converted)) return converted;
  }

  const raw = bandFromSection(conditions.temperature, stage);
  if (!raw) return null;
  if (raw[0] >= -10 && raw[1] <= 45) {
    const converted: [number, number] = [celsiusToFahrenheit(raw[0]), celsiusToFahrenheit(raw[1])];
    return saneTemperatureF(converted) ? converted : null;
  }
  if (raw[0] >= 55 && raw[1] <= 120) return raw;
  return null;
}

/**
 * Stage default bands — grower-consensus stage targets (checked against
 * multiple grow references on 2026-11-10). Until wave 9 the seedling
 * bucket carried early-veg numbers (30–50% RH, VPD 0.8–1.2): alert
 * evaluation flagged healthy seedling humidity as HIGH_HUMIDITY (a real
 * 50.1% reading fired one on 2026-11-06) and stayed silent while
 * seedlings sat far too dry. Duckets caught the same mistake in his
 * controller program that day and corrected it by hand. Seedlings and
 * clones have minimal root systems and take up water through their
 * leaves, so they want high humidity and a gentle VPD; bands step down
 * as the plant matures. Stage matching is case-insensitive.
 */
export function stageEnvTargets(stage: string | null | undefined): EnvTargets {
  const normalized = (stage || '').toLowerCase().trim();
  if (
    normalized === 'seedling' ||
    normalized === 'germination' ||
    normalized === 'clone' ||
    normalized === 'clones' ||
    normalized === 'cloning'
  ) {
    return { temperatureF: [72, 78], humidity: [65, 75], vpd: [0.4, 0.8] };
  }
  if (
    normalized === 'flowering' ||
    normalized === 'flower' ||
    normalized === 'bloom' ||
    normalized === 'ripening'
  ) {
    return { temperatureF: [65, 80], humidity: [40, 55], vpd: [1.0, 1.6] };
  }
  // Vegetative — and any stage this map does not name — uses the
  // early-veg consensus band.
  return { temperatureF: [72, 82], humidity: [55, 65], vpd: [0.8, 1.2] };
}

/**
 * Resolve the effective target bands for a plant context: strain
 * optimalConditions first (per metric, when usable), stage defaults
 * underneath.
 */
export function resolveEnvTargets(input: {
  stage?: string | null;
  optimalConditions?: unknown;
}): EnvTargets {
  const targets = stageEnvTargets(input.stage);
  const conditions = record(input.optimalConditions);
  if (Object.keys(conditions).length === 0) return targets;

  const temperature = temperatureBandFromConditions(conditions, input.stage);
  if (temperature) targets.temperatureF = temperature;

  const humidity = bandFromSection(conditions.humidity, input.stage);
  if (humidity && humidity[0] >= 0 && humidity[1] <= 100) targets.humidity = humidity;

  const vpd = bandFromSection(conditions.vpd, input.stage);
  if (vpd && vpd[0] >= 0 && vpd[1] <= 3.5) targets.vpd = vpd;

  return targets;
}

/**
 * Warning envelope around a target band — the margins /api/ai-insights
 * historically placed around its fixed ideal bands (temp −7/+5 °F,
 * humidity −10/+10 %, VPD −0.2/+0.1 kPa), now applied to whatever band
 * resolveEnvTargets returns so insights and targets can never drift apart.
 */
export function widenEnvTargets(targets: EnvTargets): EnvTargets {
  const round2 = (value: number) => Math.round(value * 100) / 100;
  return {
    temperatureF: [targets.temperatureF[0] - 7, targets.temperatureF[1] + 5],
    humidity: [Math.max(0, targets.humidity[0] - 10), Math.min(100, targets.humidity[1] + 10)],
    vpd: [Math.max(0, round2(targets.vpd[0] - 0.2)), round2(targets.vpd[1] + 0.1)],
  };
}
