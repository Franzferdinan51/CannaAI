import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'db');
const DATA_FILE = path.join(DATA_DIR, 'app-data.json');

type Room = { id: string; name: string; temp: number; humidity: number; co2: number; active: boolean };
type Sensor = { id: string; name: string; type: string; location: string; roomName: string; enabled: boolean; alerts: any[]; dataHistory: any[] };
type SensorSnapshot = {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightIntensity: number;
  ph: number;
  ec: number;
  co2: number;
  vpd: number;
  dli: number;
  oxygen: number;
  pressure: number;
  lastUpdated: string;
};
type AutomationConfig = {
  watering: { enabled: boolean; threshold: number; schedule: string };
  lighting: { enabled: boolean; vegSchedule: string; flowerSchedule: string };
  climate: { enabled: boolean; tempMin: number; tempMax: number; humidityMin: number; humidityMax: number };
};

type Alert = { id: string; sensorId: string; type: string; severity: string; message: string; createdAt: string; acknowledged?: boolean };
type Notification = { id: string; type: string; title?: string; message: string; createdAt: string; acknowledged?: boolean; acknowledgedAt?: string };

type Plant = {
  id: string;
  name: string;
  strainId: string;
  stage: string;
  health: { score: number; status: string; issues: any[]; recommendations: string[]; warnings: any[]; history: any[] };
  age: number;
  plantedDate: string;
  location: { id: string; name: string; type: string; room?: string; environment?: any };
  images: any[];
  notes: string;
  tags: string[];
  isActive: boolean;
  metadata: any;
  createdAt: string;
  updatedAt: string;
};

type Strain = {
  id: string;
  name: string;
  type: string;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: any;
  commonDeficiencies: string[];
  characteristics: any;
  images: any[];
  growingDifficulty: string;
  floweringTime: number;
  thcLevel?: number;
  cbdLevel?: number;
  effects?: string[];
  medicalUses?: string[];
  flavors?: string[];
  aroma?: string[];
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  plantIds: string[];
  schedule: any;
  status: string;
  assignedTo?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  materials?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

type Action = {
  id: string;
  plantId: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
};

type DataStore = {
  rooms: Room[];
  sensors: Sensor[];
  sensorSnapshot: SensorSnapshot;
  sensorReadings: Record<string, number>;
  automation: AutomationConfig;
  alerts: Alert[];
  notifications: Notification[];
  plants: Plant[];
  strains: Strain[];
  tasks: Task[];
  actions: Action[];
};

const defaultData: DataStore = {
  rooms: [
    { id: 'room_1', name: 'Main Flower Room', temp: 22, humidity: 55, co2: 1200, active: true },
    { id: 'room_2', name: 'Veg Room', temp: 24, humidity: 65, co2: 1000, active: false }
  ],
  sensors: [
    { id: 'sensor_temp', name: 'Canopy Temp', type: 'temperature', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] },
    { id: 'sensor_humidity', name: 'Humidity', type: 'humidity', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] },
    { id: 'sensor_soil', name: 'Soil Moisture', type: 'soil_moisture', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] },
    { id: 'sensor_light', name: 'Light Intensity', type: 'light_intensity', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] },
    { id: 'sensor_ph', name: 'pH', type: 'ph', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] },
    { id: 'sensor_ec', name: 'EC', type: 'ec', location: 'room_1', roomName: 'Main Flower Room', enabled: true, alerts: [], dataHistory: [] }
  ],
  sensorSnapshot: {
    temperature: 72,
    humidity: 55,
    soilMoisture: 45,
    lightIntensity: 750,
    ph: 6.2,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85,
    dli: 20,
    oxygen: 8,
    pressure: 1012,
    lastUpdated: new Date().toISOString()
  },
  sensorReadings: {
    sensor_temp: 72,
    sensor_humidity: 55,
    sensor_soil: 45,
    sensor_light: 750,
    sensor_ph: 6.2,
    sensor_ec: 1.4
  },
  automation: {
    watering: { enabled: true, threshold: 30, schedule: '0 6,18 * * *' },
    lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *' },
    climate: { enabled: true, tempMin: 64, tempMax: 79, humidityMin: 40, humidityMax: 70 }
  },
  alerts: [],
  notifications: [],
  plants: [
    {
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
      plantedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      location: { id: 'room_1', name: 'Main Flower Room', type: 'room', environment: {} },
      images: [],
      notes: 'Looks healthy',
      tags: ['top-plant'],
      isActive: true,
      metadata: { source: 'seed', isMotherPlant: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  strains: [
    {
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
      images: [],
      growingDifficulty: 'medium',
      floweringTime: 65,
      thcLevel: 18,
      cbdLevel: 1,
      effects: ['uplifting'],
      medicalUses: ['stress'],
      flavors: ['berry'],
      aroma: ['sweet'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  tasks: [],
  actions: []
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

async function readFile(): Promise<DataStore> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as DataStore;
}

async function writeFile(data: DataStore) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readData(): Promise<DataStore> {
  return readFile();
}

export async function writeData(mutator: (data: DataStore) => void | Promise<void>): Promise<DataStore> {
  const data = await readFile();
  await mutator(data);
  await writeFile(data);
  return data;
}

export function jitterSensorSnapshot(snapshot: SensorSnapshot): SensorSnapshot {
  const clone = { ...snapshot };
  clone.temperature = Math.round((clone.temperature + (Math.random() - 0.5) * 0.5));
  clone.humidity = Math.min(100, Math.max(0, Math.round(clone.humidity + (Math.random() - 0.5) * 2)));
  clone.soilMoisture = Math.min(100, Math.max(0, Math.round(clone.soilMoisture + (Math.random() - 0.5) * 3)));
  clone.lightIntensity = Math.min(1000, Math.max(0, Math.round(clone.lightIntensity + (Math.random() - 0.5) * 50)));
  clone.ph = parseFloat((clone.ph + (Math.random() - 0.5) * 0.1).toFixed(1));
  clone.ec = parseFloat((clone.ec + (Math.random() - 0.5) * 0.05).toFixed(2));
  clone.co2 = Math.min(2000, Math.max(400, Math.round(clone.co2 + (Math.random() - 0.5) * 100)));
  clone.vpd = parseFloat((clone.vpd + (Math.random() - 0.5) * 0.05).toFixed(2));
  clone.lastUpdated = new Date().toISOString();
  return clone;
}
