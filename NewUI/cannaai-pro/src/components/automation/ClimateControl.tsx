'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Wind,
  Droplets,
  Activity,
  Snowflake,
  Flame,
  Gauge,
  TrendingUp,
  TrendingDown,
  Settings,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Power,
  Fan,
  Shield
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { SensorData, RoomConfig } from '../sensors/types';
import { ClimateZoneStatus, AutomationStatus } from './types';

interface ClimateControlProps {
  sensorData: SensorData;
  rooms: RoomConfig[];
  automationEnabled: boolean;
  onStatusUpdate: (status: Partial<AutomationStatus['climate']>) => void;
  className?: string;
}

export const ClimateControl: React.FC<ClimateControlProps> = ({
  sensorData,
  rooms,
  automationEnabled,
  onStatusUpdate,
  className = ''
}) => {
  const [climateZones, setClimateZones] = useState<ClimateZoneStatus[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [globalMode, setGlobalMode] = useState<'auto' | 'heat' | 'cool' | 'vent' | 'off'>('auto');
  const [settings, setSettings] = useState({
    tempTolerance: 2,
    humidityTolerance: 5,
    vpdTolerance: 0.2,
    co2Tolerance: 50,
    minCirculationTime: 15,
    filterReplacementInterval: 30,
    maxTemp: 85,
    minTemp: 60,
    maxHumidity: 80,
    minHumidity: 30,
    emergencyShutdown: true
  });

  // Calculate VPD
  const calculateVPD = (tempF: number, humidity: number): number => {
    const tempC = (tempF - 32) * 5 / 9;
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const vpd = svp * (1 - humidity / 100);
    return Math.round(vpd * 100) / 100;
  };

  // Initialize climate zones based on rooms
  useEffect(() => {
    const zones: ClimateZoneStatus[] = rooms.map(room => ({
      id: room.id,
      name: room.name,
      mode: 'auto',
      currentTemp: sensorData.temperature + (Math.random() - 0.5) * 4,
      targetTemp: room.targetEnvironment.temperature.max,
      currentHumidity: sensorData.humidity + (Math.random() - 0.5) * 8,
      targetHumidity: room.targetEnvironment.humidity.max,
      heatingActive: sensorData.temperature < room.targetEnvironment.temperature.min,
      coolingActive: sensorData.temperature > room.targetEnvironment.temperature.max,
      ventilationActive: sensorData.humidity > room.targetEnvironment.humidity.max,
      dehumidificationActive: false,
      circulationActive: true,
      vpd: calculateVPD(sensorData.temperature, sensorData.humidity),
      co2Level: sensorData.co2,
      airFlowRate: 400,
      filterStatus: Math.random() > 0.8 ? 'replace' : 'good',
      maintenanceDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
    setClimateZones(zones);
  }, [rooms, sensorData]);

  const getOptimalRanges = () => {
    if (rooms.length === 0) {
      return {
        temp: { min: 68, max: 78 },
        humidity: { min: 40, max: 60 },
        vpd: { min: 0.8, max: 1.2 },
        co2: { min: 400, max: 1200 }
      };
    }

    return rooms.reduce((acc, room) => {
      const targets = room.targetEnvironment;
      return {
        temp: {
          min: Math.min(acc.temp.min, targets.temperature.min),
          max: Math.max(acc.temp.max, targets.temperature.max)
        },
        humidity: {
          min: Math.min(acc.humidity.min, targets.humidity.min),
          max: Math.max(acc.humidity.max, targets.humidity.max)
        },
        vpd: {
          min: Math.min(acc.vpd.min, targets.vpd.min),
          max: Math.max(acc.vpd.max, targets.vpd.max)
        },
        co2: {
          min: Math.min(acc.co2.min, targets.co2.min),
          max: Math.max(acc.co2.max, targets.co2.max)
        }
      };
    }, {
      temp: { min: 100, max: 0 },
      humidity: { min: 100, max: 0 },
      vpd: { min: 10, max: 0 },
      co2: { min: 2000, max: 0 }
    });
  };

  const optimalRanges = getOptimalRanges();
  const currentVPD = calculateVPD(sensorData.temperature, sensorData.humidity);

  const handleModeChange = (zoneId: string, mode: ClimateZoneStatus['mode']) => {
    setClimateZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const updatedZone = { ...zone, mode };

        // Update active systems based on mode
        if (mode === 'off') {
          updatedZone.heatingActive = false;
          updatedZone.coolingActive = false;
          updatedZone.ventilationActive = false;
          updatedZone.dehumidificationActive = false;
          updatedZone.circulationActive = false;
        } else if (mode === 'heat') {
          updatedZone.heatingActive = true;
          updatedZone.coolingActive = false;
          updatedZone.ventilationActive = false;
        } else if (mode === 'cool') {
          updatedZone.heatingActive = false;
          updatedZone.coolingActive = true;
          updatedZone.ventilationActive = true;
        } else if (mode === 'vent') {
          updatedZone.heatingActive = false;
          updatedZone.coolingActive = false;
          updatedZone.ventilationActive = true;
        }

        return updatedZone;
      }
      return zone;
    }));
  };

  const handleTemperatureAdjustment = (zoneId: string, targetTemp: number) => {
    setClimateZones(prev => prev.map(zone =>
      zone.id === zoneId ? { ...zone, targetTemp } : zone
    ));
  };

  const handleHumidityAdjustment = (zoneId: string, targetHumidity: number) => {
    setClimateZones(prev => prev.map(zone =>
      zone.id === zoneId ? { ...zone, targetHumidity } : zone
    ));
  };

  const getParameterStatus = (current: number, min: number, max: number) => {
    if (current < min - settings.tempTolerance) return { status: 'low', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
    if (current > max + settings.tempTolerance) return { status: 'high', color: 'text-red-400', bgColor: 'bg-red-500/10' };
    return { status: 'optimal', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' };
  };

  const tempStatus = getParameterStatus(sensorData.temperature, optimalRanges.temp.min, optimalRanges.temp.max);
  const humidityStatus = getParameterStatus(sensorData.humidity, optimalRanges.humidity.min, optimalRanges.humidity.max);
  const vpdStatus = getParameterStatus(currentVPD, optimalRanges.vpd.min, optimalRanges.vpd.max);

  const activeSystems = climateZones.filter(zone =>
    zone.heatingActive || zone.coolingActive || zone.ventilationActive || zone.circulationActive
  ).length;

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Thermometer className="w-5 h-5 mr-2 text-orange-400" />
            Climate Control
          </div>
          <div className="flex items-center space-x-3">
            <Select value={globalMode} onValueChange={(value: any) => setGlobalMode(value)}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="heat">Heat</SelectItem>
                <SelectItem value="cool">Cool</SelectItem>
                <SelectItem value="vent">Vent</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant={activeSystems > 0 ? 'default' : 'secondary'}
                   className={activeSystems > 0
                     ? 'bg-orange-500/20 text-orange-400 border-orange-500/20'
                     : 'bg-slate-700/50 text-slate-400 border-slate-600/50'}>
              {activeSystems} Active
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Environmental Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Thermometer className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-sm text-slate-400">Temperature</p>
            <p className="text-xl font-bold text-slate-100">{sensorData.temperature}°F</p>
            <p className="text-xs text-slate-500">Target: {optimalRanges.temp.min}-{optimalRanges.temp.max}°F</p>
          </div>
          <div className="text-center">
            <Droplets className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Humidity</p>
            <p className="text-xl font-bold text-slate-100">{sensorData.humidity}%</p>
            <p className="text-xs text-slate-500">Target: {optimalRanges.humidity.min}-{optimalRanges.humidity.max}%</p>
          </div>
          <div className="text-center">
            <Gauge className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-slate-400">VPD</p>
            <p className="text-xl font-bold text-slate-100">{currentVPD} kPa</p>
            <p className="text-xs text-slate-500">Target: {optimalRanges.vpd.min}-{optimalRanges.vpd.max} kPa</p>
          </div>
          <div className="text-center">
            <Wind className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm text-slate-400">CO₂</p>
            <p className="text-xl font-bold text-slate-100">{sensorData.co2} ppm</p>
            <p className="text-xs text-slate-500">Target: {optimalRanges.co2.min}-{optimalRanges.co2.max} ppm</p>
          </div>
        </div>

        {/* Active Systems */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Flame, label: 'Heating', active: climateZones.some(z => z.heatingActive), color: 'text-red-400' },
            { icon: Snowflake, label: 'Cooling', active: climateZones.some(z => z.coolingActive), color: 'text-blue-400' },
            { icon: Fan, label: 'Ventilation', active: climateZones.some(z => z.ventilationActive), color: 'text-cyan-400' },
            { icon: Wind, label: 'Circulation', active: climateZones.some(z => z.circulationActive), color: 'text-green-400' }
          ].map((system, index) => (
            <Card key={index} className={`border-slate-800 bg-slate-900/40 ${
              system.active ? 'ring-1 ring-emerald-500/20' : ''
            }`}>
              <CardContent className="p-3 text-center">
                <system.icon className={`w-6 h-6 mx-auto mb-2 ${system.active ? system.color : 'text-slate-600'}`} />
                <p className="text-sm font-medium text-slate-300">{system.label}</p>
                <div className={`mt-1 w-2 h-2 rounded-full mx-auto ${
                  system.active ? 'bg-emerald-500' : 'bg-slate-600'
                }`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Zone Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Climate Zones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {climateZones.map((zone) => (
              <Card key={zone.id} className={`border-slate-800 bg-slate-900/40`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-100">{zone.name}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.mode === 'auto' ? 'bg-emerald-500/10 text-emerald-400' :
                      zone.mode === 'off' ? 'bg-slate-700/50 text-slate-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>
                      {zone.mode.toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Temperature Control */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Temperature: {Math.round(zone.currentTemp)}°F</span>
                        <span>Target: {zone.targetTemp}°F</span>
                      </div>
                      <Slider
                        value={[zone.targetTemp]}
                        onValueChange={(value) => handleTemperatureAdjustment(zone.id, value[0])}
                        max={90}
                        min={60}
                        step={1}
                        disabled={!automationEnabled}
                        className="w-full"
                      />
                      {zone.heatingActive && (
                        <div className="flex items-center mt-1">
                          <Flame className="w-3 h-3 text-red-400 mr-1" />
                          <span className="text-xs text-red-400">Heating</span>
                        </div>
                      )}
                      {zone.coolingActive && (
                        <div className="flex items-center mt-1">
                          <Snowflake className="w-3 h-3 text-blue-400 mr-1" />
                          <span className="text-xs text-blue-400">Cooling</span>
                        </div>
                      )}
                    </div>

                    {/* Humidity Control */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Humidity: {Math.round(zone.currentHumidity)}%</span>
                        <span>Target: {zone.targetHumidity}%</span>
                      </div>
                      <Slider
                        value={[zone.targetHumidity]}
                        onValueChange={(value) => handleHumidityAdjustment(zone.id, value[0])}
                        max={80}
                        min={30}
                        step={1}
                        disabled={!automationEnabled}
                        className="w-full"
                      />
                      {zone.ventilationActive && (
                        <div className="flex items-center mt-1">
                          <Fan className="w-3 h-3 text-cyan-400 mr-1" />
                          <span className="text-xs text-cyan-400">Ventilating</span>
                        </div>
                      )}
                    </div>

                    {/* Zone Status */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Circulation:</span>
                        <span className={zone.circulationActive ? 'text-emerald-400' : 'text-slate-400'}>
                          {zone.circulationActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Air Flow:</span>
                        <span className="text-slate-200">{zone.airFlowRate} CFM</span>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex space-x-2 pt-2">
                      <Select value={zone.mode} onValueChange={(value: any) => handleModeChange(zone.id, value)}>
                        <SelectTrigger className="flex-1 bg-slate-800/50 border-slate-700 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="heat">Heat</SelectItem>
                          <SelectItem value="cool">Cool</SelectItem>
                          <SelectItem value="vent">Ventilate</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>

                      {zone.filterStatus === 'replace' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500/20 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Settings Panel */}
        {editMode && (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-slate-100">Climate Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Temperature Tolerance (°F)</Label>
                  <Slider
                    value={[settings.tempTolerance]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, tempTolerance: value[0] }))}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">±{settings.tempTolerance}°F</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Humidity Tolerance (%)</Label>
                  <Slider
                    value={[settings.humidityTolerance]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, humidityTolerance: value[0] }))}
                    max={20}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">±{settings.humidityTolerance}%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">VPD Tolerance (kPa)</Label>
                  <Slider
                    value={[settings.vpdTolerance]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, vpdTolerance: value[0] }))}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">±{settings.vpdTolerance} kPa</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Min Circulation Time (min/hour)</Label>
                  <Input
                    type="number"
                    value={settings.minCirculationTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, minCirculationTime: parseInt(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Filter Replacement Interval (days)</Label>
                  <Input
                    type="number"
                    value={settings.filterReplacementInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, filterReplacementInterval: parseInt(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.emergencyShutdown}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emergencyShutdown: checked }))}
                  />
                  <Label className="text-slate-300">Emergency Shutdown on Critical</Label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={() => setEditMode(false)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                  onClick={() => setEditMode(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {climateZones.some(zone => zone.filterStatus === 'replace') && (
          <Alert className="border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <AlertDescription className="text-orange-200">
              One or more climate zones require filter replacement. Schedule maintenance to ensure optimal air quality.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ClimateControl;