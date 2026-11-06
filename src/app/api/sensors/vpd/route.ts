import { NextResponse } from 'next/server';
import { ensureSeedData } from '@/lib/seed-data';
import { getLatestSensorMetric } from '@/lib/sensor-metrics';
import { unavailableApiResponse } from '@/lib/unavailable-api';

// Single-value shortcut over the real sensor fleet (same resolution as
// /api/sensors/data/latest). Metrics no installed sensor reports — today
// that is co2 and light — answer with the honest unavailable response
// instead of a not-found error or an invented number.
// VPD is served exactly as the device reported it in the stored payload;
// it is never recomputed locally (the previous route ran a °C saturation
// formula over °F values and produced garbage).
export async function GET() {
  await ensureSeedData();
  const metric = await getLatestSensorMetric('vpd');
  if (!metric) return unavailableApiResponse('VPD sensing');
  return NextResponse.json({
    success: true,
    value: metric.value,
    unit: 'kPa',
    sensorId: metric.sensorId,
    timestamp: metric.timestamp,
  });
}
