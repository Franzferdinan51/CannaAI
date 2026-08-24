import { useState, useEffect, useCallback, useRef } from 'react';
import { socketClient } from '@/lib/socket/client';
import {
  SocketConnectionStatus,
  SocketMessage,
  SensorData,
  Room,
  AutomationSettings
} from '@/types/api';

// =============================================================================
// Hook Types
// =============================================================================

interface UseSocketOptions {
  autoConnect?: boolean;
  debug?: boolean;
  reconnectOnFocus?: boolean;
  reconnectOnOnline?: boolean;
}

interface UseSocketReturn {
  status: SocketConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  socketId: string | undefined;
  lastMessage: SocketMessage | null;
  lastSensorUpdate: SensorData | null;
  lastRoomUpdate: Room | null;
  lastAutomationUpdate: AutomationSettings | null;
  notifications: Array<{ type: string; message: string; level: 'info' | 'warning' | 'error'; timestamp: string }>;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendMessage: (text: string) => void;
  sendEvent: (event: string, data?: any) => void;
  clearNotifications: () => void;
  stats: {
    connected: boolean;
    lastConnected?: string;
    reconnectAttempts: number;
    queuedMessages: number;
    listeners: Record<string, number>;
  };
}

// =============================================================================
// Main Socket Hook
// =============================================================================

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    autoConnect = true,
    debug = false,
    reconnectOnFocus = true,
    reconnectOnOnline = true
  } = options;

  // State management
  const [status, setStatus] = useState<SocketConnectionStatus>(socketClient.getStatus());
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const [lastSensorUpdate, setLastSensorUpdate] = useState<SensorData | null>(null);
  const [lastRoomUpdate, setLastRoomUpdate] = useState<Room | null>(null);
  const [lastAutomationUpdate, setLastAutomationUpdate] = useState<AutomationSettings | null>(null);
  const [notifications, setNotifications] = useState<Array<{
    type: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    timestamp: string;
  }>>([]);

  // Refs for cleanup
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Event handler cleanup
  const addListener = useCallback((event: string, handler: Function) => {
    socketClient.on(event, handler);
    listenersRef.current.set(event, handler);
  }, []);

  const removeListener = useCallback((event: string) => {
    const handler = listenersRef.current.get(event);
    if (handler) {
      socketClient.off(event, handler);
      listenersRef.current.delete(event);
    }
  }, []);

  const removeAllListeners = useCallback(() => {
    listenersRef.current.forEach((handler, event) => {
      socketClient.off(event, handler);
    });
    listenersRef.current.clear();
  }, []);

  // Main event handlers
  useEffect(() => {
    const handleStatusUpdate = (newStatus: SocketConnectionStatus) => {
      setStatus(newStatus);
    };

    const handleMessage = (message: SocketMessage) => {
      setLastMessage(message);
      if (debug) {
        console.log('🔌 Socket message received:', message);
      }
    };

    const handleSensorUpdate = (data: SensorData) => {
      setLastSensorUpdate(data);
      if (debug) {
        console.log('🔌 Sensor update received:', data);
      }
    };

    const handleRoomUpdate = (data: Room) => {
      setLastRoomUpdate(data);
      if (debug) {
        console.log('🔌 Room update received:', data);
      }
    };

    const handleAutomationUpdate = (data: AutomationSettings) => {
      setLastAutomationUpdate(data);
      if (debug) {
        console.log('🔌 Automation update received:', data);
      }
    };

    const handleNotification = (data: { type: string; message: string; level: 'info' | 'warning' | 'error' }) => {
      const notification = {
        ...data,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [...prev.slice(-49), notification]); // Keep last 50
      if (debug) {
        console.log('🔌 Notification received:', notification);
      }
    };

    const handleError = (error: Error) => {
      console.error('🔌 Socket error:', error);
      const notification = {
        type: 'socket_error',
        message: `Socket error: ${error.message}`,
        level: 'error' as const,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [...prev.slice(-49), notification]);
    };

    // Register event listeners
    addListener('status_update', handleStatusUpdate);
    addListener('message', handleMessage);
    addListener('sensor_update', handleSensorUpdate);
    addListener('room_update', handleRoomUpdate);
    addListener('automation_update', handleAutomationUpdate);
    addListener('notification', handleNotification);
    addListener('error', handleError);

    // Auto-connect if enabled
    if (autoConnect && !socketClient.isConnected() && !socketClient.isConnecting()) {
      socketClient.connect().catch(error => {
        console.error('Failed to auto-connect socket:', error);
      });
    }

    // Enable debug mode if requested
    if (debug) {
      socketClient.enableDebug();
    }

    return () => {
      removeAllListeners();
    };
  }, [autoConnect, debug, addListener, removeListener, removeAllListeners]);

  // Browser focus/visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (reconnectOnFocus && document.visibilityState === 'visible') {
        if (!socketClient.isConnected() && !socketClient.isConnecting()) {
          console.log('🔌 Page became visible, attempting reconnection');
          socketClient.connect().catch(error => {
            console.error('Failed to reconnect on focus:', error);
          });
        }
      }
    };

    const handleOnline = () => {
      if (reconnectOnOnline) {
        if (!socketClient.isConnected() && !socketClient.isConnecting()) {
          console.log('🔌 Browser came online, attempting reconnection');
          socketClient.connect().catch(error => {
            console.error('Failed to reconnect when online:', error);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [reconnectOnFocus, reconnectOnOnline]);

  // Methods
  const connect = useCallback(async () => {
    return socketClient.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketClient.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    return socketClient.reconnect();
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketClient.sendMessage(text);
  }, []);

  const sendEvent = useCallback((event: string, data?: any) => {
    socketClient.send(event, data);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    status,
    isConnected: socketClient.isConnected(),
    isConnecting: socketClient.isConnecting(),
    socketId: socketClient.getSocketId(),
    lastMessage,
    lastSensorUpdate,
    lastRoomUpdate,
    lastAutomationUpdate,
    notifications,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    sendEvent,
    clearNotifications,
    stats: socketClient.getStats()
  };
}

// =============================================================================
// Specialized Hooks
// =============================================================================

export function useSocketConnection() {
  const { status, connect, disconnect, reconnect, isConnected, isConnecting } = useSocket();

  return {
    status,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    reconnect,
    canReconnect: status.reconnectAttempts < 5,
    error: status.error
  };
}

export function useSocketMessages() {
  const { lastMessage, sendMessage, isConnected } = useSocket();
  const [messageHistory, setMessageHistory] = useState<SocketMessage[]>([]);

  useEffect(() => {
    if (lastMessage) {
      setMessageHistory(prev => [...prev.slice(-99), lastMessage]); // Keep last 100
    }
  }, [lastMessage]);

  const clearHistory = useCallback(() => {
    setMessageHistory([]);
  }, []);

  return {
    lastMessage,
    messageHistory,
    sendMessage,
    isConnected,
    clearHistory
  };
}

export function useRealtimeSensors() {
  const { lastSensorUpdate, isConnected } = useSocket();
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);

  useEffect(() => {
    if (lastSensorUpdate) {
      setSensorHistory(prev => {
        const newHistory = [...prev, lastSensorUpdate];
        return newHistory.slice(-59); // Keep last 60 entries (1 hour with 1-minute intervals)
      });
    }
  }, [lastSensorUpdate]);

  const getSensorTrend = useCallback((sensor: keyof SensorData): 'up' | 'down' | 'stable' | 'insufficient_data' => {
    if (sensorHistory.length < 3) return 'insufficient_data';

    const recent = sensorHistory.slice(-3);
    const values = recent.map(h => h[sensor]);

    if (values.every(v => v === undefined)) return 'insufficient_data';

    const change = values[values.length - 1]! - values[0]!;
    const threshold = values[0]! * 0.05; // 5% threshold

    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }, [sensorHistory]);

  return {
    currentSensors: lastSensorUpdate,
    sensorHistory,
    isConnected,
    getSensorTrend
  };
}

export function useSocketNotifications() {
  const { notifications, clearNotifications } = useSocket();

  const getNotificationsByLevel = useCallback((level: 'info' | 'warning' | 'error') => {
    return notifications.filter(n => n.level === level);
  }, [notifications]);

  const hasUnreadNotifications = notifications.length > 0;
  const unreadCount = notifications.length;
  const hasErrors = notifications.some(n => n.level === 'error');
  const hasWarnings = notifications.some(n => n.level === 'warning');

  return {
    notifications,
    unreadCount,
    hasUnreadNotifications,
    hasErrors,
    hasWarnings,
    clearNotifications,
    getNotificationsByLevel
  };
}

// =============================================================================
// Hook Factory for Custom Event Handling
// =============================================================================

export function useSocketEvent<T = any>(event: string, handler: (data: T) => void, deps: React.DependencyList = []) {
  const { isConnected } = useSocket();

  useEffect(() => {
    const wrappedHandler = (data: T) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in socket event handler for ${event}:`, error);
      }
    };

    socketClient.on(event, wrappedHandler);

    return () => {
      socketClient.off(event, wrappedHandler);
    };
  }, deps);

  return { isConnected };
}

// =============================================================================
// Hook for Connection Status UI
// =============================================================================

export function useConnectionStatus() {
  const { status, reconnect, isConnected } = useSocket();
  const [showReconnectButton, setShowReconnectButton] = useState(false);

  useEffect(() => {
    // Show reconnect button after 5 seconds of disconnection
    if (!isConnected && !status.connecting) {
      const timer = setTimeout(() => {
        setShowReconnectButton(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowReconnectButton(false);
    }
  }, [isConnected, status.connecting]);

  const handleReconnect = useCallback(async () => {
    try {
      await reconnect();
      setShowReconnectButton(false);
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  }, [reconnect]);

  const statusMessage = status.connecting ? 'Connecting...' :
    status.error ? `Connection error: ${status.error}` :
    isConnected ? 'Connected' : 'Disconnected';

  const statusColor = status.connecting ? 'yellow' :
    status.error ? 'red' :
    isConnected ? 'green' : 'gray';

  return {
    isConnected,
    isConnecting: status.connecting,
    error: status.error,
    reconnectAttempts: status.reconnectAttempts,
    lastConnected: status.lastConnected,
    statusMessage,
    statusColor,
    showReconnectButton,
    handleReconnect,
    canReconnect: status.reconnectAttempts < 5
  };
}