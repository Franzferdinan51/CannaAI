import React, { useState, useEffect, useMemo } from 'react';
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
  SystemHealth,
  SensorType
} from './types';

interface SensorDashboardProps {
  className?: string;
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ className = '' }) => {
  const { lastSensorData, isConnected, notifications, clearNotifications } = useSocketContext();

  // State management
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAlerts, setShowAlerts] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    sensors: { total: 0, online: 0, offline: 0, calibrationDue: 0 },
    connectivity: { socket: isConnected, database: true, externalApis: {} },
    lastUpdate: new Date().toISOString()
  });

  // Mock sensor configurations (would come from API/database)
  const [sensorConfigs] = useState<SensorConfig[]>([
    {
      id: 'temp_001',
      name: 'Temperature Sensor A1',
      type: 'temperature',
      location: 'Canopy Level',
      roomName: 'Main Flower Room',
      enabled: true,
      alerts: [
        {
          id: 'temp_high',
          type: 'threshold',
          condition: { operator: 'gt', value: 85 },
          enabled: true,
          severity: 'high',
          message: 'Temperature exceeds safe limit',
          actions: [{ type: 'notification', config: {} }],
          cooldownMinutes: 15
        }
      ],
      dataHistory: [],
      batteryLevel: 87,
      signalStrength: -45,
      lastMaintenance: '2024-01-15T10:00:00Z',
      nextMaintenanceDue: '2024-02-15T10:00:00Z',
      firmwareVersion: '2.1.3',
      manufacturer: 'SensorTech',
      model: 'ST-TEMP-V2',
      serialNumber: 'ST2024001'
    },
    {
      id: 'humid_001',
      name: 'Humidity Sensor B1',
      type: 'humidity',
      location: 'Center Room',
      roomName: 'Main Flower Room',
      enabled: true,
      alerts: [],
      dataHistory: [],
      batteryLevel: 92,
      signalStrength: -52
    },
    {
      id: 'ph_001',
      name: 'pH Sensor C1',
      type: 'ph',
      location: 'Reservoir',
      roomName: 'Main Flower Room',
      enabled: true,
      alerts: [
        {
          id: 'ph_low',
          type: 'range',
          condition: { operator: 'outside', value: [5.8, 6.8] },
          enabled: true,
          severity: 'medium',
          message: 'pH level out of optimal range',
          actions: [{ type: 'notification', config: {} }],
          cooldownMinutes: 30
        }
      ],
      dataHistory: [],
      calibration: {
        offset: 0.02,
        slope: 1.01,
        lastCalibrated: '2024-01-10T14:00:00Z',
        nextCalibrationDue: '2024-02-10T14:00:00Z',
        calibrationPoints: [
          { expectedValue: 4.0, actualValue: 4.02, timestamp: '2024-01-10T14:00:00Z' },
          { expectedValue: 7.0, actualValue: 7.01, timestamp: '2024-01-10T14:05:00Z' },
          { expectedValue: 10.0, actualValue: 9.98, timestamp: '2024-01-10T14:10:00Z' }
        ]
      }
    }
  ]);

  // Mock room configurations
  const [roomConfigs] = useState<RoomConfig[]>([
    {
      id: 'room_1',
      name: 'Main Flower Room',
      active: true,
      targetEnvironment: {
        temperature: { min: 68, max: 78 },
        humidity: { min: 45, max: 55 },
        co2: { min: 1000, max: 1400 },
        vpd: { min: 0.8, max: 1.2 },
        ph: { min: 5.8, max: 6.8 },
        ec: { min: 1.2, max: 1.8 }
      },
      sensors: ['temp_001', 'humid_001', 'ph_001'],
      automation: {
        watering: { enabled: true, threshold: 35, schedule: '0 6,18 * * *', duration: 15, zones: [] },
        lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *', intensity: 75 },
        climate: { enabled: true, tempMin: 68, tempMax: 78, humidityMin: 45, humidityMax: 55, circulation: true, ventilation: true, heating: false, cooling: true },
        co2: { enabled: true, target: 1200, tolerance: 100, schedule: '0 6-18 * * *' }
      },
      area: 200,
      height: 8,
      plantCount: 24,
      growthStage: 'flowering'
    },
    {
      id: 'room_2',
      name: 'Veg Room',
      active: false,
      targetEnvironment: {
        temperature: { min: 70, max: 80 },
        humidity: { min: 60, max: 70 },
        co2: { min: 800, max: 1200 },
        vpd: { min: 0.7, max: 1.1 },
        ph: { min: 5.5, max: 6.5 },
        ec: { min: 1.0, max: 1.6 }
      },
      sensors: [],
      automation: {
        watering: { enabled: true, threshold: 40, schedule: '0 7,19 * * *', duration: 10, zones: [] },
        lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *', intensity: 80 },
        climate: { enabled: true, tempMin: 70, tempMax: 80, humidityMin: 60, humidityMax: 70, circulation: true, ventilation: true, heating: false, cooling: false },
        co2: { enabled: false, target: 1000, tolerance: 150, schedule: '0 6-18 * * *' }
      },
      area: 150,
      height: 6,
      plantCount: 36,
      growthStage: 'vegetative'
    }
  ]);

  // Calculate sensor health and statistics
  const sensorStats = useMemo(() => {
    const activeSensors = sensorConfigs.filter(s => s.enabled);
    const onlineSensors = activeSensors.length; // All enabled sensors considered online for demo
    const offlineSensors = 0;
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

    switch (sensorType) {
      case 'temperature': return `${Math.round(lastSensorData.temperature)}°F`;
      case 'humidity': return `${Math.round(lastSensorData.humidity)}%`;
      case 'ph': return lastSensorData.ph.toFixed(2);
      case 'ec': return lastSensorData.ec.toFixed(2);
      case 'co2': return `${Math.round(lastSensorData.co2)} ppm`;
      case 'vpd': return lastSensorData.vpd.toFixed(2);
      case 'soil_moisture': return `${Math.round(lastSensorData.soilMoisture || 0)}%`;
      case 'light_intensity': return `${Math.round(lastSensorData.lightIntensity || 0)} PPFD`;
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
    if (sensor.signalStrength && sensor.signalStrength > -60) return 'bg-emerald-500';
    if (sensor.signalStrength && sensor.signalStrength > -80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get battery status color
  const getBatteryStatusColor = (level?: number) => {
    if (!level) return 'bg-gray-500';
    if (level > 50) return 'bg-emerald-500';
    if (level > 20) return 'bg-yellow-500';
    return 'bg-red-500';
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
              onClick={() => setAutoRefresh(!autoRefresh)}
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
                <p className="text-2xl font-bold text-red-400">{notifications.filter(n => !n.acknowledged).length}</p>
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
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Show Alerts Toggle */}
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${showAlerts ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-gray-800 border border-gray-700'}`}
          >
            {showAlerts ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
            <span className={showAlerts ? 'text-emerald-400' : 'text-gray-400'}>Alerts</span>
          </button>

          {/* Export Button */}
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Alerts Section */}
        {showAlerts && notifications.length > 0 && (
          <div className="mb-6 bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification) => (
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
                    <button className="text-xs text-emerald-400 hover:text-emerald-300">Acknowledge</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensors Grid/List */}
        {viewMode === 'grid' ? (
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
            {sensor.enabled ? 'Online' : 'Offline'}
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
            <AlertTriangle className="w-4 h-4 text-yellow-400" title="Alerts Active" />
          )}
          <Settings className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
          <Eye className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
        </div>
      </td>
    </tr>
  );
};

export default SensorDashboard;