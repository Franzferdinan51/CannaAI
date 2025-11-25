import { prisma } from './prisma';

export async function ensureSeedData() {
  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    await prisma.room.createMany({
      data: [
        { id: 'room_1', name: 'Main Flower Room', temp: 22, humidity: 55, co2: 1200, active: true },
        { id: 'room_2', name: 'Veg Room', temp: 24, humidity: 65, co2: 1000, active: false }
      ]
    });
  }

  const sensorCount = await prisma.sensor.count();
  if (sensorCount === 0) {
    await prisma.sensor.createMany({
      data: [
        { id: 'sensor_temp', name: 'Canopy Temp', type: 'temperature', locationId: 'room_1', enabled: true },
        { id: 'sensor_humidity', name: 'Humidity', type: 'humidity', locationId: 'room_1', enabled: true },
        { id: 'sensor_soil', name: 'Soil Moisture', type: 'soil_moisture', locationId: 'room_1', enabled: true },
        { id: 'sensor_light', name: 'Light Intensity', type: 'light_intensity', locationId: 'room_1', enabled: true },
        { id: 'sensor_ph', name: 'pH', type: 'ph', locationId: 'room_1', enabled: true },
        { id: 'sensor_ec', name: 'EC', type: 'ec', locationId: 'room_1', enabled: true }
      ]
    });
  }

  const readingCount = await prisma.sensorReading.count();
  if (readingCount === 0) {
    const defaults: Record<string, number> = {
      sensor_temp: 72,
      sensor_humidity: 55,
      sensor_soil: 45,
      sensor_light: 750,
      sensor_ph: 6.2,
      sensor_ec: 1.4
    };
    for (const [sensorId, value] of Object.entries(defaults)) {
      await prisma.sensorReading.create({
        data: { sensorId, value }
      });
      await prisma.sensor.updateMany({
        where: { id: sensorId },
        data: { lastValue: value, lastUpdated: new Date() }
      });
    }
  }

  const strainCount = await prisma.strain.count();
  if (strainCount === 0) {
    await prisma.strain.create({
      data: {
        id: 'strain_1',
        name: 'Blue Dream',
        type: 'Hybrid',
        lineage: 'Blueberry x Haze',
        description: 'Balanced hybrid known for resilience',
        isPurpleStrain: false,
        optimalConditions: {
          ph: { range: [6.0, 6.5], medium: 'soil' },
          temperature: { veg: [22, 26], flower: [20, 24] },
          humidity: { veg: [60, 70], flower: [40, 50] },
          light: { veg: '18/6', flower: '12/12' }
        },
        commonDeficiencies: ['Magnesium'],
        characteristics: {
          growthPattern: 'vigorous',
          plantSize: 'large',
          floweringTime: 65,
          yield: 'high',
          resistance: { mold: 'medium', pests: 'high', disease: 'medium' },
          climate: ['temperate']
        },
        growingDifficulty: 'medium',
        floweringTime: 65,
        thcLevel: 18,
        cbdLevel: 1,
        effects: ['uplifting'],
        medicalUses: ['stress'],
        flavors: ['berry'],
        aroma: ['sweet']
      }
    });
  }

  const plantCount = await prisma.plant.count();
  if (plantCount === 0) {
    await prisma.plant.create({
      data: {
        id: 'plant_1',
        name: 'BD-01',
        strainId: 'strain_1',
        stage: 'flowering',
        health: {
          score: 88,
          status: 'healthy',
          issues: [],
          recommendations: ['Maintain VPD between 0.8-1.1'],
          warnings: [],
          history: []
        },
        age: 45,
        plantedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        locationId: 'room_1',
        images: [],
        notes: 'Looks healthy',
        tags: ['top-plant'],
        metadata: { source: 'seed', isMotherPlant: false }
      }
    });
  }

  const automation = await prisma.automationSetting.findFirst();
  if (!automation) {
    await prisma.automationSetting.create({
      data: {
        id: 1,
        config: {
          watering: { enabled: true, threshold: 30, schedule: '0 6,18 * * *' },
          lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *' },
          climate: { enabled: true, tempMin: 64, tempMax: 79, humidityMin: 40, humidityMax: 70 }
        }
      }
    });
  }
}
