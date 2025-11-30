import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from '../lib/socket';
import { SensorData, NotificationData } from '../lib/socket';

interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  lastSensorData: SensorData | null;
  notifications: NotificationData[];
  clearNotifications: () => void;
  subscribeToSensorData: (roomName: string) => void;
  unsubscribeFromSensorData: (roomName: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connect, disconnect, isConnected, socketId, subscribeToSensorData: subscribe, unsubscribeFromSensorData: unsubscribe } = useSocket();
  const [lastSensorData, setLastSensorData] = useState<SensorData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    // Connect to socket when provider mounts
    connect();

    // Set up event listeners for custom events
    const handleSensorData = (event: CustomEvent) => {
      setLastSensorData(event.detail);
    };

    const handleNotification = (event: CustomEvent) => {
      setNotifications(prev => [event.detail, ...prev].slice(0, 50)); // Keep last 50 notifications
    };

    window.addEventListener('sensor-data', handleSensorData as EventListener);
    window.addEventListener('notification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('sensor-data', handleSensorData as EventListener);
      window.removeEventListener('notification', handleNotification as EventListener);
      disconnect();
    };
  }, [connect, disconnect]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const contextValue: SocketContextType = {
    isConnected,
    socketId,
    lastSensorData,
    notifications,
    clearNotifications,
    subscribeToSensorData: subscribe,
    unsubscribeFromSensorData: unsubscribe,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};