import React from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketConnectionStatus, SocketEvents, SocketMessage, SensorData, Room, AutomationSettings } from '@/types/api';

// =============================================================================
// Configuration
// =============================================================================

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
const SOCKET_PATH = '/api/socketio';
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// =============================================================================
// Socket Client Class
// =============================================================================

export class SocketClient {
  private socket: Socket | null = null;
  private status: SocketConnectionStatus = {
    connected: false,
    connecting: false,
    error: undefined,
    lastConnected: undefined,
    reconnectAttempts: 0
  };
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isDestroying = false;

  constructor(
    private url: string = SOCKET_URL,
    private options: {
      timeout?: number;
      maxReconnectAttempts?: number;
      autoConnect?: boolean;
      authToken?: string;
    } = {}
  ) {
    if (this.options.autoConnect !== false) {
      this.connect();
    }

    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy();
      });
    }
  }

  // =============================================================================
  // Connection Management
  // =============================================================================

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroying) {
        reject(new Error('Socket client is being destroyed'));
        return;
      }

      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.status.connecting) {
        // If already connecting, wait for it to complete
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.status.connecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.updateStatus({
        connecting: true,
        error: undefined,
        reconnectAttempts: 0
      });

      // Create socket connection
      this.socket = io(this.url, {
        path: SOCKET_PATH,
        timeout: this.options.timeout || CONNECTION_TIMEOUT,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.options.maxReconnectAttempts || RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_DELAY,
        reconnectionDelayMax: 10000,
        maxHttpBufferSize: 1e8, // 100 MB
        // Add authentication if provided
        auth: this.options.authToken ? {
          token: this.options.authToken
        } : undefined
      });

      this.setupEventHandlers();

      // Resolve/reject based on connection result
      const onConnect = () => {
        this.updateStatus({
          connected: true,
          connecting: false,
          lastConnected: new Date().toISOString(),
          error: undefined,
          reconnectAttempts: 0
        });

        this.startHeartbeat();
        this.flushMessageQueue();
        resolve();
      };

      const onConnectError = (error: Error) => {
        this.updateStatus({
          connected: false,
          connecting: false,
          error: error.message
        });
        reject(error);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onConnectError);

      // Timeout handling
      setTimeout(() => {
        if (this.status.connecting) {
          this.updateStatus({
            connected: false,
            connecting: false,
            error: 'Connection timeout'
          });
          reject(new Error('Connection timeout'));
        }
      }, this.options.timeout || CONNECTION_TIMEOUT);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateStatus({
      connected: false,
      connecting: false,
      error: undefined
    });
  }

  /**
   * Destroy the socket client
   */
  destroy(): void {
    this.isDestroying = true;
    this.disconnect();
    this.eventListeners.clear();
    this.messageQueue.length = 0;
  }

  /**
   * Reconnect to the server
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  // =============================================================================
  // Event Handling
  // =============================================================================

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      this.updateStatus({
        connected: true,
        connecting: false,
        lastConnected: new Date().toISOString(),
        error: undefined,
        reconnectAttempts: 0
      });
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connection_status', this.status);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.stopHeartbeat();
      this.updateStatus({
        connected: false,
        connecting: false,
        error: reason
      });
      this.emit('connection_status', this.status);

      // Handle reconnection based on disconnect reason
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't reconnect automatically
        console.log('🔌 Server disconnected, manual reconnect required');
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      this.updateStatus({
        connected: false,
        connecting: false,
        error: error.message,
        reconnectAttempts: this.status.reconnectAttempts + 1
      });
      this.emit('connection_status', this.status);

      // Handle reconnection
      if (this.status.reconnectAttempts < (this.options.maxReconnectAttempts || RECONNECT_ATTEMPTS)) {
        this.scheduleReconnect();
      } else {
        console.error('🔌 Max reconnection attempts reached');
        this.emit('max_reconnect_attempts_reached', this.status);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔌 Reconnection attempt ${attemptNumber}`);
      this.updateStatus({
        reconnectAttempts: attemptNumber
      });
      this.emit('reconnect_attempt', attemptNumber);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
      this.updateStatus({
        connected: true,
        reconnectAttempts: 0,
        error: undefined
      });
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔌 Reconnection failed');
      this.updateStatus({
        connected: false,
        connecting: false,
        error: 'Reconnection failed'
      });
      this.emit('reconnect_failed');
    });

    // Message handlers
    this.socket.on('message', (data: SocketMessage) => {
      this.emit('message', data);
    });

    this.socket.on('sensor_update', (data: SensorData) => {
      this.emit('sensor_update', data);
    });

    this.socket.on('room_update', (data: Room) => {
      this.emit('room_update', data);
    });

    this.socket.on('automation_update', (data: AutomationSettings) => {
      this.emit('automation_update', data);
    });

    this.socket.on('analysis_progress', (data: { progress: number; message: string }) => {
      this.emit('analysis_progress', data);
    });

    this.socket.on('notification', (data: { type: string; message: string; level: 'info' | 'warning' | 'error' }) => {
      this.emit('notification', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('🔌 Socket error:', error);
      this.emit('error', error);
    });
  }

  // =============================================================================
  // Event Emission
  // =============================================================================

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any): void {
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
  }

  /**
   * Send message to server
   */
  send(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message if not connected
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      console.log(`🔌 Message queued (${event}):`, data);
    }
  }

  /**
   * Send chat message
   */
  sendMessage(text: string): void {
    const message: SocketMessage = {
      text,
      senderId: 'client',
      timestamp: new Date().toISOString()
    };
    this.send('message', message);
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  /**
   * Update connection status
   */
  private updateStatus(updates: Partial<SocketConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    this.emit('status_update', this.status);
  }

  /**
   * Get current connection status
   */
  getStatus(): SocketConnectionStatus {
    return { ...this.status };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Check if connecting
   */
  isConnecting(): boolean {
    return this.status.connecting;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimer();

    this.reconnectTimer = setTimeout(async () => {
      if (!this.status.connected && !this.status.connecting && !this.isDestroying) {
        try {
          console.log(`🔌 Attempting reconnection (${this.status.reconnectAttempts + 1})`);
          await this.connect();
        } catch (error) {
          console.error('🔌 Reconnection failed:', error);
        }
      }
    }, RECONNECT_DELAY);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`🔌 Flushing ${this.messageQueue.length} queued messages`);
    const queued = [...this.messageQueue];
    this.messageQueue.length = 0;

    queued.forEach(({ event, data }) => {
      this.send(event, data);
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connected: boolean;
    lastConnected?: string;
    reconnectAttempts: number;
    queuedMessages: number;
    listeners: Record<string, number>;
  } {
    const listeners: Record<string, number> = {};
    this.eventListeners.forEach((set, event) => {
      listeners[event] = set.size;
    });

    return {
      connected: this.status.connected,
      lastConnected: this.status.lastConnected,
      reconnectAttempts: this.status.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      listeners
    };
  }

  /**
   * Enable debugging
   */
  enableDebug(): void {
    this.on('message', (data: SocketMessage) => {
      console.log('🔌 Received message:', data);
    });

    this.on('sensor_update', (data: SensorData) => {
      console.log('🔌 Sensor update:', data);
    });

    this.on('status_update', (status: SocketConnectionStatus) => {
      console.log('🔌 Status update:', status);
    });
  }
}

// =============================================================================
// Global Socket Client Instance
// =============================================================================

export const socketClient = new SocketClient();

// Export utility functions
export * from './client';

// Export hook creator
export const createSocketHook = () => {
  const [status, setStatus] = React.useState<SocketConnectionStatus>(socketClient.getStatus());

  React.useEffect(() => {
    const handleStatusUpdate = (newStatus: SocketConnectionStatus) => {
      setStatus(newStatus);
    };

    socketClient.on('status_update', handleStatusUpdate);

    return () => {
      socketClient.off('status_update', handleStatusUpdate);
    };
  }, []);

  return {
    status,
    isConnected: socketClient.isConnected(),
    isConnecting: socketClient.isConnecting(),
    socketId: socketClient.getSocketId(),
    connect: () => socketClient.connect(),
    disconnect: () => socketClient.disconnect(),
    reconnect: () => socketClient.reconnect(),
    send: (event: string, data?: any) => socketClient.send(event, data),
    sendMessage: (text: string) => socketClient.sendMessage(text),
    on: (event: string, listener: Function) => socketClient.on(event, listener),
    off: (event: string, listener: Function) => socketClient.off(event, listener),
    getStats: () => socketClient.getStats(),
    enableDebug: () => socketClient.enableDebug()
  };
};