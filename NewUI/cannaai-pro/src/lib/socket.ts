import { io, Socket } from 'socket.io-client';
import { useCallback, useSyncExternalStore } from 'react';

export function resolveWebSocketUrl(endpoint: string, baseUrl?: string): string {
  const fallback = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.href : fallback);
  const resolved = new URL(endpoint, base);
  if (resolved.protocol === 'http:') resolved.protocol = 'ws:';
  if (resolved.protocol === 'https:') resolved.protocol = 'wss:';
  return resolved.toString();
}

export function getSocketBaseUrl(): string {
  const configured = (globalThis as typeof globalThis & { __VITE_API_URL__?: string }).__VITE_API_URL__;
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return configured ? new URL(configured, base).toString().replace(/\/$/, '') : base;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  pH: number;
  EC: number;
  CO2: number;
  VPD: number;
  ph?: number;
  ec?: number;
  co2?: number;
  vpd?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  roomName: string;
  timestamp: string;
}

export interface NotificationData {
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
}

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Set<() => void>();

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(getSocketBaseUrl(), {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners(this.socket);
    this.notify();
    return this.socket;
  }

  private setupEventListeners(socket: Socket) {

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.notify();
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason);
      this.notify();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.notify();
    });

    // Custom event listeners
    socket.on('sensor-data', (data: SensorData) => {
      this.handleSensorData(data);
    });

    socket.on('notification', (data: NotificationData) => {
      this.handleNotification(data);
    });

    socket.on('analysis-complete', (data: any) => {
      this.handleAnalysisComplete(data);
    });
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleSensorData(data: SensorData) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('sensor-data', { detail: data }));
  }

  private handleNotification(data: NotificationData) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('notification', { detail: data }));
  }

  private handleAnalysisComplete(data: any) {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('analysis-complete', { detail: data }));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.notify();
  }

  // Emit methods
  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  }

  // Join room for specific data
  joinRoom(roomName: string) {
    this.emit('join-room', { roomName });
  }

  // Leave room
  leaveRoom(roomName: string) {
    this.emit('leave-room', { roomName });
  }

  // Subscribe to sensor data for specific room
  subscribeToSensorData(roomName: string) {
    this.joinRoom(`sensor-${roomName}`);
  }

  // Unsubscribe from sensor data
  unsubscribeFromSensorData(roomName: string) {
    this.leaveRoom(`sensor-${roomName}`);
  }

  // Get socket status
  get isConnected() {
    return this.socket?.connected || false;
  }

  get socketId() {
    return this.socket?.id || null;
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Hook for using socket in components
export const useSocket = () => {
  const connect = useCallback(() => socketService.connect(), []);
  const disconnect = useCallback(() => socketService.disconnect(), []);
  const emit = useCallback((event: string, data: any) => socketService.emit(event, data), []);
  const subscribeToSensorData = useCallback((roomName: string) => socketService.subscribeToSensorData(roomName), []);
  const unsubscribeFromSensorData = useCallback((roomName: string) => socketService.unsubscribeFromSensorData(roomName), []);
  useSyncExternalStore(
    (listener) => socketService.subscribe(listener),
    () => `${socketService.isConnected}:${socketService.socketId ?? ''}`,
    () => `${socketService.isConnected}:${socketService.socketId ?? ''}`,
  );

  return {
    connect,
    disconnect,
    emit,
    subscribeToSensorData,
    unsubscribeFromSensorData,
    isConnected: socketService.isConnected,
    socketId: socketService.socketId,
  };
};

export default socketService;
