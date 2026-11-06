import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractMetrics, metricStats } from '@/lib/reports-analytics';

// Dataset export for later training use: plants (with strain + room), their
// analyses and health history, photo metadata, and the sensor window around
// them, joined by date range.
//
// GET /api/export/dataset?from=<ISO>&to=<ISO>&roomId=<id>&plantId=<id>&format=json|jsonl
//
// Images are REFERENCED (id, url, storage key, capture metadata), never
// copied or moved — the files stay in the plant photo store. Sensor readings
// are included per sensor up to READING_CAP; the per-sensor summary always
// covers the full window and `truncated` says when the cap cut the series.

const READING_CAP = 5000;

interface ExportWindow {
  from: Date;
  to: Date;
  fromProvided: boolean;
}

function parseWindow(searchParams: URLSearchParams): ExportWindow | { error: string } {
  const fromRaw = searchParams.get('from') || searchParams.get('start') || searchParams.get('startDate');
  const toRaw = searchParams.get('to') || searchParams.get('end') || searchParams.get('endDate');
  const from = fromRaw ? new Date(fromRaw) : new Date(0);
  const to = toRaw ? new Date(toRaw) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: 'Invalid date: from/to must be ISO 8601 timestamps.' };
  }
  if (from > to) {
    return { error: 'Invalid window: from must be before to.' };
  }
  return { from, to, fromProvided: Boolean(fromRaw) };
}

function stats(values: number[]) {
  const s = metricStats(values);
  return { count: s.count, average: s.average, minimum: s.minimum, maximum: s.maximum };
}

async function sensorWindow(sensorId: string, window: ExportWindow, includeReadings: boolean) {
  const total = await prisma.sensorReading.count({
    where: { sensorId, timestamp: { gte: window.from, lte: window.to } },
  });
  const rows = await prisma.sensorReading.findMany({
    where: { sensorId, timestamp: { gte: window.from, lte: window.to } },
    orderBy: { timestamp: 'asc' },
    take: includeReadings ? READING_CAP : 0,
    select: { timestamp: true, value: true, data: true },
  });
  const readings = rows.map((row) => ({ timestamp: row.timestamp, ...extractMetrics(row) }));
  return {
    readingCount: total,
    readingsIncluded: readings.length,
    truncated: total > readings.length,
    summary: {
      temperature: stats(readings.map((r) => r.temperature).filter((v): v is number => v !== null)),
      humidity: stats(readings.map((r) => r.humidity).filter((v): v is number => v !== null)),
      vpd: stats(readings.map((r) => r.vpd).filter((v): v is number => v !== null)),
    },
    readings: readings.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      temperature: r.temperature,
      humidity: r.humidity,
      vpd: r.vpd,
    })),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = parseWindow(searchParams);
  if ('error' in window) {
    return NextResponse.json({ success: false, error: window.error }, { status: 400 });
  }
  const format = (searchParams.get('format') || 'json').toLowerCase();
  if (format !== 'json' && format !== 'jsonl') {
    return NextResponse.json({ success: false, error: `Unsupported format '${format}'. Use json or jsonl.` }, { status: 400 });
  }
  const roomId = searchParams.get('roomId') || undefined;
  const plantId = searchParams.get('plantId') || undefined;

  try {
    if (!window.fromProvided) {
      // Default export covers all recorded data; report the window from the
      // earliest record instead of the epoch.
      const [firstReading, firstPlant] = await Promise.all([
        prisma.sensorReading.findFirst({ orderBy: { timestamp: 'asc' }, select: { timestamp: true } }),
        prisma.plant.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      ]);
      const candidates = [firstReading?.timestamp, firstPlant?.createdAt]
        .filter((value): value is Date => Boolean(value));
      if (candidates.length) {
        window.from = new Date(Math.min(...candidates.map((d) => d.getTime())));
      }
    }
    const plants = await prisma.plant.findMany({
      where: {
        ...(plantId ? { id: plantId } : {}),
        ...(roomId ? { locationId: roomId } : {}),
      },
      include: {
        strain: true,
        room: { select: { id: true, name: true } },
        analyses: {
          where: { createdAt: { gte: window.from, lte: window.to } },
          orderBy: { createdAt: 'asc' },
        },
        healthAnalytics: {
          where: { timestamp: { gte: window.from, lte: window.to } },
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Sensors in scope: the requested room, else the rooms of the exported
    // plants, else every sensor.
    const plantRoomIds = Array.from(new Set(plants.map((p) => p.locationId).filter((v): v is string => Boolean(v))));
    const sensors = await prisma.sensor.findMany({
      where: roomId
        ? { locationId: roomId }
        : plantId
          ? { locationId: { in: plantRoomIds } }
          : {},
      include: { room: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const sensorExports = [];
    for (const sensor of sensors) {
      const win = await sensorWindow(sensor.id, window, format === 'json');
      sensorExports.push({
        id: sensor.id,
        name: sensor.name,
        type: sensor.type,
        roomId: sensor.locationId,
        roomName: sensor.room?.name ?? null,
        ...win,
      });
    }
    const sensorByRoom = new Map(sensorExports.map((s) => [s.roomId, s]));

    const plantExports = plants.map((plant) => {
      const images = Array.isArray(plant.images) ? (plant.images as Record<string, unknown>[]) : [];
      return {
        id: plant.id,
        name: plant.name,
        strain: plant.strain ? { id: plant.strain.id, name: plant.strain.name } : null,
        room: plant.room ? { id: plant.room.id, name: plant.room.name } : null,
        stage: plant.stage,
        plantedDate: plant.plantedDate ? plant.plantedDate.toISOString() : null,
        ageDays: plant.age,
        health: plant.health,
        notes: plant.notes,
        tags: plant.tags,
        // Photo metadata only — the image files themselves stay in place.
        images: images.map((image) => ({
          id: image.id ?? null,
          url: image.url ?? null,
          storageKey: image.storageKey ?? null,
          filename: image.filename ?? null,
          description: image.description ?? null,
          type: image.type ?? null,
          capturedAt: image.capturedAt ?? null,
          uploadedAt: image.uploadedAt ?? null,
          fileSize: image.fileSize ?? null,
          dimensions: image.dimensions ?? null,
          isPrimary: image.isPrimary ?? false,
          tags: image.tags ?? [],
        })),
        analyses: plant.analyses.map((analysis) => ({
          id: analysis.id,
          provider: analysis.provider,
          request: analysis.request,
          result: analysis.result,
          imageInfo: analysis.imageInfo,
          createdAt: analysis.createdAt.toISOString(),
        })),
        healthAnalytics: plant.healthAnalytics.map((row) => ({
          id: row.id,
          analysisId: row.analysisId,
          healthScore: row.healthScore,
          healthStatus: row.healthStatus,
          issues: row.issues,
          recommendations: row.recommendations,
          confidence: row.confidence,
          timestamp: row.timestamp.toISOString(),
        })),
        createdAt: plant.createdAt.toISOString(),
        updatedAt: plant.updatedAt.toISOString(),
      };
    });

    const stamp = `${window.from.toISOString().slice(0, 10)}_${window.to.toISOString().slice(0, 10)}`;

    if (format === 'jsonl') {
      // One object per plant; the room's sensor window summary rides along
      // as environmental context (full reading series stay in the JSON form).
      const lines = plantExports.map((plant) => {
        const sensor = plant.room ? sensorByRoom.get(plant.room.id) : undefined;
        return JSON.stringify({
          type: 'plant',
          exportWindow: { from: window.from.toISOString(), to: window.to.toISOString() },
          ...plant,
          environment: sensor
            ? {
                sensorId: sensor.id,
                sensorName: sensor.name,
                readingCount: sensor.readingCount,
                summary: sensor.summary,
              }
            : null,
        });
      });
      return new NextResponse(lines.length ? `${lines.join('\n')}\n` : '', {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Content-Disposition': `attachment; filename="cannaai-dataset-${stamp}.jsonl"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    const payload = {
      dataset: 'cannaai-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      window: { from: window.from.toISOString(), to: window.to.toISOString() },
      filters: { roomId: roomId ?? null, plantId: plantId ?? null },
      counts: {
        plants: plantExports.length,
        analyses: plantExports.reduce((sum, p) => sum + p.analyses.length, 0),
        healthAnalytics: plantExports.reduce((sum, p) => sum + p.healthAnalytics.length, 0),
        images: plantExports.reduce((sum, p) => sum + p.images.length, 0),
        sensors: sensorExports.length,
        sensorReadings: sensorExports.reduce((sum, s) => sum + s.readingCount, 0),
      },
      plants: plantExports,
      sensors: sensorExports,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="cannaai-dataset-${stamp}.json"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Dataset export failed:', error);
    return NextResponse.json({ success: false, error: 'Dataset export failed.' }, { status: 500 });
  }
}
