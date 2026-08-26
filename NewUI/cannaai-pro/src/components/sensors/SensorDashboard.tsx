import React, { useState, useMemo, useEffect } from 'react';
import { useSocketContext } from '../../contexts/SocketContext';
import {
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  Sun,
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  Battery,
  MapPin,
  Clock,
  BarChart3,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Eye,
  Filter,
  Search,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Beaker,
  FlaskConical
} from 'lucide-react';

import {
  SensorData,
  SensorConfig,
  RoomConfig,
  SensorAlert,
  NotificationData,
  SensorType
} from './types';
import { alertAPI } from './api';

interface SensorDashboardProps {
  className?: string;
  sensors?: SensorConfig[];
  rooms?: RoomConfig[];
  onRefresh?: () => void;
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ className = '', sensors = [], rooms = [], onRefresh }) => {
  const { lastSensorData, isConnected, notifications } = useSocketContext();

  // State management
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAlerts, setShowAlerts] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [acknowledgedNotificationIds, setAcknowledgedNotificationIds] = useState<Set<string>>(new Set());
  const sensorConfigs = sensors;
  const roomConfigs = rooms;

  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const interval = window.setInterval(onRefresh, 30000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const handleAutoRefreshToggle = () => {
    setAutoRefresh((enabled) => {
      const nextEnabled = !enabled;
      if (nextEnabled) onRefresh?.();
      return nextEnabled;
    });
  };

  // Calculate sensor health and statistics
  const sensorStats = useMemo(() => {
    const activeSensors = sensorConfigs.filter(s => s.enabled);
    const onlineSensors = activeSensors.filter(sensor => {
      const latest = sensor.dataHistory.at(-1)?.timestamp;
      return Boolean(latest && Date.now() - new Date(latest).getTime() <= 5 * 60 * 1000);
    }).length;
    const offlineSensors = activeSensors.length - onlineSensors;
    const calibrationDue = activeSensors.filter(s =>
      s.calibration && new Date(s.calibration.nextCalibrationDue) <= new Date()
    ).length;

    return {
      total: activeSensors.length,
      online: onlineSensors,
      offline: offlineSensors,
      calibrationDue,
      batteryLow: activeSensors.filter(s => s.batteryLevel && s.batteryLevel < 20).length
    };
  }, [sensorConfigs]);

  // Filter sensors based on search and room selection
  const filteredSensors = useMemo(() => {
    return sensorConfigs.filter(sensor => {
      const matchesSearch = searchQuery === '' ||
        sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sensor.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sensor.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRoom = selectedRoom === 'all' || sensor.roomName === selectedRoom;

      return matchesSearch && matchesRoom;
    });
  }, [sensorConfigs, searchQuery, selectedRoom]);

  // Get sensor value from last sensor data
  const getSensorValue = (sensorType: SensorType): number | string => {
    if (!lastSensorData) return '--';

    const format = (value: unknown, suffix = '') =>
      typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '--';
    const formatDecimal = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '--';

    switch (sensorType) {
      case 'temperature': return format(lastSensorData.temperature, '°F');
      case 'humidity': return format(lastSensorData.humidity, '%');
      case 'ph': return formatDecimal(lastSensorData.ph ?? lastSensorData.pH);
      case 'ec': return formatDecimal(lastSensorData.ec ?? lastSensorData.EC);
      case 'co2': return format(lastSensorData.co2 ?? lastSensorData.CO2, ' ppm');
      case 'vpd': return formatDecimal(lastSensorData.vpd ?? lastSensorData.VPD);
      case 'soil_moisture': return format(lastSensorData.soilMoisture, '%');
      case 'light_intensity': return format(lastSensorData.lightIntensity, ' PPFD');
      default: return '--';
    }
  };

  // Get sensor icon
  const getSensorIcon = (sensorType: SensorType) => {
    switch (sensorType) {
      case 'temperature': return <Thermometer className="w-5 h-5" />;
      case 'humidity': return <Droplets className="w-5 h-5" />;
      case 'ph': return <Beaker className="w-5 h-5" />;
      case 'ec': return <Gauge className="w-5 h-5" />;
      case 'co2': return <Wind className="w-5 h-5" />;
      case 'vpd': return <Activity className="w-5 h-5" />;
      case 'soil_moisture': return <Droplets className="w-5 h-5" />;
      case 'light_intensity': return <Sun className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  // Get sensor color
  const getSensorColor = (sensorType: SensorType) => {
    switch (sensorType) {
      case 'temperature': return 'text-orange-400';
      case 'humidity': return 'text-blue-400';
      case 'ph': return 'text-cyan-400';
      case 'ec': return 'text-purple-400';
      case 'co2': return 'text-emerald-400';
      case 'vpd': return 'text-yellow-400';
      case 'soil_moisture': return 'text-blue-500';
      case 'light_intensity': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  // Check if sensor has active alerts
  const hasActiveAlerts = (sensor: SensorConfig): boolean => {
    return sensor.alerts.some(alert => alert.enabled);
  };

  // Get connection status color
  const getConnectionStatusColor = (sensor: SensorConfig) => {
    if (!sensor.enabled) return 'bg-gray-500';
    const latest = sensor.dataHistory.at(-1)?.timestamp;
    if (!latest) return 'bg-gray-500';
    const ageMs = Date.now() - new Date(latest).getTime();
    if (ageMs <= 5 * 60 * 1000) return 'bg-emerald-500';
    if (ageMs <= 60 * 60 * 1000) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get battery status color
  const getBatteryStatusColor = (level?: number) => {
    if (!level) return 'bg-gray-500';
    if (level > 50) return 'bg-emerald-500';
    if (level > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const exportSensors = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sensors: filteredSensors, rooms: roomConfigs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sensor Monitoring</h1>
            <p className="text-gray-400">Real-time environmental monitoring and control</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
              {isConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
              <span className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoRefreshToggle}
              aria-label={autoRefresh ? 'Disable sensor auto refresh' : 'Enable sensor auto refresh'}
              aria-pressed={autoRefresh}
              className={`p-2 rounded-lg ${autoRefresh ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-gray-800 border border-gray-700'}`}
              title="Auto Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'text-emerald-400 animate-spin' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Sensors</p>
                <p className="text-2xl font-bold text-white">{sensorStats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online</p>
                <p className="text-2xl font-bold text-emerald-400">{sensorStats.online}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Calibration Due</p>
                <p className="text-2xl font-bold text-yellow-400">{sensorStats.calibrationDue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold text-red-400">{notifications.filter(n => !n.acknowledged && !acknowledgedNotificationIds.has(n.id)).length}</p>
              </div>
              <Bell className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Room Filter */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Rooms</option>
            {roomConfigs.map(room => (
              <option key={room.id} value={room.name}>{room.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search sensors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* View Mode */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg">
            <button
              type="button"
              aria-label="Switch to sensor grid view"
              title="Grid view"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Switch to sensor list view"
              title="List view"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Show Alerts Toggle */}
          <button
            type="button"
            aria-pressed={showAlerts}
            onClick={() => setShowAlerts(!showAlerts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${showAlerts ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-gray-800 border border-gray-700'}`}
          >
            {showAlerts ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
            <span className={showAlerts ? 'text-emerald-400' : 'text-gray-400'}>Alerts</span>
          </button>

          {/* Export Button */}
          <button type="button" onClick={exportSensors} aria-label="Export sensor dashboard" className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Alerts Section */}
        {showAlerts && notifications.filter(n => !n.acknowledged && !acknowledgedNotificationIds.has(n.id)).length > 0 && (
          <div className="mb-6 bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {notifications.filter(n => !n.acknowledged && !acknowledgedNotificationIds.has(n.id)).slice(0, 3).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border-l-4 border-l-yellow-400">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                      <p className="text-xs text-gray-400">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{new Date(notification.timestamp).toLocaleTimeString()}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        setAcknowledgedNotificationIds((current) => new Set(current).add(notification.id));
                        try {
                          await alertAPI.acknowledgeNotification(notification.id);
                        } catch (error) {
                          setAcknowledgedNotificationIds((current) => {
                            const next = new Set(current);
                            next.delete(notification.id);
                            return next;
                          });
                          console.error('Failed to acknowledge notification:', error);
                        }
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensors Grid/List */}
        {filteredSensors.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3 text-gray-500" />
            <h3 className="text-lg font-medium text-white">No sensor data available</h3>
            <p className="mt-2 text-sm text-gray-400">
              Connect a sensor agent or create a sensor configuration to view live readings.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSensors.map((sensor) => (
              <SensorCard
                key={sensor.id}
                sensor={sensor}
                value={getSensorValue(sensor.type)}
                icon={getSensorIcon(sensor.type)}
                color={getSensorColor(sensor.type)}
                connectionStatus={getConnectionStatusColor(sensor)}
                batteryStatus={getBatteryStatusColor(sensor.batteryLevel)}
                hasAlerts={hasActiveAlerts(sensor)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sensor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Battery</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredSensors.map((sensor) => (
                  <SensorTableRow
                    key={sensor.id}
                    sensor={sensor}
                    value={getSensorValue(sensor.type)}
                    icon={getSensorIcon(sensor.type)}
                    color={getSensorColor(sensor.type)}
                    connectionStatus={getConnectionStatusColor(sensor)}
                    batteryStatus={getBatteryStatusColor(sensor.batteryLevel)}
                    hasAlerts={hasActiveAlerts(sensor)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Sensor Card Component
interface SensorCardProps {
  sensor: SensorConfig;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  connectionStatus: string;
  batteryStatus: string;
  hasAlerts: boolean;
}

const SensorCard: React.FC<SensorCardProps> = ({
  sensor,
  value,
  icon,
  color,
  connectionStatus,
  batteryStatus,
  hasAlerts
}) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gray-900 ${color}`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{sensor.name}</h4>
            <p className="text-xs text-gray-400">{sensor.type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`w-2 h-2 rounded-full ${connectionStatus}`} />
          {sensor.batteryLevel && (
            <div className="flex items-center gap-1">
              <Battery className="w-3 h-3 text-gray-400" />
              <div className={`w-1.5 h-3 rounded-full ${batteryStatus}`} />
            </div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-gray-500" />
          <p className="text-xs text-gray-500">{sensor.location}</p>
        </div>
      </div>

      {hasAlerts && (
        <div className="flex items-center gap-1 text-yellow-400">
          <AlertTriangle className="w-3 h-3" />
          <span className="text-xs">Alerts Active</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
        <span className="text-xs text-gray-500">{sensor.roomName}</span>
        <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
      </div>
    </div>
  );
};

// Sensor Table Row Component
interface SensorTableRowProps {
  sensor: SensorConfig;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  connectionStatus: string;
  batteryStatus: string;
  hasAlerts: boolean;
}

const SensorTableRow: React.FC<SensorTableRowProps> = ({
  sensor,
  value,
  icon,
  color,
  connectionStatus,
  batteryStatus,
  hasAlerts
}) => {
  return (
    <tr className="hover:bg-gray-900/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{sensor.name}</p>
            <p className="text-xs text-gray-400">{sensor.model || 'Unknown'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-300">{sensor.type.replace('_', ' ')}</span>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">
          <p className="text-gray-300">{sensor.location}</p>
          <p className="text-xs text-gray-500">{sensor.roomName}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-lg font-medium ${color}`}>{value}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionStatus}`} />
          <span className="text-xs text-gray-400">
            {!sensor.enabled
              ? 'Disabled'
              : connectionStatus === 'bg-emerald-500'
                ? 'Online'
                : 'No recent data'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        {sensor.batteryLevel ? (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-6 rounded-full ${batteryStatus}`} />
            <span className="text-xs text-gray-400">{sensor.batteryLevel}%</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">--</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {hasAlerts && (
            <AlertTriangle className="w-4 h-4 text-yellow-400" aria-label="Alerts Active" />
          )}
          <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
          <Eye className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
        </div>
      </td>
    </tr>
  );
};

export default SensorDashboard;
