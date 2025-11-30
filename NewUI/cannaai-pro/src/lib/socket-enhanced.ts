// Enhanced Socket.IO Service for Comprehensive Sensor System
import { io, Socket } from 'socket.io-client';

// Enhanced sensor data interface matching our comprehensive sensor system
export interface EnhancedSensorData {
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

export interface EnhancedNotificationData {
  id: string;
  type: 'warning' | 'error' | 'success' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  sensorId?: string;
  roomName?: string;
  acknowledged: boolean;
  data?: any;
  actions?: Array<{
    label: string;
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface SystemHealthUpdate {
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

export interface AutomationEvent {
  type: 'watering' | 'lighting' | 'climate' | 'co2';
  action: 'start' | 'stop' | 'adjust';
  roomId?: string;
  sensorId?: string;
  parameters?: Record<string, any>;
  timestamp: string;
  result?: {
    success: boolean;
    message: string;
  };
}

class EnhancedSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventListeners = new Map<string, Function[]>();

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Determine server URL based on environment
    const serverUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : `http://${window.location.hostname}:3000`;

    console.log(`🔌 Connecting to enhanced Socket.IO server at: ${serverUrl}`);

    this.socket = io(serverUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: false, // We'll handle reconnection manually
      upgrade: true,
      rememberUpgrade: true,
    });

    this.setupEventListeners();
    this.startHeartbeat();

    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to Enhanced Socket.IO server:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('system-status', { connected: true, timestamp: new Date().toISOString() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason);
      this.stopHeartbeat();
      this.handleReconnect();
      this.emit('system-status', { connected: false, reason, timestamp: new Date().toISOString() });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      this.handleReconnect();
    });

    // Enhanced sensor data events
    this.socket.on('sensor-data', (data: EnhancedSensorData) => {
      this.handleSensorData(data);
    });

    this.socket.on('sensor-data-batch', (data: EnhancedSensorData[]) => {
      this.handleSensorDataBatch(data);
    });

    this.socket.on('sensor-status', (data: { sensorId: string; status: 'online' | 'offline'; lastSeen: string }) => {
      this.handleSensorStatus(data);
    });

    // Enhanced notification events
    this.socket.on('notification', (data: EnhancedNotificationData) => {
      this.handleNotification(data);
    });

    this.socket.on('notification-batch', (data: EnhancedNotificationData[]) => {
      this.handleNotificationBatch(data);
    });

    // System health events
    this.socket.on('system-health', (data: SystemHealthUpdate) => {
      this.handleSystemHealth(data);
    });

    // Automation events
    this.socket.on('automation-event', (data: AutomationEvent) => {
      this.handleAutomationEvent(data);
    });

    // Analysis events
    this.socket.on('analysis-complete', (data: any) => {
      this.handleAnalysisComplete(data);
    });

    this.socket.on('analysis-progress', (data: { progress: number; stage: string; message: string }) => {
      this.handleAnalysisProgress(data);
    });

    // Room events
    this.socket.on('room-updated', (data: { roomId: string; updates: any }) => {
      this.handleRoomUpdated(data);
    });

    // Alert events
    this.socket.on('alert-triggered', (data: { alertId: string; sensorId: string; severity: string; message: string }) => {
      this.handleAlertTriggered(data);
    });

    this.socket.on('alert-resolved', (data: { alertId: string; resolvedBy: string; resolution: string }) => {
      this.handleAlertResolved(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      // Exponential backoff with jitter
      const jitter = Math.random() * 0.1;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) * (1 + jitter), 30000);

      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay)}ms`);

      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached. Please refresh the page.');
      this.emit('reconnect-failed', { attempts: this.reconnectAttempts });
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Enhanced event handlers
  private handleSensorData(data: EnhancedSensorData) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('enhanced-sensor-data', { detail: data }));
    this.emit('sensor-data', data);
  }

  private handleSensorDataBatch(data: EnhancedSensorData[]) {
    window.dispatchEvent(new CustomEvent('enhanced-sensor-data-batch', { detail: data }));
    this.emit('sensor-data-batch', data);
  }

  private handleSensorStatus(data: { sensorId: string; status: 'online' | 'offline'; lastSeen: string }) {
    window.dispatchEvent(new CustomEvent('sensor-status', { detail: data }));
    this.emit('sensor-status', data);
  }

  private handleNotification(data: EnhancedNotificationData) {
    window.dispatchEvent(new CustomEvent('enhanced-notification', { detail: data }));
    this.emit('notification', data);
  }

  private handleNotificationBatch(data: EnhancedNotificationData[]) {
    window.dispatchEvent(new CustomEvent('enhanced-notification-batch', { detail: data }));
    this.emit('notification-batch', data);
  }

  private handleSystemHealth(data: SystemHealthUpdate) {
    window.dispatchEvent(new CustomEvent('system-health', { detail: data }));
    this.emit('system-health', data);
  }

  private handleAutomationEvent(data: AutomationEvent) {
    window.dispatchEvent(new CustomEvent('automation-event', { detail: data }));
    this.emit('automation-event', data);
  }

  private handleAnalysisComplete(data: any) {
    window.dispatchEvent(new CustomEvent('analysis-complete', { detail: data }));
    this.emit('analysis-complete', data);
  }

  private handleAnalysisProgress(data: { progress: number; stage: string; message: string }) {
    window.dispatchEvent(new CustomEvent('analysis-progress', { detail: data }));
    this.emit('analysis-progress', data);
  }

  private handleRoomUpdated(data: { roomId: string; updates: any }) {
    window.dispatchEvent(new CustomEvent('room-updated', { detail: data }));
    this.emit('room-updated', data);
  }

  private handleAlertTriggered(data: { alertId: string; sensorId: string; severity: string; message: string }) {
    window.dispatchEvent(new CustomEvent('alert-triggered', { detail: data }));
    this.emit('alert-triggered', data);
  }

  private handleAlertResolved(data: { alertId: string; resolvedBy: string; resolution: string }) {
    window.dispatchEvent(new CustomEvent('alert-resolved', { detail: data }));
    this.emit('alert-resolved', data);
  }

  // Enhanced emit methods
  emit(event: string, data: any) {
    // Call registered listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Send to server if connected
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Event listener management
  on(event: string, listener: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Enhanced subscription methods
  subscribeToSensorData(sensorIds: string[]) {
    this.emit('subscribe-sensors', { sensorIds });
  }

  unsubscribeFromSensorData(sensorIds: string[]) {
    this.emit('unsubscribe-sensors', { sensorIds });
  }

  subscribeToRoomData(roomIds: string[]) {
    this.emit('subscribe-rooms', { roomIds });
  }

  unsubscribeFromRoomData(roomIds: string[]) {
    this.emit('unsubscribe-rooms', { roomIds });
  }

  subscribeToAlerts(severity?: string[]) {
    this.emit('subscribe-alerts', { severity });
  }

  unsubscribeFromAlerts() {
    this.emit('unsubscribe-alerts');
  }

  // Automation control methods
  executeAutomationAction(action: {
    type: string;
    action: string;
    roomId?: string;
    sensorId?: string;
    parameters?: Record<string, any>;
  }) {
    this.emit('automation-execute', action);
  }

  // Sensor management methods
  requestSensorStatus(sensorIds: string[]) {
    this.emit('request-sensor-status', { sensorIds });
  }

  calibrateSensor(sensorId: string, calibrationData: any) {
    this.emit('calibrate-sensor', { sensorId, calibrationData });
  }

  testSensor(sensorId: string) {
    this.emit('test-sensor', { sensorId });
  }

  // Utility methods
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  // Get socket status
  get isConnected() {
    return this.socket?.connected || false;
  }

  get socketId() {
    return this.socket?.id || null;
  }

  get connectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socketId,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
export const enhancedSocketService = new EnhancedSocketService();

// Hook for using enhanced socket in components
export const useEnhancedSocket = () => {
  const connect = () => enhancedSocketService.connect();
  const disconnect = () => enhancedSocketService.disconnect();
  const emit = (event: string, data: any) => enhancedSocketService.emit(event, data);
  const on = (event: string, listener: Function) => enhancedSocketService.on(event, listener);
  const off = (event: string, listener: Function) => enhancedSocketService.off(event, listener);

  return {
    connect,
    disconnect,
    emit,
    on,
    off,
    subscribeToSensorData: enhancedSocketService.subscribeToSensorData,
    unsubscribeFromSensorData: enhancedSocketService.unsubscribeFromSensorData,
    subscribeToRoomData: enhancedSocketService.subscribeToRoomData,
    unsubscribeFromRoomData: enhancedSocketService.unsubscribeFromRoomData,
    subscribeToAlerts: enhancedSocketService.subscribeToAlerts,
    unsubscribeFromAlerts: enhancedSocketService.unsubscribeFromAlerts,
    executeAutomationAction: enhancedSocketService.executeAutomationAction,
    requestSensorStatus: enhancedSocketService.requestSensorStatus,
    calibrateSensor: enhancedSocketService.calibrateSensor,
    testSensor: enhancedSocketService.testSensor,
    isConnected: enhancedSocketService.isConnected,
    socketId: enhancedSocketService.socketId,
    connectionStatus: enhancedSocketService.connectionStatus,
  };
};

export default enhancedSocketService;