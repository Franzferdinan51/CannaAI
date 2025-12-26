'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  LightbulbOff,
  Sun,
  Moon,
  Zap,
  Activity,
  Timer,
  Calendar,
  TrendingUp,
  BarChart3,
  Settings,
  Edit,
  Save,
  X,
  Power,
  Gauge,
  Clock,
  AlertTriangle
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

import { RoomConfig } from '../sensors/types';
import { LightingZoneStatus, AutomationStatus } from './types';

interface LightingControlProps {
  rooms: RoomConfig[];
  automationEnabled: boolean;
  onStatusUpdate: (status: Partial<AutomationStatus['lighting']>) => void;
  className?: string;
}

export const LightingControl: React.FC<LightingControlProps> = ({
  rooms,
  automationEnabled,
  onStatusUpdate,
  className = ''
}) => {
  const [lightingZones, setLightingZones] = useState<LightingZoneStatus[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [globalMode, setGlobalMode] = useState<'auto' | 'manual' | 'off'>('auto');
  const [settings, setSettings] = useState({
    defaultIntensity: 75,
    sunriseDuration: 15,
    sunsetDuration: 15,
    maxDailyHours: 18,
    dimmable: true,
    spectrumControl: true,
    powerLimit: 1000,
    vegSchedule: '18/6',
    flowerSchedule: '12/12'
  });

  // Initialize lighting zones based on rooms
  useEffect(() => {
    const zones: LightingZoneStatus[] = rooms.flatMap((room, roomIndex) => {
      const isVeg = room.growthStage === 'vegetative';
      const isOn = Math.random() > 0.3; // Simulate some lights being on

      return Array.from({ length: 2 }, (_, zoneIndex) => ({
        id: `${room.id}_light_${zoneIndex + 1}`,
        name: `${room.name} - Zone ${zoneIndex + 1}`,
        status: isOn ? 'on' : 'off',
        intensity: isOn ? (isVeg ? 80 : 60) + Math.random() * 20 : 0,
        spectrum: isVeg ? 'full' : 'red-heavy',
        colorTemp: isVeg ? 6500 : 2700,
        powerConsumption: isOn ? 300 + Math.random() * 200 : 0,
        hoursOn: isOn ? Math.random() * 12 : 0,
        totalHours: 1000 + Math.random() * 500,
        lastOn: isOn ? new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000).toISOString() : '',
        lastOff: !isOn ? new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000).toISOString() : '',
        nextTransition: isOn ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() : '',
        dimmable: settings.dimmable,
        spectrumControl: settings.spectrumControl
      }));
    });
    setLightingZones(zones);
  }, [rooms, settings.dimmable, settings.spectrumControl]);

  const handleToggleLight = (zoneId: string) => {
    setLightingZones(prev => prev.map(zone => {
      if (zone.id === zoneId) {
        const newStatus = zone.status === 'on' ? 'off' : 'on';
        const newIntensity = newStatus === 'on' ? settings.defaultIntensity : 0;

        return {
          ...zone,
          status: newStatus,
          intensity: newIntensity,
          powerConsumption: newStatus === 'on' ? (newIntensity / 100) * 500 : 0,
          lastOn: newStatus === 'on' ? new Date().toISOString() : zone.lastOn,
          lastOff: newStatus === 'off' ? new Date().toISOString() : zone.lastOff
        };
      }
      return zone;
    }));

    // Update automation status
    const activeZones = lightingZones.filter(z => z.status === 'on');
    onStatusUpdate({
      active: activeZones.length > 0,
      currentIntensity: activeZones.length > 0
        ? activeZones.reduce((sum, z) => sum + z.intensity, 0) / activeZones.length
        : 0
    });
  };

  const handleIntensityChange = (zoneId: string, intensity: number) => {
    setLightingZones(prev => prev.map(zone =>
      zone.id === zoneId
        ? {
            ...zone,
            intensity,
            powerConsumption: zone.status === 'on' ? (intensity / 100) * 500 : 0,
            status: intensity > 0 ? 'on' : 'off'
          }
        : zone
    ));
  };

  const getScheduleType = (room: RoomConfig) => {
    switch (room.growthStage) {
      case 'vegetative': return 'vegetative';
      case 'flowering': return 'flowering';
      default: return 'custom';
    }
  };

  const getTotalPowerConsumption = lightingZones.reduce((sum, zone) => sum + zone.powerConsumption, 0);
  const activeZones = lightingZones.filter(zone => zone.status === 'on').length;
  const averageIntensity = lightingZones.length > 0
    ? lightingZones.reduce((sum, zone) => sum + zone.intensity, 0) / lightingZones.length
    : 0;

  const currentTime = new Date();
  const isDaytime = currentTime.getHours() >= 6 && currentTime.getHours() <= 18;

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
            Lighting Control
          </div>
          <div className="flex items-center space-x-3">
            <Select value={globalMode} onValueChange={(value: any) => setGlobalMode(value)}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>

            <Badge variant={activeZones > 0 ? 'default' : 'secondary'}
                   className={activeZones > 0
                     ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                     : 'bg-slate-700/50 text-slate-400 border-slate-600/50'}>
              {activeZones} Active
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
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-slate-400">Power Usage</p>
            <p className="text-xl font-bold text-slate-100">{Math.round(getTotalPowerConsumption)}W</p>
          </div>
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm text-slate-400">Active Zones</p>
            <p className="text-xl font-bold text-slate-100">{activeZones}/{lightingZones.length}</p>
          </div>
          <div className="text-center">
            <Gauge className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-slate-400">Avg Intensity</p>
            <p className="text-xl font-bold text-slate-100">{Math.round(averageIntensity)}%</p>
          </div>
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-sm text-slate-400">Daily Hours</p>
            <p className="text-xl font-bold text-slate-100">12.5h</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Master Power</span>
                <Power className="w-4 h-4 text-slate-400" />
              </div>
              <Switch
                checked={activeZones > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Turn on all zones
                    lightingZones.forEach(zone => {
                      if (zone.status === 'off') {
                        handleToggleLight(zone.id);
                      }
                    });
                  } else {
                    // Turn off all zones
                    lightingZones.forEach(zone => {
                      if (zone.status === 'on') {
                        handleToggleLight(zone.id);
                      }
                    });
                  }
                }}
                disabled={!automationEnabled}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Time of Day</span>
                {isDaytime ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
              </div>
              <span className="text-lg font-bold text-slate-100">
                {isDaytime ? 'Daytime' : 'Nighttime'}
              </span>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Schedule</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-lg font-bold text-slate-100">
                {rooms.some(r => r.growthStage === 'flowering') ? '12/12' : '18/6'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Zone Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Lighting Zones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lightingZones.map((zone) => (
              <Card key={zone.id} className={`border-slate-800 bg-slate-900/40 ${
                zone.status === 'on' ? 'ring-1 ring-yellow-500/20' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-100">{zone.name}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.status === 'on'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                    }`}>
                      {zone.status === 'on' ? 'ON' : 'OFF'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Intensity Control */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Intensity</span>
                        <span>{Math.round(zone.intensity)}%</span>
                      </div>
                      <div className="relative">
                        <Slider
                          value={[zone.intensity]}
                          onValueChange={(value) => handleIntensityChange(zone.id, value[0])}
                          max={100}
                          min={0}
                          step={1}
                          disabled={!automationEnabled || globalMode === 'off'}
                          className="w-full"
                        />
                        {zone.status === 'on' && (
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-yellow-400/20 rounded-full pointer-events-none"
                            style={{ width: `${zone.intensity}%` }}
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Power Consumption */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Power:</span>
                      <span className="text-slate-200">{Math.round(zone.powerConsumption)}W</span>
                    </div>

                    {/* Spectrum */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Spectrum:</span>
                      <span className="text-slate-200 capitalize">{zone.spectrum || 'full'}</span>
                    </div>

                    {/* Color Temperature */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Color Temp:</span>
                      <span className="text-slate-200">{zone.colorTemp}K</span>
                    </div>

                    {/* Today's Runtime */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Today:</span>
                      <span className="text-slate-200">{zone.hoursOn.toFixed(1)}h</span>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        variant={zone.status === 'on' ? 'destructive' : 'default'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleToggleLight(zone.id)}
                        disabled={!automationEnabled || globalMode === 'off'}
                      >
                        {zone.status === 'on' ? (
                          <>
                            <LightbulbOff className="w-4 h-4 mr-1" />
                            Turn Off
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-4 h-4 mr-1" />
                            Turn On
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
              <CardTitle className="text-slate-100">Lighting Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Default Intensity (%)</Label>
                  <Slider
                    value={[settings.defaultIntensity]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, defaultIntensity: value[0] }))}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">{settings.defaultIntensity}%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Sunrise Duration (min)</Label>
                  <Slider
                    value={[settings.sunriseDuration]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, sunriseDuration: value[0] }))}
                    max={60}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">{settings.sunriseDuration} min</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Power Limit (W)</Label>
                  <Input
                    type="number"
                    value={settings.powerLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, powerLimit: parseInt(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Max Daily Hours</Label>
                  <Input
                    type="number"
                    value={settings.maxDailyHours}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxDailyHours: parseInt(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.dimmable}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, dimmable: checked }))}
                  />
                  <Label className="text-slate-300">Dimmable Lights</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.spectrumControl}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, spectrumControl: checked }))}
                  />
                  <Label className="text-slate-300">Spectrum Control</Label>
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

        {/* Power Usage Alert */}
        {getTotalPowerConsumption > settings.powerLimit * 0.8 && (
          <Alert className="border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <AlertDescription className="text-orange-200">
              Power consumption ({Math.round(getTotalPowerConsumption)}W) is approaching the limit ({settings.powerLimit}W).
              Consider reducing intensity or turning off some zones.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LightingControl;