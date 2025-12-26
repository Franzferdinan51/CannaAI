// Sensor API integration service for CannaAI Pro
import {
  SensorConfig,
  SensorData,
  SensorAnalytics,
  RoomConfig,
  SensorAlert,
  SensorMaintenance,
  SystemHealth,
  NotificationData,
  SensorExport
} from './types';

// API Configuration
const API_BASE_URL = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? window.location.origin
  : 'http://localhost:3000';

const API_ENDPOINTS = {
  // Sensor CRUD
  SENSORS: '/api/sensors',
  SENSOR: (id: string) => `/api/sensors/${id}`,
  SENSOR_DATA: (id: string) => `/api/sensors/${id}/data`,
  SENSOR_ANALYTICS: (id: string) => `/api/sensors/${id}/analytics`,
  SENSOR_CALIBRATE: (id: string) => `/api/sensors/${id}/calibrate`,
  SENSOR_TEST: (id: string) => `/api/sensors/${id}/test`,

  // Room Management
  ROOMS: '/api/rooms',
  ROOM: (id: string) => `/api/rooms/${id}`,
  ROOM_SENSORS: (id: string) => `/api/rooms/${id}/sensors`,

  // Data and Analytics
  DATA_LATEST: '/api/sensors/data/latest',
  DATA_HISTORY: '/api/sensors/data/history',
  DATA_EXPORT: '/api/sensors/data/export',
  ANALYTICS: '/api/analytics',

  // Alerts and Notifications
  ALERTS: '/api/alerts',
  ALERT: (id: string) => `/api/alerts/${id}`,
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATION_ACK: (id: string) => `/api/notifications/${id}/acknowledge`,

  // Automation
  AUTOMATION: '/api/automation',
  AUTOMATION_ACTION: '/api/automation/action',

  // System
  HEALTH: '/api/health',
  STATUS: '/api/status'
} as const;


// Error handling
class SensorAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SensorAPIError';
  }
}

// Request wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new SensorAPIError(
        errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData?.code,
        errorData?.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SensorAPIError) throw error;
    if (error instanceof TypeError) throw new SensorAPIError('Network error. Please check your connection.', 0, 'NETWORK_ERROR');
    throw new SensorAPIError('An unexpected error occurred.', 0, 'UNKNOWN_ERROR', error);
  }
}

// Sensor API Methods
export const sensorAPI = {
  // Get all sensors
  async getSensors(): Promise<SensorConfig[]> {
    return apiRequest<SensorConfig[]>(API_ENDPOINTS.SENSORS);
  },

  // Get sensor by ID
  async getSensor(id: string): Promise<SensorConfig> {
    return apiRequest<SensorConfig>(API_ENDPOINTS.SENSOR(id));
  },

  // Create new sensor
  async createSensor(sensor: Omit<SensorConfig, 'id'>): Promise<SensorConfig> {
    return apiRequest<SensorConfig>(API_ENDPOINTS.SENSORS, {
      method: 'POST',
      body: JSON.stringify(sensor),
    });
  },

  // Update sensor
  async updateSensor(id: string, updates: Partial<SensorConfig>): Promise<SensorConfig> {
    return apiRequest<SensorConfig>(API_ENDPOINTS.SENSOR(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete sensor
  async deleteSensor(id: string): Promise<void> {
    return apiRequest<void>(API_ENDPOINTS.SENSOR(id), {
      method: 'DELETE',
    });
  },

  // Get sensor data
  async getSensorData(
    id: string,
    options: {
      timeframe?: '1h' | '6h' | '24h' | '7d' | '30d';
      resolution?: 'raw' | '1m' | '5m' | '15m' | '1h';
    } = {}
  ): Promise<SensorData[]> {
    const params = new URLSearchParams();
    if (options.timeframe) params.append('timeframe', options.timeframe);
    if (options.resolution) params.append('resolution', options.resolution);

    return apiRequest<SensorData[]>(`${API_ENDPOINTS.SENSOR_DATA(id)}?${params}`);
  },

  // Get sensor analytics
  async getSensorAnalytics(
    id: string,
    timeframe: '1h' | '6h' | '24h' | '7d' | '30d' | '90d'
  ): Promise<SensorAnalytics> {
    return apiRequest<SensorAnalytics>(API_ENDPOINTS.SENSOR_ANALYTICS(id), {
      method: 'POST',
      body: JSON.stringify({ timeframe }),
    });
  },

  // Calibrate sensor
  async calibrateSensor(
    id: string,
    calibration: {
      offset: number;
      slope: number;
      calibrationPoints: Array<{
        expectedValue: number;
        actualValue: number;
      }>;
    }
  ): Promise<void> {
    return apiRequest<void>(API_ENDPOINTS.SENSOR_CALIBRATE(id), {
      method: 'POST',
      body: JSON.stringify(calibration),
    });
  },

  // Test sensor
  async testSensor(id: string): Promise<{
    status: 'success' | 'error';
    responseTime: number;
    accuracy?: number;
    lastReading?: {
      value: number;
      timestamp: string;
      quality: 'good' | 'fair' | 'poor';
    };
    message?: string;
  }> {
    return apiRequest<any>(API_ENDPOINTS.SENSOR_TEST(id), {
      method: 'POST',
    });
  },
};

// Room API Methods
export const roomAPI = {
  // Get all rooms
  async getRooms(): Promise<RoomConfig[]> {
    return apiRequest<RoomConfig[]>(API_ENDPOINTS.ROOMS);
  },

  // Get room by ID
  async getRoom(id: string): Promise<RoomConfig> {
    return apiRequest<RoomConfig>(API_ENDPOINTS.ROOM(id));
  },

  // Create new room
  async createRoom(room: Omit<RoomConfig, 'id'>): Promise<RoomConfig> {
    return apiRequest<RoomConfig>(API_ENDPOINTS.ROOMS, {
      method: 'POST',
      body: JSON.stringify(room),
    });
  },

  // Update room
  async updateRoom(id: string, updates: Partial<RoomConfig>): Promise<RoomConfig> {
    return apiRequest<RoomConfig>(API_ENDPOINTS.ROOM(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete room
  async deleteRoom(id: string): Promise<void> {
    return apiRequest<void>(API_ENDPOINTS.ROOM(id), {
      method: 'DELETE',
    });
  },

  // Get room sensors
  async getRoomSensors(id: string): Promise<SensorConfig[]> {
    return apiRequest<SensorConfig[]>(API_ENDPOINTS.ROOM_SENSORS(id));
  },
};

// Data API Methods
export const dataAPI = {
  // Get latest sensor data
  async getLatestData(): Promise<Record<string, SensorData>> {
    return apiRequest<Record<string, SensorData>>(API_ENDPOINTS.DATA_LATEST);
  },

  // Get historical data
  async getHistoricalData(params: {
    sensors?: string[];
    timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
    resolution?: 'raw' | '1m' | '5m' | '15m' | '1h';
    roomId?: string;
  }): Promise<{
    data: Array<{
      timestamp: string;
      [sensorId: string]: number;
    }>;
    metadata: {
      sensors: string[];
      timeframe: string;
      resolution: string;
      totalPoints: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('timeframe', params.timeframe);
    if (params.sensors?.length) {
      searchParams.append('sensors', params.sensors.join(','));
    }
    if (params.resolution) {
      searchParams.append('resolution', params.resolution);
    }
    if (params.roomId) {
      searchParams.append('roomId', params.roomId);
    }

    return apiRequest<any>(`${API_ENDPOINTS.DATA_HISTORY}?${searchParams}`);
  },

  // Export data
  async exportData(exportConfig: SensorExport): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.DATA_EXPORT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exportConfig),
    });

    if (!response.ok) {
      throw new SensorAPIError(`Export failed: ${response.statusText}`, response.status);
    }

    return response.blob();
  },
};

// Alerts API Methods
export const alertAPI = {
  // Get all alerts
  async getAlerts(params?: {
    sensorId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    acknowledged?: boolean;
    limit?: number;
  }): Promise<SensorAlert[]> {
    const searchParams = new URLSearchParams();
    if (params?.sensorId) searchParams.append('sensorId', params.sensorId);
    if (params?.severity) searchParams.append('severity', params.severity);
    if (params?.acknowledged !== undefined) {
      searchParams.append('acknowledged', params.acknowledged.toString());
    }
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${API_ENDPOINTS.ALERTS}?${searchParams}`
      : API_ENDPOINTS.ALERTS;

    return apiRequest<SensorAlert[]>(url);
  },

  // Create alert
  async createAlert(alert: Omit<SensorAlert, 'id'>): Promise<SensorAlert> {
    return apiRequest<SensorAlert>(API_ENDPOINTS.ALERTS, {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  },

  // Update alert
  async updateAlert(id: string, updates: Partial<SensorAlert>): Promise<SensorAlert> {
    return apiRequest<SensorAlert>(API_ENDPOINTS.ALERT(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete alert
  async deleteAlert(id: string): Promise<void> {
    return apiRequest<void>(API_ENDPOINTS.ALERT(id), {
      method: 'DELETE',
    });
  },

  // Get notifications
  async getNotifications(params?: {
    type?: 'warning' | 'error' | 'success' | 'info';
    acknowledged?: boolean;
    limit?: number;
  }): Promise<NotificationData[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.acknowledged !== undefined) {
      searchParams.append('acknowledged', params.acknowledged.toString());
    }
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = searchParams.toString()
      ? `${API_ENDPOINTS.NOTIFICATIONS}?${searchParams}`
      : API_ENDPOINTS.NOTIFICATIONS;

    return apiRequest<NotificationData[]>(url);
  },

  // Acknowledge notification
  async acknowledgeNotification(id: string): Promise<void> {
    return apiRequest<void>(API_ENDPOINTS.NOTIFICATION_ACK(id), {
      method: 'POST',
    });
  },
};

// Automation API Methods
export const automationAPI = {
  // Get automation settings
  async getAutomationSettings(): Promise<any> {
    return apiRequest<any>(API_ENDPOINTS.AUTOMATION);
  },

  // Update automation settings
  async updateAutomationSettings(settings: any): Promise<any> {
    return apiRequest<any>(API_ENDPOINTS.AUTOMATION, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Execute automation action
  async executeAction(action: {
    type: 'watering' | 'lighting' | 'climate' | 'co2';
    action: string;
    roomId?: string;
    sensorId?: string;
    parameters?: Record<string, any>;
  }): Promise<{
    success: boolean;
    message: string;
    result?: any;
  }> {
    return apiRequest<any>(API_ENDPOINTS.AUTOMATION_ACTION, {
      method: 'POST',
      body: JSON.stringify(action),
    });
  },
};

// System API Methods
export const systemAPI = {
  // Get system health
  async getSystemHealth(): Promise<SystemHealth> {
    return apiRequest<SystemHealth>(API_ENDPOINTS.HEALTH);
  },

  // Get system status
  async getSystemStatus(): Promise<{
    server: {
      status: 'online' | 'offline' | 'maintenance';
      uptime: number;
      version: string;
      environment: string;
    };
    database: {
      status: 'connected' | 'disconnected';
      size: string;
      lastBackup?: string;
    };
    websocket: {
      status: 'connected' | 'disconnected';
      connectedClients: number;
    };
    sensors: {
      total: number;
      online: number;
      offline: number;
      lastUpdate: string;
    };
  }> {
    return apiRequest<any>(API_ENDPOINTS.STATUS);
  },
};

// Utility functions
export const sensorUtils = {
  // Validate sensor data
  validateSensorData(data: Partial<SensorData>): string[] {
    const errors: string[] = [];

    if (data.temperature !== undefined) {
      if (data.temperature < -50 || data.temperature > 150) {
        errors.push('Temperature out of realistic range');
      }
    }

    if (data.humidity !== undefined) {
      if (data.humidity < 0 || data.humidity > 100) {
        errors.push('Humidity must be between 0 and 100');
      }
    }

    if (data.ph !== undefined) {
      if (data.ph < 0 || data.ph > 14) {
        errors.push('pH must be between 0 and 14');
      }
    }

    if (data.ec !== undefined) {
      if (data.ec < 0 || data.ec > 10) {
        errors.push('EC must be between 0 and 10 mS/cm');
      }
    }

    if (data.co2 !== undefined) {
      if (data.co2 < 0 || data.co2 > 5000) {
        errors.push('CO2 must be between 0 and 5000 ppm');
      }
    }

    return errors;
  },

  // Calculate data quality score
  calculateDataQuality(dataPoints: Array<{ value: number; quality: 'good' | 'fair' | 'poor' }>): number {
    if (dataPoints.length === 0) return 0;

    const goodPoints = dataPoints.filter(d => d.quality === 'good').length;
    const fairPoints = dataPoints.filter(d => d.quality === 'fair').length;
    const poorPoints = dataPoints.filter(d => d.quality === 'poor').length;

    const score = ((goodPoints * 100 + fairPoints * 50 + poorPoints * 0) / dataPoints.length);
    return Math.round(score);
  },

  // Detect anomalies in sensor data
  detectAnomalies(dataPoints: Array<{ timestamp: string; value: number }>): Array<{
    timestamp: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
    reason: string;
  }> {
    const anomalies: Array<{
      timestamp: string;
      value: number;
      severity: 'low' | 'medium' | 'high';
      reason: string;
    }> = [];

    if (dataPoints.length < 10) return anomalies;

    const values = dataPoints.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const standardDeviation = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );

    dataPoints.forEach((point, index) => {
      const zScore = Math.abs((point.value - mean) / standardDeviation);

      if (zScore > 3) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          severity: 'high',
          reason: `Value is ${zScore.toFixed(1)} standard deviations from mean`
        });
      } else if (zScore > 2) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          severity: 'medium',
          reason: `Value is ${zScore.toFixed(1)} standard deviations from mean`
        });
      } else if (zScore > 1.5) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          severity: 'low',
          reason: `Value is ${zScore.toFixed(1)} standard deviations from mean`
        });
      }
    });

    return anomalies;
  },

  // Format sensor value for display
  formatSensorValue(value: number, sensorType: string): string {
    switch (sensorType) {
      case 'temperature':
        return `${Math.round(value)}°F`;
      case 'humidity':
        return `${Math.round(value)}%`;
      case 'ph':
        return value.toFixed(2);
      case 'ec':
        return value.toFixed(2);
      case 'co2':
        return `${Math.round(value)} ppm`;
      case 'vpd':
        return value.toFixed(2);
      case 'soil_moisture':
        return `${Math.round(value)}%`;
      case 'light_intensity':
        return `${Math.round(value)} PPFD`;
      case 'dli':
        return `${value.toFixed(1)} mol/m²`;
      case 'oxygen':
        return `${value.toFixed(1)} mg/L`;
      case 'pressure':
        return `${Math.round(value)} hPa`;
      default:
        return value.toString();
    }
  },
};

// Export default API object
export default {
  sensors: sensorAPI,
  rooms: roomAPI,
  data: dataAPI,
  alerts: alertAPI,
  automation: automationAPI,
  system: systemAPI,
  utils: sensorUtils,
};
