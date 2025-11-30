import { io, Socket } from 'socket.io-client';

export interface SensorData {
  temperature: number;
  humidity: number;
  pH: number;
  EC: number;
  CO2: number;
  VPD: number;
  roomName: string;
  timestamp: string;
}

export interface NotificationData {
  type: 'warning' | 'error' | 'success' | 'info';
  message: string;
  timestamp: string;
  data?: any;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('http://localhost:3000', {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.handleReconnect();
    });

    // Custom event listeners
    this.socket.on('sensor-data', (data: SensorData) => {
      this.handleSensorData(data);
    });

    this.socket.on('notification', (data: NotificationData) => {
      this.handleNotification(data);
    });

    this.socket.on('analysis-complete', (data: any) => {
      this.handleAnalysisComplete(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    }
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
  const connect = () => socketService.connect();
  const disconnect = () => socketService.disconnect();
  const emit = (event: string, data: any) => socketService.emit(event, data);
  const subscribeToSensorData = (roomName: string) => socketService.subscribeToSensorData(roomName);
  const unsubscribeFromSensorData = (roomName: string) => socketService.unsubscribeFromSensorData(roomName);

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