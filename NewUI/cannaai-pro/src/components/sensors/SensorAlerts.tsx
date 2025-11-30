import React, { useState, useEffect, useMemo } from 'react';
import { useSocketContext } from '../../contexts/SocketContext';
import {
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
  Search,
  Download,
  Trash2,
  Pause,
  Play,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  EyeOff,
  Settings,
  Archive,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  Smartphone,
  Zap,
  Wifi,
  Battery
} from 'lucide-react';

import {
  NotificationData,
  SensorConfig,
  SensorAlert,
  AlertSeverity,
  SystemHealth
} from './types';

interface SensorAlertsProps {
  className?: string;
  sensors?: SensorConfig[];
  onSettingsClick?: () => void;
}

const SensorAlerts: React.FC<SensorAlertsProps> = ({
  className = '',
  sensors = [],
  onSettingsClick
}) => {
  const { notifications, clearNotifications, isConnected } = useSocketContext();

  // State management
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | AlertSeverity>('all');
  const [selectedType, setSelectedType] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAcknowledged, setShowAcknowledged] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: false,
    push: true,
    desktop: true,
    sound: true,
    quiet: false
  });
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  // Alert statistics
  const alertStats = useMemo(() => {
    const stats = {
      total: notifications.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unacknowledged: 0,
      acknowledged: 0,
      active: 0
    };

    notifications.forEach(notification => {
      if (notification.severity === 'critical') stats.critical++;
      else if (notification.severity === 'high') stats.high++;
      else if (notification.severity === 'medium') stats.medium++;
      else if (notification.severity === 'low') stats.low++;

      if (notification.acknowledged) {
        stats.acknowledged++;
      } else {
        stats.unacknowledged++;
        stats.active++;
      }
    });

    return stats;
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Severity filter
      if (selectedSeverity !== 'all' && notification.severity !== selectedSeverity) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && notification.type !== selectedType) {
        return false;
      }

      // Acknowledged filter
      if (!showAcknowledged && notification.acknowledged) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          notification.title.toLowerCase().includes(searchLower) ||
          notification.message.toLowerCase().includes(searchLower) ||
          notification.sensorId?.toLowerCase().includes(searchLower) ||
          notification.roomName?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [notifications, selectedSeverity, selectedType, searchQuery, showAcknowledged]);

  // Get alert icon and color
  const getAlertIcon = (type: string, severity: AlertSeverity) => {
    const baseClass = "w-5 h-5";

    switch (severity) {
      case 'critical':
        return <AlertCircle className={`${baseClass} text-red-500`} />;
      case 'high':
        return <AlertTriangle className={`${baseClass} text-orange-500`} />;
      case 'medium':
        return <AlertTriangle className={`${baseClass} text-yellow-500`} />;
      case 'low':
        return <AlertCircle className={`${baseClass} text-blue-500`} />;
      default:
        return <AlertCircle className={`${baseClass} text-gray-500`} />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'border-red-500/50 bg-red-900/10';
      case 'high': return 'border-orange-500/50 bg-orange-900/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-900/10';
      case 'low': return 'border-blue-500/50 bg-blue-900/10';
      default: return 'border-gray-500/50 bg-gray-900/10';
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = (alertId: string) => {
    // In a real implementation, this would call an API
    console.log('Acknowledging alert:', alertId);
  };

  // Acknowledge all alerts
  const acknowledgeAllAlerts = () => {
    filteredNotifications
      .filter(n => !n.acknowledged)
      .forEach(n => acknowledgeAlert(n.id));
  };

  // Delete alert
  const deleteAlert = (alertId: string) => {
    // In a real implementation, this would call an API
    console.log('Deleting alert:', alertId);
  };

  // Export alerts
  const exportAlerts = () => {
    const alertData = filteredNotifications.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged,
      sensorId: alert.sensorId,
      roomName: alert.roomName
    }));

    const dataStr = JSON.stringify(alertData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `sensor-alerts-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Toggle alert selection
  const toggleAlertSelection = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  // Select all visible alerts
  const selectAllVisibleAlerts = () => {
    const newSelected = new Set(filteredNotifications.map(n => n.id));
    setSelectedAlerts(newSelected);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAlerts(new Set());
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-emerald-400" />
              Sensor Alerts
            </h1>
            <p className="text-gray-400">Monitor and manage sensor notifications and alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSettingsClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
              <BellRing className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-xl font-bold text-white">{alertStats.total}</p>
              </div>
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Critical</p>
                <p className="text-xl font-bold text-red-400">{alertStats.critical}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">High</p>
                <p className="text-xl font-bold text-orange-400">{alertStats.high}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Medium</p>
                <p className="text-xl font-bold text-yellow-400">{alertStats.medium}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Low</p>
                <p className="text-xl font-bold text-blue-400">{alertStats.low}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Active</p>
                <p className="text-xl font-bold text-emerald-400">{alertStats.unacknowledged}</p>
              </div>
              <BellRing className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
          </select>

          {/* Show Acknowledged Toggle */}
          <button
            onClick={() => setShowAcknowledged(!showAcknowledged)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${showAcknowledged ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-gray-800 border border-gray-700'}`}
          >
            <Eye className={`w-4 h-4 ${showAcknowledged ? 'text-emerald-400' : 'text-gray-400'}`} />
            <span className={showAcknowledged ? 'text-emerald-400' : 'text-gray-400'}>
              {showAcknowledged ? 'Hide' : 'Show'} Acknowledged
            </span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedAlerts.size > 0 && (
              <>
                <span className="text-sm text-gray-400">
                  {selectedAlerts.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={selectAllVisibleAlerts}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg hover:bg-gray-700"
            >
              Select All
            </button>
            <button
              onClick={acknowledgeAllAlerts}
              className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
              disabled={filteredNotifications.filter(n => !n.acknowledged).length === 0}
            >
              Acknowledge All
            </button>
            <button
              onClick={exportAlerts}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No alerts found</h3>
              <p className="text-gray-500">
                {searchQuery || selectedSeverity !== 'all' || selectedType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All systems are operating normally'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <AlertCard
                key={notification.id}
                notification={notification}
                isSelected={selectedAlerts.has(notification.id)}
                isExpanded={expandedAlert === notification.id}
                onToggleSelect={() => toggleAlertSelection(notification.id)}
                onToggleExpand={() => setExpandedAlert(expandedAlert === notification.id ? null : notification.id)}
                onAcknowledge={() => acknowledgeAlert(notification.id)}
                onDelete={() => deleteAlert(notification.id)}
                getAlertIcon={getAlertIcon}
                getSeverityColor={getSeverityColor}
              />
            ))
          )}
        </div>
      </div>

      {/* Notification Settings Panel */}
      <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-lg max-w-sm">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          Notification Settings
        </h4>
        <div className="space-y-2">
          {Object.entries({
            email: { icon: <Mail className="w-4 h-4" />, label: 'Email' },
            sms: { icon: <Smartphone className="w-4 h-4" />, label: 'SMS' },
            push: { icon: <Bell className="w-4 h-4" />, label: 'Push' },
            desktop: { icon: <Monitor className="w-4 h-4" />, label: 'Desktop' },
            sound: { icon: <Zap className="w-4 h-4" />, label: 'Sound' },
            quiet: { icon: <BellOff className="w-4 h-4" />, label: 'Quiet Mode' }
          }).map(([key, { icon, label }]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{icon}</span>
                <span className="text-sm text-gray-300">{label}</span>
              </div>
              <input
                type="checkbox"
                checked={notificationSettings[key as keyof typeof notificationSettings]}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  [key]: e.target.checked
                }))}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Alert Card Component
interface AlertCardProps {
  notification: NotificationData;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onAcknowledge: () => void;
  onDelete: () => void;
  getAlertIcon: (type: string, severity: AlertSeverity) => React.ReactNode;
  getSeverityColor: (severity: AlertSeverity) => string;
}

const AlertCard: React.FC<AlertCardProps> = ({
  notification,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onAcknowledge,
  onDelete,
  getAlertIcon,
  getSeverityColor
}) => {
  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div
      className={`border rounded-lg transition-all cursor-pointer ${getSeverityColor(notification.severity)} ${
        isSelected ? 'ring-2 ring-emerald-500' : ''
      } ${notification.acknowledged ? 'opacity-60' : ''}`}
      onClick={onToggleExpand}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className="mt-1 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
            />

            {/* Alert Icon */}
            <div className="mt-1">
              {getAlertIcon(notification.type, notification.severity)}
            </div>

            {/* Alert Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                {notification.acknowledged && (
                  <span className="px-2 py-0.5 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 text-xs rounded">
                    Acknowledged
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(notification.timestamp)}
                </span>
                {notification.sensorId && (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Sensor: {notification.sensorId}
                  </span>
                )}
                {notification.roomName && (
                  <span>Room: {notification.roomName}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {!notification.acknowledged && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                className="p-1 text-emerald-400 hover:bg-emerald-900/30 rounded"
                title="Acknowledge"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-red-400 hover:bg-red-900/30 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="p-1 text-gray-400 hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Alert ID</p>
                <p className="text-white font-mono text-xs">{notification.id}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Timestamp</p>
                <p className="text-white">{new Date(notification.timestamp).toLocaleString()}</p>
              </div>
              {notification.data && (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-1">Additional Data</p>
                  <pre className="text-white text-xs bg-gray-900/50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(notification.data, null, 2)}
                  </pre>
                </div>
              )}
              {notification.actions && notification.actions.length > 0 && (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-2">Available Actions</p>
                  <div className="flex gap-2">
                    {notification.actions.map((action, index) => (
                      <button
                        key={index}
                        className={`px-3 py-1 text-xs rounded ${
                          action.style === 'primary' ? 'bg-emerald-600 text-white' :
                          action.style === 'danger' ? 'bg-red-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Action clicked:', action.action);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Monitor icon for settings panel
const Monitor = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default SensorAlerts;