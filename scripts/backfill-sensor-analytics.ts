/**
 * One-off backfill: mirror historical SensorReading rows into the
 * SensorAnalytics rollup that /api/analytics/sensors reads. The
 * analytics table had no writer, so years of readings were invisible
 * to the dashboard. Going forward the AC Infinity ingest endpoint
 * writes both tables; this script repairs the history.
 *
 * Run once on the host:  npx tsx scripts/backfill-sensor-analytics.ts
 * Idempotent: readings already mirrored (same sensor + timestamp)
 * are skipped.
 */
import { PrismaClient } from '@prisma/client';
import { vpdBand } from '../src/lib/ac-infinity';

const prisma = new PrismaClient();

async function main() {
  const readings = await prisma.sensorReading.findMany({
    orderBy: { timestamp: 'asc' },
  });
  let created = 0;
  let skipped = 0;
  for (const r of readings) {
    const exists = await prisma.sensorAnalytics.findFirst({
      where: { sensorId: r.sensorId, timestamp: r.timestamp },
    });
    if (exists) {
      skipped++;
      continue;
    }
    const d = (r.data as Record<string, unknown>) || {};
    const temp = typeof d.temperature === 'number' ? d.temperature : r.value;
    const humidity = typeof d.humidity === 'number' ? d.humidity : null;
    const vpd = typeof d.vpd === 'number' ? d.vpd : null;
    let status = 'ok';
    if (temp > 85 || temp < 65) status = 'warning';
    if (vpd !== null && vpdBand(vpd) !== 'optimal') status = 'warning';
    await prisma.sensorAnalytics.create({
      data: {
        sensorId: r.sensorId,
        reading: temp,
        value: {
          temperature: temp,
          humidity,
          vpd,
          source: typeof d.source === 'string' ? d.source : 'ac-infinity',
          backfilled: true,
        },
        status,
        temperature: temp,
        humidity,
        timestamp: r.timestamp,
      },
    });
    created++;
  }
  console.log(
    `backfill complete: ${created} created, ${skipped} already present, ${readings.length} readings total`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
