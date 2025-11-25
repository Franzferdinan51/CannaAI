// Automation system type definitions

import { SensorData, RoomConfig, WateringConfig, LightingConfig, ClimateConfig } from '../sensors/types';

export interface AutomationStatus {
  watering: {
    active: boolean;
    lastRun: string;
    nextRun: string;
    status: 'idle' | 'running' | 'paused' | 'error' | 'maintenance';
    progress?: number;
    currentZone?: string;
  };
  lighting: {
    active: boolean;
    schedule: string;
    status: 'running' | 'off' | 'sunrise' | 'sunset' | 'error';
    currentIntensity: number;
    scheduleType: 'vegetative' | 'flowering' | 'custom';
    nextTransition?: string;
  };
  climate: {
    active: boolean;
    status: 'maintaining' | 'heating' | 'cooling' | 'ventilating' | 'idle' | 'error';
    currentMode: 'auto' | 'manual' | 'off';
    targetTemp?: number;
    targetHumidity?: number;
  };
  co2: {
    active: boolean;
    status: 'injecting' | 'idle' | 'maintaining' | 'error';
    currentLevel: number;
    targetLevel: number;
    injectionRate: number;
  };
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  system: 'watering' | 'lighting' | 'climate' | 'co2' | 'safety' | 'manual';
  action: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details: string;
  duration?: number;
  triggeredBy: 'schedule' | 'sensor' | 'manual' | 'safety' | 'system';
  roomId?: string;
  zoneId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  system: 'watering' | 'lighting' | 'climate' | 'co2' | 'general';
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  priority: number;
  cooldownMinutes: number;
  maxExecutionsPerDay?: number;
  created: string;
  modified: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface AutomationTrigger {
  type: 'schedule' | 'sensor' | 'manual' | 'event';
  config: {
    schedule?: string; // Cron expression
    sensorId?: string;
    sensorType?: string;
    threshold?: number;
    operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    eventType?: string;
    source?: string;
  };
}

export interface AutomationCondition {
  sensorId: string;
  sensorType: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'outside';
  value: number | [number, number];
  duration?: number; // Minutes condition must be met
  logicalOperator?: 'and' | 'or';
}

export interface AutomationAction {
  type: 'water' | 'light' | 'climate' | 'co2' | 'notification' | 'webhook' | 'valve' | 'pump' | 'fan' | 'heater' | 'cooler';
  config: {
    deviceId?: string;
    zoneId?: string;
    value?: number;
    duration?: number;
    intensity?: number;
    target?: number;
    message?: string;
    url?: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    body?: any;
  };
  delay?: number; // Seconds
  timeout?: number; // Seconds
}

export interface ManualOverrideRequest {
  id: string;
  timestamp: string;
  system: 'watering' | 'lighting' | 'climate' | 'co2' | 'all';
  action: string;
  requestedBy: string;
  reason?: string;
  duration?: number; // Minutes for temporary override
  permanent?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string;
  completedAt?: string;
}

export interface SafetyAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'temperature' | 'humidity' | 'water' | 'electrical' | 'co2' | 'security' | 'system';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  actions: SafetyAction[];
  metadata?: Record<string, any>;
}

export interface SafetyAction {
  id: string;
  label: string;
  action: 'acknowledge' | 'resolve' | 'override' | 'shutdown' | 'emergency' | 'investigate';
  system?: string;
  requiresAuth: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface AutomationSchedule {
  id: string;
  name: string;
  system: 'watering' | 'lighting' | 'climate' | 'co2' | 'general';
  enabled: boolean;
  schedule: string; // Cron expression
  timezone: string;
  roomId?: string;
  zoneId?: string;
  actions: AutomationAction[];
  startDate?: string;
  endDate?: string;
  nextRun?: string;
  lastRun?: string;
  priority: number;
  created: string;
  modified: string;
}

export interface IrrigationZoneStatus {
  id: string;
  name: string;
  status: 'idle' | 'watering' | 'paused' | 'error' | 'maintenance';
  moistureLevel: number;
  lastWatered: string;
  nextWatering: string;
  waterUsage: number; // Gallons/liters
  flowRate: number; // GPM/LPM
  valveOpen: boolean;
  pumpActive: boolean;
  pressure: number; // PSI
  temperature: number; // Water temperature
  ph?: number;
  ec?: number;
}

export interface LightingZoneStatus {
  id: string;
  name: string;
  status: 'on' | 'off' | 'dimming' | 'error' | 'sunrise' | 'sunset';
  intensity: number; // Percentage
  spectrum?: string;
  colorTemp?: number; // Kelvin
  powerConsumption: number; // Watts
  hoursOn: number; // Today
  totalHours: number; // Lifetime
  lastOn: string;
  lastOff: string;
  nextTransition: string;
  dimmable: boolean;
  spectrumControl: boolean;
}

export interface ClimateZoneStatus {
  id: string;
  name: string;
  mode: 'auto' | 'heat' | 'cool' | 'vent' | 'dehumidify' | 'off';
  currentTemp: number;
  targetTemp: number;
  currentHumidity: number;
  targetHumidity: number;
  heatingActive: boolean;
  coolingActive: boolean;
  ventilationActive: boolean;
  dehumidificationActive: boolean;
  circulationActive: boolean;
  vpd: number;
  co2Level: number;
  airFlowRate?: number; // CFM
  filterStatus?: 'good' | 'replace' | 'dirty';
  maintenanceDue?: string;
}

export interface CO2SystemStatus {
  id: string;
  name: string;
  status: 'idle' | 'injecting' | 'purging' | 'error' | 'maintenance';
  currentLevel: number;
  targetLevel: number;
  tankLevel?: number; // Percentage
  flowRate: number;
  pressure: number; // PSI
  injectionActive: boolean;
  lastInjection: string;
  totalInjected: number; // Today
  tankSize?: number; // Pounds/kg
  estimatedRuntime: number; // Hours remaining
  maintenanceDue?: string;
  sensorCalibrated: boolean;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number; // Seconds
  cpuUsage: number; // Percentage
  memoryUsage: number; // Percentage
  diskUsage: number; // Percentage
  networkLatency: number; // Milliseconds
  apiResponseTime: number; // Milliseconds
  errorRate: number; // Percentage
  activeConnections: number;
  queuedJobs: number;
  processedJobs: number;
  failedJobs: number;
}

export interface AutomationSettings {
  global: {
    enabled: boolean;
    masterSwitch: boolean;
    safetyMode: boolean;
    maintenanceMode: boolean;
    timezone: string;
    logRetention: number; // Days
    enableNotifications: boolean;
    enableAlerts: boolean;
    emergencyShutdown: boolean;
  };
  watering: {
    defaultDuration: number; // Minutes
    maxDailyWatering: number; // Minutes
    moistureThreshold: number; // Percentage
    flowRateLimit: number; // GPM
    pressureMin: number; // PSI
    pressureMax: number; // PSI
    phRange: [number, number];
    ecRange: [number, number];
  };
  lighting: {
    defaultIntensity: number; // Percentage
    sunriseDuration: number; // Minutes
    sunsetDuration: number; // Minutes
    maxDailyHours: number;
    dimmable: boolean;
    spectrumControl: boolean;
    powerLimit: number; // Watts
  };
  climate: {
    tempTolerance: number; // Degrees
    humidityTolerance: number; // Percentage
    vpdTolerance: number; // kPa
    co2Tolerance: number; // ppm
    minCirculationTime: number; // Minutes per hour
    filterReplacementInterval: number; // Days
  };
  safety: {
    maxTemp: number; // Fahrenheit
    minTemp: number; // Fahrenheit
    maxHumidity: number; // Percentage
    minHumidity: number; // Percentage
    maxCo2: number; // ppm
    leakDetection: boolean;
    smokeDetection: boolean;
    powerOutageResponse: 'shutdown' | 'suspend' | 'continue';
  };
}

export interface AutomationApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
}