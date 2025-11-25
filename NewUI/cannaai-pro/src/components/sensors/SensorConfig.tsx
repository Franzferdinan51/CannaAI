import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Zap,
  Battery,
  Wifi,
  Beaker,
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  Download,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

import {
  SensorConfig,
  SensorType,
  SensorAlert,
  AlertType,
  AlertSeverity,
  AlertCondition,
  SensorCalibration,
  CalibrationPoint,
  SensorMaintenance,
  RoomConfig
} from './types';

interface SensorConfigProps {
  sensor?: SensorConfig;
  onSave: (sensor: SensorConfig) => void;
  onCancel: () => void;
  rooms: RoomConfig[];
}

const SensorConfiguration: React.FC<SensorConfigProps> = ({
  sensor,
  onSave,
  onCancel,
  rooms
}) => {
  const [formData, setFormData] = useState<SensorConfig>(() => ({
    id: sensor?.id || `sensor_${Date.now()}`,
    name: sensor?.name || '',
    type: sensor?.type || 'temperature',
    location: sensor?.location || '',
    roomName: sensor?.roomName || rooms[0]?.name || '',
    enabled: sensor?.enabled ?? true,
    alerts: sensor?.alerts || [],
    dataHistory: sensor?.dataHistory || [],
    batteryLevel: sensor?.batteryLevel,
    signalStrength: sensor?.signalStrength,
    lastMaintenance: sensor?.lastMaintenance,
    nextMaintenanceDue: sensor?.nextMaintenanceDue,
    firmwareVersion: sensor?.firmwareVersion,
    manufacturer: sensor?.manufacturer,
    model: sensor?.model,
    serialNumber: sensor?.serialNumber
  }));

  const [calibrationData, setCalibrationData] = useState<SensorCalibration>(() => ({
    offset: sensor?.calibration?.offset || 0,
    slope: sensor?.calibration?.slope || 1,
    lastCalibrated: sensor?.calibration?.lastCalibrated || new Date().toISOString(),
    nextCalibrationDue: sensor?.calibration?.nextCalibrationDue || '',
    calibrationPoints: sensor?.calibration?.calibrationPoints || [],
    notes: sensor?.calibration?.notes
  }));

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const sensorTypes: { value: SensorType; label: string; icon: React.ReactNode; unit: string }[] = [
    { value: 'temperature', label: 'Temperature', icon: <Thermometer className="w-4 h-4" />, unit: '°F' },
    { value: 'humidity', label: 'Humidity', icon: <Droplets className="w-4 h-4" />, unit: '%' },
    { value: 'ph', label: 'pH', icon: <Beaker className="w-4 h-4" />, unit: 'pH' },
    { value: 'ec', label: 'EC', icon: <Gauge className="w-4 h-4" />, unit: 'mS/cm' },
    { value: 'co2', label: 'CO2', icon: <Wind className="w-4 h-4" />, unit: 'ppm' },
    { value: 'vpd', label: 'VPD', icon: <Activity className="w-4 h-4" />, unit: 'kPa' },
    { value: 'soil_moisture', label: 'Soil Moisture', icon: <Droplets className="w-4 h-4" />, unit: '%' },
    { value: 'light_intensity', label: 'Light Intensity', icon: <Sun className="w-4 h-4" />, unit: 'PPFD' },
    { value: 'dli', label: 'Daily Light Integral', icon: <Sun className="w-4 h-4" />, unit: 'mol/m²/day' },
    { value: 'oxygen', label: 'Dissolved Oxygen', icon: <Activity className="w-4 h-4" />, unit: 'mg/L' },
    { value: 'pressure', label: 'Pressure', icon: <Gauge className="w-4 h-4" />, unit: 'hPa' }
  ];

  const addAlert = () => {
    const newAlert: SensorAlert = {
      id: `alert_${Date.now()}`,
      type: 'threshold',
      condition: { operator: 'gt', value: 0 },
      enabled: true,
      severity: 'medium',
      message: '',
      actions: [{ type: 'notification', config: {} }],
      cooldownMinutes: 15
    };
    setFormData(prev => ({
      ...prev,
      alerts: [...prev.alerts, newAlert]
    }));
  };

  const updateAlert = (alertId: string, updates: Partial<SensorAlert>) => {
    setFormData(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, ...updates } : alert
      )
    }));
  };

  const removeAlert = (alertId: string) => {
    setFormData(prev => ({
      ...prev,
      alerts: prev.alerts.filter(alert => alert.id !== alertId)
    }));
  };

  const addCalibrationPoint = () => {
    const newPoint: CalibrationPoint = {
      expectedValue: 0,
      actualValue: 0,
      timestamp: new Date().toISOString()
    };
    setCalibrationData(prev => ({
      ...prev,
      calibrationPoints: [...prev.calibrationPoints, newPoint]
    }));
  };

  const updateCalibrationPoint = (index: number, updates: Partial<CalibrationPoint>) => {
    setCalibrationData(prev => ({
      ...prev,
      calibrationPoints: prev.calibrationPoints.map((point, i) =>
        i === index ? { ...point, ...updates } : point
      )
    }));
  };

  const removeCalibrationPoint = (index: number) => {
    setCalibrationData(prev => ({
      ...prev,
      calibrationPoints: prev.calibrationPoints.filter((_, i) => i !== index)
    }));
  };

  const testSensor = async () => {
    setTestInProgress(true);
    try {
      // Simulate sensor test
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResults({
        status: 'success',
        responseTime: 145,
        accuracy: 98.5,
        signalStrength: -42,
        batteryLevel: 87,
        lastReading: {
          value: 23.4,
          timestamp: new Date().toISOString(),
          quality: 'good'
        }
      });
    } catch (error) {
      setTestResults({
        status: 'error',
        message: 'Failed to communicate with sensor'
      });
    } finally {
      setTestInProgress(false);
    }
  };

  const handleSave = () => {
    const updatedSensor = {
      ...formData,
      calibration: calibrationData.calibrationPoints.length > 0 ? calibrationData : undefined
    };
    onSave(updatedSensor);
  };

  const getSensorTypeIcon = (type: SensorType) => {
    const sensorType = sensorTypes.find(st => st.value === type);
    return sensorType?.icon || <Activity className="w-4 h-4" />;
  };

  const getSensorTypeUnit = (type: SensorType) => {
    const sensorType = sensorTypes.find(st => st.value === type);
    return sensorType?.unit || '';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-900/30 rounded-lg">
            <Settings className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {sensor ? 'Edit Sensor' : 'Add New Sensor'}
            </h2>
            <p className="text-sm text-gray-400">
              Configure sensor settings, alerts, and calibration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={testSensor}
            disabled={testInProgress}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${testInProgress ? 'animate-spin' : ''}`} />
            Test Sensor
          </button>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className={`mb-6 p-4 rounded-lg border ${testResults.status === 'success' ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testResults.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <span className={`font-medium ${testResults.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {testResults.status === 'success' ? 'Test Successful' : 'Test Failed'}
              </span>
            </div>
            <button
              onClick={() => setTestResults(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {testResults.status === 'success' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-400">Response Time</p>
                <p className="text-sm font-medium text-white">{testResults.responseTime}ms</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Accuracy</p>
                <p className="text-sm font-medium text-white">{testResults.accuracy}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Signal</p>
                <p className="text-sm font-medium text-white">{testResults.signalStrength} dBm</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Battery</p>
                <p className="text-sm font-medium text-white">{testResults.batteryLevel}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Configuration */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Basic Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sensor Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter sensor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sensor Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as SensorType }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sensorTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Canopy Level, Reservoir"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room
              </label>
              <select
                value={formData.roomName}
                onChange={(e) => setFormData(prev => ({ ...prev, roomName: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.name}>{room.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-300">Enable Sensor</span>
            </label>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
        </div>

        {/* Advanced Configuration */}
        {showAdvanced && (
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Advanced Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., SensorTech"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., ST-TEMP-V2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., ST2024001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Firmware Version
                </label>
                <input
                  type="text"
                  value={formData.firmwareVersion || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, firmwareVersion: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., 2.1.3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Alerts Configuration */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Alert Configuration
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                {showAlerts ? 'Hide' : 'Show'} Alerts
              </button>
              <button
                onClick={addAlert}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-3 h-3" />
                Add Alert
              </button>
            </div>
          </div>

          {showAlerts && (
            <div className="space-y-4">
              {formData.alerts.map((alert) => (
                <AlertConfiguration
                  key={alert.id}
                  alert={alert}
                  sensorType={formData.type}
                  onUpdate={(updates) => updateAlert(alert.id, updates)}
                  onRemove={() => removeAlert(alert.id)}
                />
              ))}
              {formData.alerts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No alerts configured</p>
                  <p className="text-sm">Add alerts to monitor sensor values and receive notifications</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calibration Configuration */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Beaker className="w-5 h-5 text-blue-400" />
              Calibration
            </h3>
            <button
              onClick={() => setShowCalibration(!showCalibration)}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              {showCalibration ? 'Hide' : 'Show'} Calibration
            </button>
          </div>

          {showCalibration && (
            <CalibrationConfiguration
              calibrationData={calibrationData}
              sensorType={formData.type}
              onUpdate={setCalibrationData}
              onAddPoint={addCalibrationPoint}
              onUpdatePoint={updateCalibrationPoint}
              onRemovePoint={removeCalibrationPoint}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Sensor
          </button>
        </div>
      </div>
    </div>
  );
};

// Alert Configuration Component
interface AlertConfigurationProps {
  alert: SensorAlert;
  sensorType: SensorType;
  onUpdate: (updates: Partial<SensorAlert>) => void;
  onRemove: () => void;
}

const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  alert,
  sensorType,
  onUpdate,
  onRemove
}) => {
  const alertTypes: { value: AlertType; label: string }[] = [
    { value: 'threshold', label: 'Threshold' },
    { value: 'range', label: 'Range' },
    { value: 'rate_of_change', label: 'Rate of Change' },
    { value: 'offline', label: 'Offline' },
    { value: 'battery_low', label: 'Low Battery' },
    { value: 'calibration_due', label: 'Calibration Due' }
  ];

  const severities: { value: AlertSeverity; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-blue-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'critical', label: 'Critical', color: 'text-red-400' }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={alert.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm font-medium text-white">Alert #{alert.id.slice(-6)}</span>
          <span className={`text-xs px-2 py-1 rounded ${severities.find(s => s.value === alert.severity)?.color} bg-gray-900`}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Alert Type</label>
          <select
            value={alert.type}
            onChange={(e) => onUpdate({ type: e.target.value as AlertType })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {alertTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
          <select
            value={alert.severity}
            onChange={(e) => onUpdate({ severity: e.target.value as AlertSeverity })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {severities.map(severity => (
              <option key={severity.value} value={severity.value}>{severity.label}</option>
            ))}
          </select>
        </div>

        {(alert.type === 'threshold' || alert.type === 'range') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
              <select
                value={alert.condition.operator}
                onChange={(e) => onUpdate({
                  condition: { ...alert.condition, operator: e.target.value as any }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="gt">Greater Than</option>
                <option value="lt">Less Than</option>
                <option value="eq">Equal To</option>
                <option value="gte">Greater Than or Equal</option>
                <option value="lte">Less Than or Equal</option>
                <option value="between">Between</option>
                <option value="outside">Outside Range</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
              {alert.condition.operator === 'between' || alert.condition.operator === 'outside' ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={(alert.condition.value as number[])[0] || ''}
                    onChange={(e) => onUpdate({
                      condition: {
                        ...alert.condition,
                        value: [parseFloat(e.target.value) || 0, (alert.condition.value as number[])[1] || 0]
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={(alert.condition.value as number[])[1] || ''}
                    onChange={(e) => onUpdate({
                      condition: {
                        ...alert.condition,
                        value: [(alert.condition.value as number[])[0] || 0, parseFloat(e.target.value) || 0]
                      }
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Max"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={alert.condition.value as number || ''}
                  onChange={(e) => onUpdate({
                    condition: { ...alert.condition, value: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Threshold value"
                />
              )}
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown (minutes)</label>
          <input
            type="number"
            value={alert.cooldownMinutes}
            onChange={(e) => onUpdate({ cooldownMinutes: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <input
            type="text"
            value={alert.message}
            onChange={(e) => onUpdate({ message: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Alert message"
          />
        </div>
      </div>
    </div>
  );
};

// Calibration Configuration Component
interface CalibrationConfigurationProps {
  calibrationData: SensorCalibration;
  sensorType: SensorType;
  onUpdate: (data: SensorCalibration) => void;
  onAddPoint: () => void;
  onUpdatePoint: (index: number, updates: Partial<CalibrationPoint>) => void;
  onRemovePoint: (index: number) => void;
}

const CalibrationConfiguration: React.FC<CalibrationConfigurationProps> = ({
  calibrationData,
  sensorType,
  onUpdate,
  onAddPoint,
  onUpdatePoint,
  onRemovePoint
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Offset</label>
          <input
            type="number"
            step="0.01"
            value={calibrationData.offset}
            onChange={(e) => onUpdate({ ...calibrationData, offset: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Slope</label>
          <input
            type="number"
            step="0.01"
            value={calibrationData.slope}
            onChange={(e) => onUpdate({ ...calibrationData, slope: parseFloat(e.target.value) || 1 })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Next Calibration Due</label>
          <input
            type="date"
            value={calibrationData.nextCalibrationDue ? new Date(calibrationData.nextCalibrationDue).toISOString().split('T')[0] : ''}
            onChange={(e) => onUpdate({ ...calibrationData, nextCalibrationDue: new Date(e.target.value).toISOString() })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-300">Calibration Points</label>
          <button
            onClick={onAddPoint}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3 h-3" />
            Add Point
          </button>
        </div>

        <div className="space-y-2">
          {calibrationData.calibrationPoints.map((point, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-700 rounded-lg p-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Expected Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={point.expectedValue}
                    onChange={(e) => onUpdatePoint(index, { expectedValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Actual Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={point.actualValue}
                    onChange={(e) => onUpdatePoint(index, { actualValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button
                onClick={() => onRemovePoint(index)}
                className="text-gray-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {calibrationData.calibrationPoints.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              <Beaker className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calibration points added</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
        <textarea
          value={calibrationData.notes || ''}
          onChange={(e) => onUpdate({ ...calibrationData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Calibration notes..."
        />
      </div>
    </div>
  );
};

export default SensorConfiguration;