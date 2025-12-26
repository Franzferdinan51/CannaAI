// Comprehensive sensor system type definitions for CannaAI Pro

export interface SensorData {
  // Environmental sensors
  temperature: number; // Fahrenheit
  humidity: number; // Percentage
  vpd: number; // Vapor Pressure Deficit in kPa
  co2: number; // ppm

  // Soil/Root zone sensors
  ph: number; // pH level (0-14)
  ec: number; // Electrical Conductivity in mS/cm
  soilMoisture: number; // Percentage

  // Light sensors
  lightIntensity: number; // PPFD or Lux
  dlI: number; // Daily Light Integral (mol/m²/day)

  // Additional sensors
  oxygen: number; // Dissolved O2 in mg/L (for hydroponics)
  pressure: number; // Atmospheric pressure in hPa

  // Metadata
  roomName: string;
  sensorId?: string;
  location?: string;
  lastUpdated: string;
  quality: 'good' | 'fair' | 'poor';
}

export interface SensorConfig {
  id: string;
  name: string;
  type: SensorType;
  location: string;
  roomName: string;
  enabled: boolean;
  calibration?: SensorCalibration;
  alerts: SensorAlert[];
  dataHistory: SensorDataPoint[];
  batteryLevel?: number; // For wireless sensors
  signalStrength?: number; // For wireless sensors
  lastMaintenance?: string;
  nextMaintenanceDue?: string;
  firmwareVersion?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
}

export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'ph'
  | 'ec'
  | 'co2'
  | 'vpd'
  | 'soil_moisture'
  | 'light_intensity'
  | 'dli'
  | 'oxygen'
  | 'pressure'
  | 'par'
  | 'lux';

export interface SensorCalibration {
  offset: number;
  slope: number;
  lastCalibrated: string;
  nextCalibrationDue: string;
  calibrationPoints: CalibrationPoint[];
  notes?: string;
}

export interface CalibrationPoint {
  expectedValue: number;
  actualValue: number;
  timestamp: string;
}

export interface SensorAlert {
  id: string;
  type: AlertType;
  condition: AlertCondition;
  enabled: boolean;
  severity: AlertSeverity;
  message: string;
  actions: AlertAction[];
  cooldownMinutes: number;
  lastTriggered?: string;
}

export type AlertType =
  | 'threshold'
  | 'range'
  | 'rate_of_change'
  | 'offline'
  | 'battery_low'
  | 'calibration_due';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'outside';
  value: number | [number, number];
  rateOfChange?: number; // For rate-of-change alerts
  duration?: number; // Minutes
}

export interface AlertAction {
  type: 'notification' | 'email' | 'sms' | 'automation' | 'webhook';
  config: Record<string, any>;
}

export interface SensorDataPoint {
  timestamp: string;
  value: number;
  quality: 'good' | 'fair' | 'poor';
  source: 'sensor' | 'calculated' | 'manual';
}

export interface RoomConfig {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  targetEnvironment: {
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    co2: { min: number; max: number };
    vpd: { min: number; max: number };
    ph: { min: number; max: number };
    ec: { min: number; max: number };
  };
  sensors: string[]; // Sensor IDs
  automation: {
    watering: WateringConfig;
    lighting: LightingConfig;
    climate: ClimateConfig;
    co2: CO2Config;
  };
  area?: number; // Square feet/meters
  height?: number; // Height in feet/meters
  plantCount?: number;
  growthStage: 'propagation' | 'vegetative' | 'flowering' | 'drying' | 'curing';
}

export interface WateringConfig {
  enabled: boolean;
  threshold: number; // Soil moisture percentage
  schedule: string; // Cron expression
  duration: number; // Minutes
  zones: IrrigationZone[];
}

export interface IrrigationZone {
  id: string;
  name: string;
  plants: number;
  lastWatered?: string;
  nextWatering?: string;
}

export interface LightingConfig {
  enabled: boolean;
  vegSchedule: string; // Cron expression
  flowerSchedule: string; // Cron expression
  intensity: number; // Percentage
  spectrum?: string;
  sunriseDuration?: number; // Minutes
  sunsetDuration?: number; // Minutes
}

export interface ClimateConfig {
  enabled: boolean;
  tempMin: number; // Fahrenheit
  tempMax: number; // Fahrenheit
  humidityMin: number;
  humidityMax: number;
  circulation: boolean;
  ventilation: boolean;
  heating: boolean;
  cooling: boolean;
}

export interface CO2Config {
  enabled: boolean;
  target: number; // ppm
  tolerance: number; // +/- ppm
  schedule: string; // Cron expression
  injectionRate?: number; // kg/h
}

export interface SensorAnalytics {
  sensorId: string;
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d' | '90d';
  data: AnalyticsDataPoint[];
  statistics: {
    min: number;
    max: number;
    avg: number;
    current: number;
    trend: 'rising' | 'falling' | 'stable';
    trendPercentage: number;
  };
  alerts: number;
  dataQuality: number; // Percentage
}

export interface AnalyticsDataPoint {
  timestamp: string;
  value: number;
  quality: 'good' | 'fair' | 'poor';
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  sensors: {
    total: number;
    online: number;
    offline: number;
    calibrationDue: number;
  };
  connectivity: {
    socket: boolean;
    database: boolean;
    externalApis: Record<string, boolean>;
  };
  lastUpdate: string;
}

export interface NotificationData {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  sensorId?: string;
  roomName?: string;
  acknowledged: boolean;
  data?: any;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface SensorMaintenance {
  id: string;
  sensorId: string;
  type: 'calibration' | 'cleaning' | 'replacement' | 'inspection';
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  notes?: string;
  technician?: string;
  cost?: number;
}

export interface SensorExport {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  sensors: string[];
  dateRange: {
    start: string;
    end: string;
  };
  includeAnalytics: boolean;
  includeAlerts: boolean;
  resolution: 'raw' | '1min' | '5min' | '15min' | '1hour' | '1day';
}