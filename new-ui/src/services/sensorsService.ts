import { apiClient } from '@/lib/api/client';
import {
  SensorData,
  Room,
  AutomationSettings,
  SensorsResponse,
  SensorActionRequest,
  SensorActionResponse,
  ApiResponse
} from '@/types/api';

// =============================================================================
// Sensors Service
// =============================================================================

export class SensorsService {
  private readonly basePath = '/api/sensors';

  /**
   * Get current sensor data for all rooms
   */
  async getSensorData(): Promise<SensorsResponse> {
    try {
      const response = await apiClient.get<SensorsResponse>(this.basePath);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch sensor data');
      }

      return response;
    } catch (error) {
      console.error('Failed to fetch sensor data:', error);
      throw error;
    }
  }

  /**
   * Execute sensor automation actions
   */
  async executeAction(actionRequest: SensorActionRequest): Promise<SensorActionResponse> {
    try {
      const response = await apiClient.post<SensorActionResponse>(
        this.basePath,
        actionRequest,
        {
          timeout: 10000, // 10 seconds timeout for automation actions
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to execute automation action');
      }

      return response;
    } catch (error) {
      console.error('Failed to execute sensor action:', error);
      throw error;
    }
  }

  // =============================================================================
  // Room Management
  // =============================================================================

  /**
   * Get all rooms
   */
  async getRooms(): Promise<Room[]> {
    try {
      const sensorData = await this.getSensorData();
      return sensorData.rooms || [];
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      throw error;
    }
  }

  /**
   * Get specific room by ID
   */
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      const rooms = await this.getRooms();
      return rooms.find(room => room.id === roomId) || null;
    } catch (error) {
      console.error(`Failed to fetch room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle room active state
   */
  async toggleRoom(roomId: string): Promise<SensorActionResponse> {
    const actionRequest: SensorActionRequest = {
      action: 'toggle_room',
      data: { roomId }
    };

    return this.executeAction(actionRequest);
  }

  /**
   * Add new room (mock implementation)
   */
  async addRoom(roomData: Omit<Room, 'id'>): Promise<Room> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock room
      const newRoom: Room = {
        id: `room_${Date.now()}`,
        ...roomData
      };

      return newRoom;
    } catch (error) {
      console.error('Failed to add room:', error);
      throw error;
    }
  }

  /**
   * Update room settings
   */
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock updated room
      const currentRoom = await this.getRoom(roomId);
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`);
      }

      const updatedRoom: Room = {
        ...currentRoom,
        ...updates
      };

      return updatedRoom;
    } catch (error) {
      console.error(`Failed to update room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      // This would need to be implemented on the backend
      // For now, return true
      console.log(`Room ${roomId} would be deleted`);
      return true;
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // Automation Management
  // =============================================================================

  /**
   * Get automation settings
   */
  async getAutomationSettings(): Promise<AutomationSettings> {
    try {
      const sensorData = await this.getSensorData();
      return sensorData.automation;
    } catch (error) {
      console.error('Failed to fetch automation settings:', error);
      throw error;
    }
  }

  /**
   * Update automation settings
   */
  async updateAutomationSettings(settings: Partial<AutomationSettings>): Promise<AutomationSettings> {
    const actionRequest: SensorActionRequest = {
      action: 'update_automation',
      data: settings
    };

    const response = await this.executeAction(actionRequest);
    return response.data.automation;
  }

  /**
   * Toggle watering system
   */
  async toggleWatering(enabled: boolean): Promise<SensorActionResponse> {
    return this.updateAutomationSettings({
      watering: {
        ...(await this.getAutomationSettings()).watering,
        enabled
      }
    }).then(() => this.getSensorData()).then(data => ({
      success: true,
      message: `Watering ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        sensors: data.sensors,
        rooms: data.rooms,
        automation: data.automation
      }
    }));
  }

  /**
   * Toggle lighting system
   */
  async toggleLighting(enabled: boolean): Promise<SensorActionResponse> {
    return this.updateAutomationSettings({
      lighting: {
        ...(await this.getAutomationSettings()).lighting,
        enabled
      }
    }).then(() => this.getSensorData()).then(data => ({
      success: true,
      message: `Lighting ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        sensors: data.sensors,
        rooms: data.rooms,
        automation: data.automation
      }
    }));
  }

  /**
   * Toggle climate control
   */
  async toggleClimateControl(enabled: boolean): Promise<SensorActionResponse> {
    return this.updateAutomationSettings({
      climate: {
        ...(await this.getAutomationSettings()).climate,
        enabled
      }
    }).then(() => this.getSensorData()).then(data => ({
      success: true,
      message: `Climate control ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        sensors: data.sensors,
        rooms: data.rooms,
        automation: data.automation
      }
    }));
  }

  // =============================================================================
  // Manual Controls
  // =============================================================================

  /**
   * Trigger immediate watering
   */
  async waterNow(roomId?: string): Promise<SensorActionResponse> {
    const actionRequest: SensorActionRequest = {
      action: 'water_now',
      data: { roomId }
    };

    return this.executeAction(actionRequest);
  }

  /**
   * Toggle lights manually
   */
  async toggleLights(roomId?: string): Promise<SensorActionResponse> {
    const actionRequest: SensorActionRequest = {
      action: 'toggle_lights',
      data: { roomId }
    };

    return this.executeAction(actionRequest);
  }

  /**
   * Adjust climate manually
   */
  async adjustClimate(adjustments: {
    temperature?: number;
    humidity?: number;
    roomId?: string;
  }): Promise<SensorActionResponse> {
    const actionRequest: SensorActionRequest = {
      action: 'adjust_climate',
      data: adjustments
    };

    return this.executeAction(actionRequest);
  }

  // =============================================================================
  // Monitoring and Analytics
  // =============================================================================

  /**
   * Get sensor data history (mock implementation)
   */
  async getSensorHistory(
    sensorType: keyof SensorData,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    roomId?: string
  ): Promise<Array<{ timestamp: string; value: number; roomId?: string }>> {
    try {
      // This would need to be implemented on the backend with actual historical data
      // For now, return mock data
      const now = new Date();
      const mockData = [];
      const intervals = {
        '1h': 60, // 1-minute intervals
        '24h': 60, // 24-minute intervals
        '7d': 1440, // 6-hour intervals
        '30d': 2880 // 12-hour intervals
      };

      const intervalMs = (intervals[timeRange] || 60) * 60 * 1000;
      const points = Math.min(100, Math.floor((Date.now() - (timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : 2592000000)) / intervalMs));

      for (let i = points - 1; i >= 0; i--) {
        const timestamp = new Date(Date.now() - (i * intervalMs));
        let value: number;

        // Generate realistic mock data based on sensor type
        switch (sensorType) {
          case 'temperature':
            value = 70 + Math.random() * 15; // 70-85°F
            break;
          case 'humidity':
            value = 40 + Math.random() * 30; // 40-70%
            break;
          case 'soilMoisture':
            value = 30 + Math.random() * 40; // 30-70%
            break;
          case 'lightIntensity':
            value = 400 + Math.random() * 600; // 400-1000 μmol
            break;
          case 'ph':
            value = 5.5 + Math.random() * 1.5; // 5.5-7.0
            break;
          case 'ec':
            value = 1.0 + Math.random() * 1.5; // 1.0-2.5 mS/cm
            break;
          case 'co2':
            value = 800 + Math.random() * 600; // 800-1400 ppm
            break;
          case 'vpd':
            value = 0.6 + Math.random() * 0.6; // 0.6-1.2
            break;
          default:
            value = Math.random() * 100;
        }

        mockData.push({
          timestamp: timestamp.toISOString(),
          value: Math.round(value * 100) / 100,
          roomId
        });
      }

      return mockData;
    } catch (error) {
      console.error(`Failed to get ${sensorType} history:`, error);
      throw error;
    }
  }

  /**
   * Get sensor alerts and notifications
   */
  async getSensorAlerts(severity?: 'info' | 'warning' | 'error'): Promise<ApiResponse> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        success: true,
        data: [],
        message: 'No sensor alerts',
        timestamp: new Date().toISOString(),
        buildMode: 'server'
      };
    } catch (error) {
      console.error('Failed to get sensor alerts:', error);
      throw error;
    }
  }

  /**
   * Get sensor calibration data
   */
  async getSensorCalibration(roomId?: string): Promise<ApiResponse> {
    try {
      // This would need to be implemented on the backend
      // For now, return a mock response
      return {
        success: true,
        data: {
          calibrationDate: new Date().toISOString(),
          nextCalibrationDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          sensors: [
            { type: 'temperature', calibrated: true, accuracy: '±0.5°F' },
            { type: 'humidity', calibrated: true, accuracy: '±2%' },
            { type: 'ph', calibrated: false, accuracy: '±0.1' },
            { type: 'ec', calibrated: true, accuracy: '±0.05 mS/cm' }
          ]
        },
        timestamp: new Date().toISOString(),
        buildMode: 'server'
      };
    } catch (error) {
      console.error('Failed to get sensor calibration data:', error);
      throw error;
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Validate sensor data
   */
  validateSensorData(data: Partial<SensorData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.temperature !== undefined && (data.temperature < -50 || data.temperature > 150)) {
      errors.push('Temperature must be between -50°F and 150°F');
    }

    if (data.humidity !== undefined && (data.humidity < 0 || data.humidity > 100)) {
      errors.push('Humidity must be between 0% and 100%');
    }

    if (data.soilMoisture !== undefined && (data.soilMoisture < 0 || data.soilMoisture > 100)) {
      errors.push('Soil moisture must be between 0% and 100%');
    }

    if (data.lightIntensity !== undefined && (data.lightIntensity < 0 || data.lightIntensity > 3000)) {
      errors.push('Light intensity must be between 0 and 3000 μmol');
    }

    if (data.ph !== undefined && (data.ph < 0 || data.ph > 14)) {
      errors.push('pH must be between 0 and 14');
    }

    if (data.ec !== undefined && (data.ec < 0 || data.ec > 10)) {
      errors.push('EC must be between 0 and 10 mS/cm');
    }

    if (data.co2 !== undefined && (data.co2 < 200 || data.co2 > 3000)) {
      errors.push('CO2 must be between 200 and 3000 ppm');
    }

    if (data.vpd !== undefined && (data.vpd < 0 || data.vpd > 3)) {
      errors.push('VPD must be between 0 and 3');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get optimal ranges for different parameters
   */
  getOptimalRanges(): Record<string, { min: number; max: number; unit: string; optimal: string }> {
    return {
      temperature: {
        min: 68,
        max: 85,
        unit: '°F',
        optimal: '20-26°C (68-79°F)'
      },
      humidity: {
        min: 40,
        max: 60,
        unit: '%',
        optimal: '40-60%'
      },
      soilMoisture: {
        min: 40,
        max: 70,
        unit: '%',
        optimal: '40-70%'
      },
      lightIntensity: {
        min: 400,
        max: 1000,
        unit: 'μmol',
        optimal: '400-1000 μmol/m²/s'
      },
      ph: {
        min: 6.0,
        max: 7.0,
        unit: 'pH',
        optimal: '6.0-7.0'
      },
      ec: {
        min: 1.2,
        max: 2.5,
        unit: 'mS/cm',
        optimal: '1.2-2.5 mS/cm'
      },
      co2: {
        min: 1000,
        max: 1500,
        unit: 'ppm',
        optimal: '1000-1500 ppm'
      },
      vpd: {
        min: 0.8,
        max: 1.2,
        unit: 'kPa',
        optimal: '0.8-1.2 kPa'
      }
    };
  }

  /**
   * Check if values are within optimal ranges
   */
  checkOptimalRanges(data: Partial<SensorData>): Record<string, { status: 'optimal' | 'warning' | 'critical'; message: string }> {
    const results: Record<string, { status: 'optimal' | 'warning' | 'critical'; message: string }> = {};
    const ranges = this.getOptimalRanges();

    Object.entries(ranges).forEach(([key, range]) => {
      const value = data[key as keyof SensorData];
      if (value !== undefined) {
        if (value >= range.min && value <= range.max) {
          results[key] = {
            status: 'optimal',
            message: `Within optimal range (${range.optimal})`
          };
        } else if (value < range.min * 0.8 || value > range.max * 1.2) {
          results[key] = {
            status: 'critical',
            message: `Critically outside optimal range (${range.optimal})`
          };
        } else {
          results[key] = {
            status: 'warning',
            message: `Slightly outside optimal range (${range.optimal})`
          };
        }
      }
    });

    return results;
  }
}

// Export singleton instance
export const sensorsService = new SensorsService();

// Export service class for testing
export { SensorsService };