import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Wifi,
  WifiOff,
  Battery,
  AlertTriangle,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Layers,
  Filter,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Beaker,
  Gauge,
  Activity,
  Home,
  Ruler,
  Users,
  Sprout,
  Flower,
  TreePine,
  Package
} from 'lucide-react';

import {
  RoomConfig,
  SensorConfig,
  SensorType,
  SensorData,
  SystemHealth
} from './types';

interface SensorMapProps {
  className?: string;
  rooms?: RoomConfig[];
  sensors?: SensorConfig[];
  onRoomSelect?: (roomId: string) => void;
  onSensorSelect?: (sensorId: string) => void;
  onSensorMove?: (sensorId: string, x: number, y: number) => void;
}

const SensorMap: React.FC<SensorMapProps> = ({
  className = '',
  rooms = [],
  sensors = [],
  onRoomSelect,
  onSensorSelect,
  onSensorMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>('map');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sensorPositions, setSensorPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'alert'>('all');
  const [filterType, setFilterType] = useState<SensorType | 'all'>('all');
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(false);

  // Initialize sensor positions
  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    sensors.forEach((sensor, index) => {
      // Generate initial positions in a grid pattern
      const roomIndex = rooms.findIndex(r => r.name === sensor.roomName);
      const roomX = (roomIndex % 3) * 250;
      const roomY = Math.floor(roomIndex / 3) * 200;

      positions[sensor.id] = {
        x: roomX + (index % 2) * 100 + 50,
        y: roomY + Math.floor(index / 2) * 60 + 50
      };
    });
    setSensorPositions(positions);
  }, [sensors, rooms]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode !== 'map') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoomLevel, zoomLevel);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw rooms
    rooms.forEach((room, index) => {
      const roomX = (index % 3) * 250;
      const roomY = Math.floor(index / 3) * 200;
      const roomWidth = 200;
      const roomHeight = 150;

      // Room background
      ctx.fillStyle = room.active ? '#1f2937' : '#111827';
      ctx.strokeStyle = room.active ? '#10b981' : '#6b7280';
      ctx.lineWidth = selectedRoom === room.id ? 3 : 2;

      ctx.fillRect(roomX, roomY, roomWidth, roomHeight);
      ctx.strokeRect(roomX, roomY, roomWidth, roomHeight);

      // Room label
      ctx.fillStyle = '#f3f4f6';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(room.name, roomX + roomWidth / 2, roomY + 20);

      // Room details
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`${room.sensors.length} sensors`, roomX + roomWidth / 2, roomY + 40);

      if (room.plantCount) {
        ctx.fillText(`${room.plantCount} plants`, roomX + roomWidth / 2, roomY + 55);
      }

      // Growth stage icon
      const stageIcon = room.growthStage === 'vegetative' ? '🌿' :
                       room.growthStage === 'flowering' ? '🌸' :
                       room.growthStage === 'propagation' ? '🌱' : '🌾';
      ctx.font = '20px sans-serif';
      ctx.fillText(stageIcon, roomX + roomWidth - 30, roomY + 30);
    });

    // Draw sensor connections
    if (showConnections) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      sensors.forEach(sensor => {
        const roomIndex = rooms.findIndex(r => r.name === sensor.roomName);
        if (roomIndex === -1) return;

        const roomX = (roomIndex % 3) * 250 + 100;
        const roomY = Math.floor(roomIndex / 3) * 200 + 75;
        const sensorPos = sensorPositions[sensor.id];

        if (sensorPos) {
          ctx.beginPath();
          ctx.moveTo(roomX, roomY);
          ctx.lineTo(sensorPos.x, sensorPos.y);
          ctx.stroke();
        }
      });

      ctx.setLineDash([]);
    }

    // Draw sensors
    sensors.forEach(sensor => {
      const pos = sensorPositions[sensor.id];
      if (!pos) return;

      const isSelected = selectedSensor === sensor.id;
      const isHovered = hoveredSensor === sensor.id;
      const isOnline = sensor.enabled;
      const hasAlert = sensor.alerts.some(a => a.enabled);

      // Sensor circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered || isSelected ? 12 : 8, 0, Math.PI * 2);

      // Color based on sensor type and status
      if (hasAlert) {
        ctx.fillStyle = '#ef4444';
      } else if (isOnline) {
        const colors = {
          temperature: '#f59e0b',
          humidity: '#3b82f6',
          ph: '#06b6d4',
          ec: '#8b5cf6',
          co2: '#10b981',
          vpd: '#f97316',
          soil_moisture: '#0ea5e9',
          light_intensity: '#eab308'
        };
        ctx.fillStyle = colors[sensor.type as keyof typeof colors] || '#6b7280';
      } else {
        ctx.fillStyle = '#4b5563';
      }

      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? '#10b981' : '#374151';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.stroke();

      // Sensor icon/text
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const icons = {
        temperature: 'T',
        humidity: 'H',
        ph: 'pH',
        ec: 'EC',
        co2: 'CO₂',
        vpd: 'VPD',
        soil_moisture: 'SM',
        light_intensity: 'L'
      };

      ctx.fillText(icons[sensor.type as keyof typeof icons] || 'S', pos.x, pos.y);

      // Label
      if (showLabels && (isHovered || isSelected)) {
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(pos.x - 40, pos.y + 15, 80, 20);
        ctx.fillStyle = '#f3f4f6';
        ctx.font = '11px sans-serif';
        ctx.fillText(sensor.name, pos.x, pos.y + 25);
      }
    });

    ctx.restore();
  }, [rooms, sensors, sensorPositions, selectedRoom, selectedSensor, hoveredSensor, zoomLevel, pan, showGrid, showLabels, showConnections, viewMode]);

  // Handle mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoomLevel;
    const y = (e.clientY - rect.top - pan.y) / zoomLevel;

    // Check if clicking on a sensor
    let clickedSensor: string | null = null;
    for (const [sensorId, pos] of Object.entries(sensorPositions)) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance <= 12) {
        clickedSensor = sensorId;
        break;
      }
    }

    if (clickedSensor) {
      setSelectedSensor(clickedSensor);
      onSensorSelect?.(clickedSensor);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoomLevel;
    const y = (e.clientY - rect.top - pan.y) / zoomLevel;

    // Check if hovering over a sensor
    let hoveredSensorFound: string | null = null;
    for (const [sensorId, pos] of Object.entries(sensorPositions)) {
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance <= 12) {
        hoveredSensorFound = sensorId;
        break;
      }
    }

    setHoveredSensor(hoveredSensorFound);

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  // Get sensor icon
  const getSensorIcon = (type: SensorType) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-4 h-4" />;
      case 'humidity': return <Droplets className="w-4 h-4" />;
      case 'ph': return <Beaker className="w-4 h-4" />;
      case 'ec': return <Gauge className="w-4 h-4" />;
      case 'co2': return <Wind className="w-4 h-4" />;
      case 'vpd': return <Activity className="w-4 h-4" />;
      case 'soil_moisture': return <Droplets className="w-4 h-4" />;
      case 'light_intensity': return <Sun className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Filter sensors
  const filteredSensors = sensors.filter(sensor => {
    // Status filter
    if (filterStatus === 'online' && !sensor.enabled) return false;
    if (filterStatus === 'offline' && sensor.enabled) return false;
    if (filterStatus === 'alert' && !sensor.alerts.some(a => a.enabled)) return false;

    // Type filter
    if (filterType !== 'all' && sensor.type !== filterType) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return sensor.name.toLowerCase().includes(query) ||
             sensor.type.toLowerCase().includes(query) ||
             sensor.location.toLowerCase().includes(query) ||
             sensor.roomName.toLowerCase().includes(query);
    }

    return true;
  });

  // Group sensors by room
  const sensorsByRoom = filteredSensors.reduce((acc, sensor) => {
    if (!acc[sensor.roomName]) {
      acc[sensor.roomName] = [];
    }
    acc[sensor.roomName].push(sensor);
    return acc;
  }, {} as Record<string, typeof sensors>);

  return (
    <div className={`flex-1 overflow-y-auto p-6 bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-emerald-400" />
              Sensor Location Map
            </h1>
            <p className="text-gray-400">Visual sensor placement and room management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetView}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg">
            {(['map', 'list', 'grid'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-2 px-4 py-2 capitalize first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'map' ? <Layers className="w-4 h-4" /> :
                 mode === 'list' ? <Grid className="w-4 h-4" /> :
                 <Grid className="w-4 h-4" />}
                {mode}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sensors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="alert">Alerts</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="ph">pH</option>
              <option value="ec">EC</option>
              <option value="co2">CO2</option>
              <option value="vpd">VPD</option>
              <option value="soil_moisture">Soil Moisture</option>
              <option value="light_intensity">Light</option>
            </select>
          </div>

          {/* View Options */}
          {viewMode === 'map' && (
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-emerald-500"
                />
                Grid
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-emerald-500"
                />
                Labels
              </label>
              <label className="flex items-center gap-2 text-gray-400">
                <input
                  type="checkbox"
                  checked={showConnections}
                  onChange={(e) => setShowConnections(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-emerald-500"
                />
                Connections
              </label>
            </div>
          )}
        </div>

        {/* Main Content */}
        {viewMode === 'map' ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full cursor-move bg-gray-900 rounded-lg"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
            {hoveredSensor && (
              <div className="absolute top-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-xs">
                {(() => {
                  const sensor = sensors.find(s => s.id === hoveredSensor);
                  if (!sensor) return null;
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getSensorIcon(sensor.type)}
                        <span className="font-medium text-white">{sensor.name}</span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>Type: {sensor.type}</p>
                        <p>Location: {sensor.location}</p>
                        <p>Room: {sensor.roomName}</p>
                        <p>Status: {sensor.enabled ? 'Online' : 'Offline'}</p>
                        {sensor.batteryLevel && (
                          <p>Battery: {sensor.batteryLevel}%</p>
                        )}
                        {sensor.signalStrength && (
                          <p>Signal: {sensor.signalStrength} dBm</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {Object.entries(sensorsByRoom).map(([roomName, roomSensors]) => (
              <div key={roomName} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-400" />
                  {roomName}
                  <span className="text-sm text-gray-400">({roomSensors.length} sensors)</span>
                </h3>
                <div className="space-y-2">
                  {roomSensors.map(sensor => (
                    <div
                      key={sensor.id}
                      className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 cursor-pointer"
                      onClick={() => {
                        setSelectedSensor(sensor.id);
                        onSensorSelect?.(sensor.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {getSensorIcon(sensor.type)}
                        <div>
                          <p className="text-sm font-medium text-white">{sensor.name}</p>
                          <p className="text-xs text-gray-400">{sensor.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sensor.enabled ? (
                          <Wifi className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                        {sensor.batteryLevel && (
                          <div className="flex items-center gap-1">
                            <Battery className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">{sensor.batteryLevel}%</span>
                          </div>
                        )}
                        {sensor.alerts.some(a => a.enabled) && (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        )}
                        <Settings className="w-4 h-4 text-gray-400 hover:text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSensors.map(sensor => (
              <div
                key={sensor.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 cursor-pointer"
                onClick={() => {
                  setSelectedSensor(sensor.id);
                  onSensorSelect?.(sensor.id);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gray-900 rounded-lg">
                      {getSensorIcon(sensor.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{sensor.name}</h4>
                      <p className="text-xs text-gray-400">{sensor.type}</p>
                    </div>
                  </div>
                  {sensor.enabled ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>{sensor.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Home className="w-3 h-3" />
                    <span>{sensor.roomName}</span>
                  </div>
                  {sensor.batteryLevel && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Battery className="w-3 h-3" />
                      <span>{sensor.batteryLevel}%</span>
                    </div>
                  )}
                </div>
                {sensor.alerts.some(a => a.enabled) && (
                  <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Alerts Active</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorMap;