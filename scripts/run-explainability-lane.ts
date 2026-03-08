import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getImageExplainabilityFailures } from '../tests/utils/explainability-contract';

type MatrixStatus = 'PASS' | 'FAIL' | 'SKIP';

interface MatrixRow {
  lane: string;
  scenario: string;
  status: MatrixStatus;
  notes: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const syntheticTestPath = 'tests/unit/analyze-explainability-contract.test.ts';
const jestBin = path.join(repoRoot, 'node_modules/jest/bin/jest.js');

function resolveAnalyzeUrl(value?: string): string {
  const base = value?.trim() || 'http://127.0.0.1:3000';

  if (base.endsWith('/api/analyze')) {
    return base;
  }

  return `${base.replace(/\/+$/, '')}/api/analyze`;
}

function formatStatus(status: MatrixStatus): string {
  return status.padEnd(4, ' ');
}

function printMatrix(rows: MatrixRow[]): void {
  const laneWidth = Math.max('Lane'.length, ...rows.map(row => row.lane.length));
  const scenarioWidth = Math.max('Scenario'.length, ...rows.map(row => row.scenario.length));

  console.log('\nExplainability Pass/Fail Matrix');
  console.log(
    `${'Status'.padEnd(6)} | ${'Lane'.padEnd(laneWidth)} | ${'Scenario'.padEnd(scenarioWidth)} | Notes`
  );
  console.log(
    `${'-'.repeat(6)}-+-${'-'.repeat(laneWidth)}-+-${'-'.repeat(scenarioWidth)}-+-${'-'.repeat(40)}`
  );

  rows.forEach(row => {
    console.log(
      `${formatStatus(row.status)} | ${row.lane.padEnd(laneWidth)} | ${row.scenario.padEnd(scenarioWidth)} | ${row.notes}`
    );
  });
}

function runSyntheticLane(): MatrixRow[] {
  if (!existsSync(jestBin)) {
    return [
      {
        lane: 'synthetic',
        scenario: 'jest runner availability',
        status: 'FAIL',
        notes: `Missing Jest binary at ${path.relative(repoRoot, jestBin)}`
      }
    ];
  }

  const result = spawnSync(
    process.execPath,
    [
      jestBin,
      '--runInBand',
      '--no-cache',
      '--json',
      syntheticTestPath
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8'
    }
  );

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (!result.stdout) {
    return [
      {
        lane: 'synthetic',
        scenario: 'jest report generation',
        status: 'FAIL',
        notes: `No JSON report was produced${result.status ? ` (exit ${result.status})` : ''}`
      }
    ];
  }

  let report: any;

  try {
    report = JSON.parse(result.stdout);
  } catch {
    return [
      {
        lane: 'synthetic',
        scenario: 'jest report parsing',
        status: 'FAIL',
        notes: result.stdout.replace(/\s+/g, ' ').slice(0, 220) || 'Unable to parse Jest JSON output'
      }
    ];
  }

  const rows: MatrixRow[] = [];

  for (const suite of report.testResults || []) {
    for (const assertion of suite.assertionResults || []) {
      rows.push({
        lane: 'synthetic',
        scenario: assertion.title,
        status: assertion.status === 'passed' ? 'PASS' : 'FAIL',
        notes:
          assertion.status === 'passed'
            ? 'Explainability fields populated'
            : (assertion.failureMessages || [])
                .join(' ')
                .replace(/\s+/g, ' ')
                .slice(0, 220) || 'Synthetic assertion failed'
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      lane: 'synthetic',
      scenario: 'assertion discovery',
      status: 'FAIL',
      notes: 'Jest completed without reporting any assertions'
    });
  }

  return rows;
}

function detectMimeType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.heic') return 'image/heic';
  if (ext === '.heif') return 'image/heif';

  return 'application/octet-stream';
}

async function runRealImageCheck(): Promise<MatrixRow> {
  const imagePath = process.env.EXPLAINABILITY_REAL_IMAGE_PATH?.trim();

  if (!imagePath) {
    return {
      lane: 'real-image',
      scenario: 'live /api/analyze explainability check',
      status: 'SKIP',
      notes: 'Set EXPLAINABILITY_REAL_IMAGE_PATH and start the API server to enable this row'
    };
  }

  if (!existsSync(imagePath)) {
    return {
      lane: 'real-image',
      scenario: 'live /api/analyze explainability check',
      status: 'FAIL',
      notes: `Image file not found: ${imagePath}`
    };
  }

  const timeoutMs = Number(process.env.EXPLAINABILITY_API_TIMEOUT_MS || 120000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const analyzeUrl = resolveAnalyzeUrl(process.env.EXPLAINABILITY_API_URL);

  try {
    const imageBuffer = readFileSync(imagePath);
    const mimeType = detectMimeType(imagePath);
    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        strain: 'Blueberry Muffin',
        leafSymptoms: 'White residue on fan leaves with slight lower-leaf chlorosis and canopy crowding',
        phLevel: 6.2,
        temperature: 77,
        humidity: 61,
        medium: 'Living soil',
        growthStage: 'early flowering',
        urgency: 'high',
        additionalNotes: 'Explainability live-check payload generated on 2026-03-08.',
        plantImage: `data:${mimeType};base64,${imageBuffer.toString('base64')}`
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        lane: 'real-image',
        scenario: 'live /api/analyze explainability check',
        status: 'FAIL',
        notes: `HTTP ${response.status}${payload?.error?.message ? `: ${payload.error.message}` : ''}`
      };
    }

    const failures = getImageExplainabilityFailures(payload?.analysis);

    if (failures.length > 0) {
      return {
        lane: 'real-image',
        scenario: 'live /api/analyze explainability check',
        status: 'FAIL',
        notes: failures.join('; ').slice(0, 240)
      };
    }

    const provider = payload?.provider?.used || 'unknown';
    return {
      lane: 'real-image',
      scenario: 'live /api/analyze explainability check',
      status: 'PASS',
      notes: `Provider ${provider}; image explainability fields populated`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      lane: 'real-image',
      scenario: 'live /api/analyze explainability check',
      status: 'FAIL',
      notes: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const rows = [...runSyntheticLane(), await runRealImageCheck()];
  printMatrix(rows);

  const hasFailures = rows.some(row => row.status === 'FAIL');
  process.exitCode = hasFailures ? 1 : 0;
}

void main();
