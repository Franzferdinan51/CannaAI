import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { ErrorInfo } from '@/lib/utils/errorHandling';

// =============================================================================
// Types
// =============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => string;
  showError: (title: string, message?: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => string;
  showLoading: (title: string, message?: string, options?: Partial<Notification>) => string;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// =============================================================================
// Provider Component
// =============================================================================

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function NotificationProvider({
  children,
  maxNotifications = 5,
  defaultDuration = 5000,
  position = 'top-right'
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id,
      timestamp: new Date().toISOString(),
      duration: defaultDuration,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove notification if not persistent and has duration
    if (!notification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, ...updates, timestamp: notification.timestamp }
          : notification
      )
    );
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: 'success', title, message, ...options }), [addNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: 'error', title, message, persistent: true, ...options }), [addNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: 'warning', title, message, ...options }), [addNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: 'info', title, message, ...options }), [addNotification]);

  const showLoading = useCallback((title: string, message?: string, options?: Partial<Notification>) =>
    addNotification({ type: 'loading', title, message, persistent: true, ...options }), [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer position={position} />
    </NotificationContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// =============================================================================
// Container Component
// =============================================================================

interface NotificationContainerProps {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

function NotificationContainer({ position }: NotificationContainerProps) {
  const { notifications } = useNotifications();

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 flex flex-col gap-2 p-4 pointer-events-none';

    const positionClasses = {
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2'
    };

    return `${baseClasses} ${positionClasses[position]}`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={getPositionClasses()}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Notification Item Component
// =============================================================================

function NotificationItem({ notification }: { notification: Notification }) {
  const { removeNotification, updateNotification } = useNotifications();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getIcon = () => {
    const iconClasses = 'w-5 h-5 flex-shrink-0';

    switch (notification.type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-yellow-500`} />;
      case 'info':
        return <Info className={`${iconClasses} text-blue-500`} />;
      case 'loading':
        return <Loader2 className={`${iconClasses} text-gray-500 animate-spin`} />;
      default:
        return <Info className={`${iconClasses} text-gray-500`} />;
    }
  };

  const getColorClasses = () => {
    const baseClasses = 'bg-white rounded-lg shadow-lg border pointer-events-auto max-w-sm w-full';

    switch (notification.type) {
      case 'success':
        return `${baseClasses} border-green-200`;
      case 'error':
        return `${baseClasses} border-red-200`;
      case 'warning':
        return `${baseClasses} border-yellow-200`;
      case 'info':
        return `${baseClasses} border-blue-200`;
      case 'loading':
        return `${baseClasses} border-gray-200`;
      default:
        return baseClasses;
    }
  };

  const handleAction = async () => {
    if (notification.action) {
      setIsLoading(true);
      try {
        await notification.action.onClick();
        removeNotification(notification.id);
      } catch (error) {
        console.error('Notification action failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemove = () => {
    removeNotification(notification.id);
  };

  // Auto-hide on hover for non-persistent notifications
  useEffect(() => {
    if (!notification.persistent && !isHovered) {
      const timer = setTimeout(() => {
        handleRemove();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isHovered, notification.persistent]);

  return (
    <div
      className={getColorClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h3>
            {notification.message && (
              <p className="mt-1 text-sm text-gray-500">
                {notification.message}
              </p>
            )}
            {notification.action && (
              <div className="mt-3">
                <button
                  onClick={handleAction}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {notification.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleRemove}
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {notification.duration && !notification.persistent && (
        <div className="relative">
          <div className="overflow-hidden h-1 bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all ease-linear"
              style={{
                width: isHovered ? '0%' : '100%',
                transitionDuration: isHovered ? '0.2s' : `${notification.duration}ms`,
                animationDirection: isHovered ? 'reverse' : 'normal'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

export function createNotificationFromError(errorInfo: ErrorInfo): Omit<Notification, 'id' | 'timestamp'> {
  const typeMap: Record<string, NotificationType> = {
    'RATE_LIMIT': 'warning',
    'NETWORK': 'error',
    'TIMEOUT': 'error',
    'AI_PROVIDER': 'error',
    'API_ERROR': 'error',
    'TYPE_ERROR': 'error',
    'REFERENCE_ERROR': 'error',
    'UNKNOWN': 'error'
  };

  return {
    type: typeMap[errorInfo.type] || 'error',
    title: errorInfo.userMessage || 'An error occurred',
    message: errorInfo.suggestions?.join('. ') || errorInfo.message,
    persistent: errorInfo.type === 'AI_PROVIDER' || errorInfo.type === 'RATE_LIMIT',
    metadata: {
      originalError: errorInfo,
      type: errorInfo.type,
      code: errorInfo.code,
      status: errorInfo.status
    }
  };
}

// =============================================================================
// Hook for Error Handling Integration
// =============================================================================

export function useErrorNotifications() {
  const { showError, showWarning, showInfo } = useNotifications();

  const handleApiError = useCallback((errorInfo: ErrorInfo) => {
    const notification = createNotificationFromError(errorInfo);

    switch (errorInfo.type) {
      case 'RATE_LIMIT':
        showWarning(notification.title, notification.message, notification);
        break;
      case 'AI_PROVIDER':
        showError(notification.title, notification.message, notification);
        break;
      default:
        showError(notification.title, notification.message, notification);
    }
  }, [showError, showWarning]);

  const handleSuccess = useCallback((title: string, message?: string) => {
    // Note: This would need to be implemented in the NotificationProvider
    console.log('Success:', title, message);
  }, []);

  return {
    handleApiError,
    handleSuccess
  };
}

export default NotificationProvider;