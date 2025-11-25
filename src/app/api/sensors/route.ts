import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed-data';

export const dynamic = 'auto';
export const revalidate = false;

async function buildEnvironmentSnapshot() {
  const sensors = await prisma.sensor.findMany({
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 1 }, room: true }
  });

  const env = {
    temperature: 72,
    humidity: 55,
    soilMoisture: 45,
    lightIntensity: 750,
    ph: 6.2,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85,
    lastUpdated: new Date().toISOString()
  };

  sensors.forEach(sensor => {
    const latest = sensor.readings[0];
    if (!latest) return;
    switch (sensor.type) {
      case 'temperature':
        env.temperature = latest.value ?? env.temperature;
        break;
      case 'humidity':
        env.humidity = latest.value ?? env.humidity;
        break;
      case 'soil_moisture':
        env.soilMoisture = latest.value ?? env.soilMoisture;
        break;
      case 'light_intensity':
        env.lightIntensity = latest.value ?? env.lightIntensity;
        break;
      case 'ph':
        env.ph = latest.value ?? env.ph;
        break;
      case 'ec':
        env.ec = latest.value ?? env.ec;
        break;
      case 'co2':
        env.co2 = latest.value ?? env.co2;
        break;
      case 'vpd':
        env.vpd = latest.value ?? env.vpd;
        break;
      default:
        break;
    }
    env.lastUpdated = latest.timestamp.toISOString();
  });

  return { env, sensors };
}

export async function GET() {
  await ensureSeedData();

  const [rooms, automationSetting] = await Promise.all([
    prisma.room.findMany(),
    prisma.automationSetting.findFirst()
  ]);
  const automation = automationSetting?.config || {};
  const { env, sensors } = await buildEnvironmentSnapshot();

  return NextResponse.json({
    success: true,
    sensors: env,
    rooms: rooms.map(r => ({ ...r, temp: Math.round(((r.temp ?? 22) * 9) / 5 + 32) })),
    automation,
    timestamp: new Date().toISOString(),
    availableSensors: sensors
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, data, id, name, type, locationId } = body;
  await ensureSeedData();

  if (!action) {
    const created = await prisma.sensor.create({
      data: {
        id: id || undefined,
        name,
        type,
        locationId
      }
    });
    return NextResponse.json({ success: true, data: created });
  }

  try {
    switch (action) {
      case 'update_automation': {
        await prisma.automationSetting.upsert({
          where: { id: 1 },
          create: { id: 1, config: data },
          update: { config: data }
        });
        break;
      }
      case 'toggle_room': {
        if (!data?.roomId) throw new Error('roomId required');
        const room = await prisma.room.findUnique({ where: { id: data.roomId } });
        if (!room) throw new Error('Room not found');
        await prisma.room.update({
          where: { id: data.roomId },
          data: { active: !room.active }
        });
        break;
      }
      case 'water_now': {
        const soilSensor = await prisma.sensor.findFirst({ where: { type: 'soil_moisture' } });
        if (soilSensor) {
          await prisma.sensorReading.create({
            data: { sensorId: soilSensor.id, value: (soilSensor.lastValue ?? 45) + 20 }
          });
          await prisma.sensor.update({
            where: { id: soilSensor.id },
            data: { lastValue: (soilSensor.lastValue ?? 45) + 20, lastUpdated: new Date() }
          });
        }
        break;
      }
      case 'toggle_lights': {
        const lightSensor = await prisma.sensor.findFirst({ where: { type: 'light_intensity' } });
        if (lightSensor) {
          const nextValue = lightSensor.lastValue && lightSensor.lastValue > 500 ? 0 : 800;
          await prisma.sensorReading.create({
            data: { sensorId: lightSensor.id, value: nextValue }
          });
          await prisma.sensor.update({
            where: { id: lightSensor.id },
            data: { lastValue: nextValue, lastUpdated: new Date() }
          });
        }
        break;
      }
      case 'adjust_climate': {
        if (data?.temperature !== undefined) {
          await prisma.sensorReading.createMany({
            data: [
              {
                sensorId: 'sensor_temp',
                value: data.temperature
              }
            ]
          });
          await prisma.sensor.updateMany({
            where: { id: 'sensor_temp' },
            data: { lastValue: data.temperature, lastUpdated: new Date() }
          });
        }
        if (data?.humidity !== undefined) {
          await prisma.sensorReading.create({
            data: { sensorId: 'sensor_humidity', value: data.humidity }
          });
          await prisma.sensor.update({
            where: { id: 'sensor_humidity' },
            data: { lastValue: data.humidity, lastUpdated: new Date() }
          });
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const [rooms, automationSetting] = await Promise.all([
      prisma.room.findMany(),
      prisma.automationSetting.findFirst()
    ]);
    const automation = automationSetting?.config || {};
    const { env } = await buildEnvironmentSnapshot();

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`,
      data: {
        sensors: env,
        rooms,
        automation
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Action failed' },
      { status: 400 }
    );
  }
}
