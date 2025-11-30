// Main Sensors Component - Comprehensive Sensor Monitoring System
import React, { useState, useEffect } from 'react';
import { useSocketContext } from '../../contexts/SocketContext';

// Import all sensor components
import SensorDashboard from './SensorDashboard';
import SensorConfiguration from './SensorConfig';
import SensorAlerts from './SensorAlerts';
import SensorAnalytics from './SensorAnalytics';
import SensorMap from './SensorMap';
import sensorAPI from './api';

// Import types
import {
  SensorConfig,
  RoomConfig,
  SensorData,
  SensorAlert,
  NotificationData,
  SystemHealth
} from './types';

import {
  Activity,
  BarChart3,
  MapPin,
  Bell,
  Settings,
  Plus,
  AlertTriangle,
  TrendingUp,
  Wifi,
  Battery,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Beaker,
  Gauge
} from 'lucide-react';

interface SensorsProps {
  className?: string;
  initialView?: 'dashboard' | 'config' | 'alerts' | 'analytics' | 'map';
}

const Sensors: React.FC<SensorsProps> = ({
  className = '',
  initialView = 'dashboard'
}) => {
  const { lastSensorData, isConnected } = useSocketContext();

  // State management
  const [activeView, setActiveView] = useState<'dashboard' | 'config' | 'alerts' | 'analytics' | 'map'>(initialView);
  const [sensors, setSensors] = useState<SensorConfig[]>([]);
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<SensorConfig | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load sensors and rooms in parallel
      const [sensorsData, roomsData] = await Promise.all([
        sensorAPI.sensors.getSensors().catch(() => []),
        sensorAPI.rooms.getRooms().catch(() => [])
      ]);

      setSensors(sensorsData);
      setRooms(roomsData);

      // Load system health
      try {
        const healthData = await sensorAPI.system.getSystemHealth();
        setSystemHealth(healthData);
      } catch (err) {
        console.warn('Failed to load system health:', err);
      }

    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load sensor data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sensor configuration save
  const handleSensorSave = async (sensor: SensorConfig) => {
    try {
      if (selectedSensor) {
        // Update existing sensor
        await sensorAPI.sensors.updateSensor(sensor.id, sensor);
        setSensors(prev => prev.map(s => s.id === sensor.id ? sensor : s));
      } else {
        // Create new sensor
        const newSensor = await sensorAPI.sensors.createSensor(sensor);
        setSensors(prev => [...prev, newSensor]);
      }
      setSelectedSensor(null);
      setActiveView('dashboard');
    } catch (err) {
      console.error('Failed to save sensor:', err);
      setError('Failed to save sensor configuration.');
    }
  };

  // Handle sensor deletion
  const handleSensorDelete = async (sensorId: string) => {
    try {
      await sensorAPI.sensors.deleteSensor(sensorId);
      setSensors(prev => prev.filter(s => s.id !== sensorId));
      if (selectedSensor?.id === sensorId) {
        setSelectedSensor(null);
      }
    } catch (err) {
      console.error('Failed to delete sensor:', err);
      setError('Failed to delete sensor.');
    }
  };

  // Handle room selection
  const handleRoomSelect = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      // You could add room-specific view here
      console.log('Selected room:', room);
    }
  };

  // Handle sensor selection
  const handleSensorSelect = (sensorId: string) => {
    const sensor = sensors.find(s => s.id === sensorId);
    if (sensor) {
      setSelectedSensor(sensor);
      setActiveView('config');
    }
  };

  // Navigation items
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Activity className="w-5 h-5" />,
      description: 'Real-time sensor monitoring'
    },
    {
      id: 'map',
      label: 'Map',
      icon: <MapPin className="w-5 h-5" />,
      description: 'Sensor location view'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Historical data analysis'
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-5 h-5" />,
      description: 'Notifications and warnings'
    },
    {
      id: 'config',
      label: 'Configuration',
      icon: <Settings className="w-5 h-5" />,
      description: 'Sensor management'
    }
  ];

  // Sensor statistics
  const sensorStats = {
    total: sensors.length,
    online: sensors.filter(s => s.enabled).length,
    offline: sensors.filter(s => !s.enabled).length,
    alerts: sensors.filter(s => s.alerts.some(a => a.enabled)).length
  };

  // Get sensor type counts
  const sensorTypeCounts = sensors.reduce((acc, sensor) => {
    acc[sensor.type] = (acc[sensor.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get sensor type icon
  const getSensorTypeIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-4 h-4 text-orange-400" />;
      case 'humidity': return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'ph': return <Beaker className="w-4 h-4 text-cyan-400" />;
      case 'ec': return <Gauge className="w-4 h-4 text-purple-400" />;
      case 'co2': return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'light_intensity': return <Sun className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center">
          <Activity className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading sensor system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Sensor System</h1>
                <p className="text-sm text-gray-400">Environmental monitoring and control</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6 ml-8">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{sensorStats.total} sensors</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-300">{sensorStats.online} online</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">{sensorStats.alerts} alerts</span>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1 rounded ${isConnected ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={`text-sm ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSensor(null);
                setActiveView('config');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Add Sensor
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          {/* Sensor Type Distribution */}
          <div className="flex items-center gap-2 ml-auto">
            {Object.entries(sensorTypeCounts).slice(0, 4).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded">
                {getSensorTypeIcon(type)}
                <span className="text-xs text-gray-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <SensorDashboard />
        )}

        {activeView === 'map' && (
          <SensorMap
            rooms={rooms}
            sensors={sensors}
            onRoomSelect={handleRoomSelect}
            onSensorSelect={handleSensorSelect}
          />
        )}

        {activeView === 'analytics' && (
          <SensorAnalytics
            rooms={rooms}
            sensors={sensors}
          />
        )}

        {activeView === 'alerts' && (
          <SensorAlerts
            sensors={sensors}
            onSettingsClick={() => setActiveView('config')}
          />
        )}

        {activeView === 'config' && (
          <div className="h-full overflow-y-auto p-6">
            {selectedSensor ? (
              <SensorConfiguration
                sensor={selectedSensor}
                onSave={handleSensorSave}
                onCancel={() => {
                  setSelectedSensor(null);
                  setActiveView('dashboard');
                }}
                rooms={rooms}
              />
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Sensor Configuration</h2>
                    <p className="text-gray-400">Manage and configure your sensor network</p>
                  </div>
                  <button
                    onClick={() => setSelectedSensor({
                      id: '',
                      name: '',
                      type: 'temperature',
                      location: '',
                      roomName: rooms[0]?.name || '',
                      enabled: true,
                      alerts: [],
                      dataHistory: []
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Sensor
                  </button>
                </div>

                {/* Sensors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sensors.map((sensor) => (
                    <div
                      key={sensor.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 cursor-pointer"
                      onClick={() => setSelectedSensor(sensor)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getSensorTypeIcon(sensor.type)}
                          <div>
                            <h4 className="text-sm font-medium text-white">{sensor.name}</h4>
                            <p className="text-xs text-gray-400">{sensor.type}</p>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${sensor.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      </div>
                      <div className="space-y-1 text-xs text-gray-400">
                        <p>Location: {sensor.location}</p>
                        <p>Room: {sensor.roomName}</p>
                        {sensor.batteryLevel && <p>Battery: {sensor.batteryLevel}%</p>}
                      </div>
                      {sensor.alerts.some(a => a.enabled) && (
                        <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Alerts configured</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {sensors.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No sensors configured</h3>
                    <p className="text-gray-500 mb-4">Add your first sensor to start monitoring</p>
                    <button
                      onClick={() => setSelectedSensor({
                        id: '',
                        name: '',
                        type: 'temperature',
                        location: '',
                        roomName: rooms[0]?.name || '',
                        enabled: true,
                        alerts: [],
                        dataHistory: []
                      })}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Add First Sensor
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sensors;

// Export individual components
export {
  SensorDashboard,
  SensorConfiguration,
  SensorAlerts,
  SensorAnalytics,
  SensorMap,
  sensorAPI
};

// Export types
export type {
  SensorConfig,
  RoomConfig,
  SensorData,
  SensorAlert,
  NotificationData,
  SystemHealth,
  SensorType,
  AlertSeverity,
  AlertType,
  CalibrationPoint,
  SensorCalibration,
  SensorMaintenance
} from './types';