import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';
import { publicPlantImage } from '@/lib/plant-images';
import { resolveEnvTargets } from '@/lib/env-targets';
import { calculateVPD, toCelsius } from '@/lib/ac-infinity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Display-only VPD computed from a reading's own temp/RH, shown next to the
 * device-reported value so the two can be compared. Never used for alerts
 * or control — alert evaluation keeps using the stored reading value.
 */
function computedVpd(details: Record<string, unknown>, fallbackTemp: number | null): number | null {
  const temperature = finite(details.temperature) ?? fallbackTemp;
  const humidity = finite(details.humidity);
  if (temperature === null || humidity === null) return null;
  return calculateVPD(toCelsius(temperature), humidity);
}

function stats(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return { min: null, max: null, average: null, count: 0 };
  return {
    min: Math.min(...present),
    max: Math.max(...present),
    average: Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 100) / 100,
    count: present.length,
  };
}

function publicImages(images: unknown) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((image): image is Record<string, unknown> => Boolean(image && typeof image === 'object'))
    .map((image) => publicPlantImage(image));
}

export async function GET() {
  await ensureSeedData();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [rooms, plants, tasks, alerts, actions] = await Promise.all([
    prisma.room.findMany({ orderBy: { name: 'asc' } }),
    prisma.plant.findMany({
      where: { isActive: true },
      include: {
        strain: true,
        room: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.task.findMany({
      where: { status: { notIn: ['completed', 'cancelled'] } },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    }),
    prisma.alert.findMany({
      where: { acknowledged: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.action.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const plantIds = plants.map((plant) => plant.id);
  const analyses = plantIds.length
    ? await prisma.plantAnalysis.findMany({
        where: { plantId: { in: plantIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : [];

  const recentReadings = await prisma.sensorReading.findMany({
    where: { timestamp: { gte: dayAgo } },
    orderBy: { timestamp: 'desc' },
    take: 1000,
  });
  const climateReadings = recentReadings.filter((reading) => {
    const details = record(reading.data);
    return finite(details.temperature) !== null && finite(details.humidity) !== null;
  });
  const primarySensorId = climateReadings[0]?.sensorId || null;
  const primaryReadings = primarySensorId
    ? climateReadings.filter((reading) => reading.sensorId === primarySensorId).reverse()
    : [];
  const latestReading = primaryReadings.at(-1) || null;
  const latestDetails = record(latestReading?.data);
  const points = primaryReadings.map((reading) => {
    const details = record(reading.data);
    return {
      timestamp: reading.timestamp.toISOString(),
      temperature: finite(details.temperature) ?? finite(reading.value),
      humidity: finite(details.humidity),
      vpd: finite(details.vpd),
    };
  });

  const plantSummaries = plants.map((plant) => ({
    ...plant,
    images: publicImages(plant.images),
    location: plant.room
      ? { id: plant.room.id, name: plant.room.name, type: 'tent', environment: {} }
      : null,
  }));
  const primaryPlant = plantSummaries[0] || null;
  const latestPhoto = plantSummaries
    .flatMap((plant) => (Array.isArray(plant.images) ? plant.images : []).map((image) => ({ plant, image })))
    .sort((a, b) => {
      // A plant's chosen primary photo wins over a merely newer upload; the
      // dashboard hero should be the photo the grower picked for the plant.
      const primaryDelta = Number(b.image.isPrimary === true) - Number(a.image.isPrimary === true);
      if (primaryDelta !== 0) return primaryDelta;
      return String(b.image.capturedAt || '').localeCompare(String(a.image.capturedAt || ''));
    })[0] || null;

  const analysesWithPlants = analyses.map((analysis) => ({
    ...analysis,
    plantName: plants.find((plant) => plant.id === analysis.plantId)?.name || null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      generatedAt: now.toISOString(),
      rooms,
      plants: plantSummaries,
      primaryPlant,
      targets: resolveEnvTargets({
        stage: primaryPlant?.stage,
        optimalConditions: primaryPlant?.strain?.optimalConditions,
      }),
      climate: latestReading
        ? {
            sensorId: latestReading.sensorId,
            sensorName: latestDetails.deviceName || primaryPlant?.room?.name || 'Grow sensor',
            timestamp: latestReading.timestamp.toISOString(),
            temperature: finite(latestDetails.temperature) ?? finite(latestReading.value),
            humidity: finite(latestDetails.humidity),
            vpd: finite(latestDetails.vpd),
            // The stored `vpd` is the device-reported value unless ingest
            // marked it computed (vpdComputed). Expose both sides so the UI
            // can label them honestly: the value the device reported, and
            // the value calculated from this same reading.
            vpdDevice: latestDetails.vpdComputed === true ? null : finite(latestDetails.vpd),
            vpdCalculated: computedVpd(latestDetails, finite(latestReading.value)),
            ports: Array.isArray(latestDetails.ports) ? latestDetails.ports : [],
            source: typeof latestDetails.source === 'string' ? latestDetails.source : null,
          }
        : null,
      last24Hours: {
        temperature: stats(points.map((point) => point.temperature)),
        humidity: stats(points.map((point) => point.humidity)),
        vpd: stats(points.map((point) => point.vpd)),
        points,
      },
      tasks,
      alerts,
      actions,
      analyses: analysesWithPlants,
      latestPhoto: latestPhoto
        ? { plantId: latestPhoto.plant.id, plantName: latestPhoto.plant.name, image: latestPhoto.image }
        : null,
    },
  });
}
