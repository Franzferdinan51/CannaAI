'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets,
  Droplet,
  Play,
  Pause,
  Square,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Timer,
  Target,
  Gauge,
  Zap,
  BarChart3,
  Calendar,
  Edit,
  Save,
  X
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { SensorData, RoomConfig } from '../sensors/types';
import { IrrigationZoneStatus, AutomationStatus } from './types';

interface IrrigationControlProps {
  sensorData: SensorData;
  rooms: RoomConfig[];
  automationEnabled: boolean;
  onStatusUpdate: (status: Partial<AutomationStatus['watering']>) => void;
  className?: string;
}

export const IrrigationControl: React.FC<IrrigationControlProps> = ({
  sensorData,
  rooms,
  automationEnabled,
  onStatusUpdate,
  className = ''
}) => {
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZoneStatus[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [wateringProgress, setWateringProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [settings, setSettings] = useState({
    threshold: 30,
    duration: 5,
    flowRate: 2.5,
    pressureMin: 20,
    pressureMax: 40,
    phRange: [5.8, 6.2],
    ecRange: [1.2, 1.8]
  });

  // Initialize zones based on rooms
  useEffect(() => {
    const zones: IrrigationZoneStatus[] = rooms.flatMap((room, roomIndex) =>
      room.automation.watering.zones.map((zone, zoneIndex) => ({
        id: zone.id,
        name: zone.name,
        status: 'idle' as const,
        moistureLevel: sensorData.soilMoisture + (Math.random() - 0.5) * 10,
        lastWatered: zone.lastWatered || new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        nextWatering: zone.nextWatering || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        waterUsage: Math.random() * 50,
        flowRate: 2.5,
        valveOpen: false,
        pumpActive: false,
        pressure: 30,
        temperature: 68,
        ph: 6.0,
        ec: 1.5
      }))
    );
    setIrrigationZones(zones);
  }, [rooms, sensorData.soilMoisture]);

  // Simulate watering progress
  useEffect(() => {
    if (isWatering && wateringProgress < 100) {
      const timer = setTimeout(() => {
        setWateringProgress(prev => Math.min(prev + 2, 100));
      }, 100);
      return () => clearTimeout(timer);
    } else if (wateringProgress >= 100) {
      setIsWatering(false);
      setWateringProgress(0);
    }
  }, [isWatering, wateringProgress]);

  const handleStartWatering = (zoneId: string) => {
    setIsWatering(true);
    setWateringProgress(0);

    setIrrigationZones(prev => prev.map(zone =>
      zone.id === zoneId
        ? {
            ...zone,
            status: 'watering',
            valveOpen: true,
            pumpActive: true,
            moistureLevel: Math.min(100, zone.moistureLevel + 20)
          }
        : zone
    ));

    onStatusUpdate({
      active: true,
      status: 'running',
      currentZone: zoneId,
      progress: 0,
      lastRun: new Date().toISOString()
    });
  };

  const handleStopWatering = (zoneId: string) => {
    setIsWatering(false);
    setWateringProgress(0);

    setIrrigationZones(prev => prev.map(zone =>
      zone.id === zoneId
        ? {
            ...zone,
            status: 'idle',
            valveOpen: false,
            pumpActive: false,
            lastWatered: new Date().toISOString()
          }
        : zone
    ));

    onStatusUpdate({
      active: false,
      status: 'idle',
      currentZone: undefined,
      progress: 100,
      lastRun: new Date().toISOString()
    });
  };

  const getMoistureStatus = (level: number) => {
    if (level < 20) return { status: 'critical', color: 'text-red-400', bgColor: 'bg-red-500/10' };
    if (level < settings.threshold) return { status: 'low', color: 'text-orange-400', bgColor: 'bg-orange-500/10' };
    if (level > 80) return { status: 'high', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
    return { status: 'optimal', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' };
  };

  const totalWaterUsage = irrigationZones.reduce((sum, zone) => sum + zone.waterUsage, 0);
  const averageMoisture = irrigationZones.length > 0
    ? irrigationZones.reduce((sum, zone) => sum + zone.moistureLevel, 0) / irrigationZones.length
    : 0;

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-blue-400" />
            Irrigation Control
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={isWatering ? 'default' : 'secondary'}
                   className={isWatering
                     ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                     : 'bg-slate-700/50 text-slate-400 border-slate-600/50'}>
              {isWatering ? 'Watering Active' : 'System Idle'}
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
            <Droplet className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Avg Moisture</p>
            <p className="text-xl font-bold text-slate-100">{Math.round(averageMoisture)}%</p>
          </div>
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm text-slate-400">Active Zones</p>
            <p className="text-xl font-bold text-slate-100">
              {irrigationZones.filter(z => z.status === 'watering').length}/{irrigationZones.length}
            </p>
          </div>
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-slate-400">Daily Usage</p>
            <p className="text-xl font-bold text-slate-100">{totalWaterUsage.toFixed(1)} gal</p>
          </div>
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-orange-400" />
            <p className="text-sm text-slate-400">Next Watering</p>
            <p className="text-xl font-bold text-slate-100">2h 15m</p>
          </div>
        </div>

        {/* Current Watering Progress */}
        {isWatering && (
          <Card className="border-blue-500/20 bg-blue-950/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-300">Watering in Progress</span>
                <span className="text-sm text-blue-300">{wateringProgress}%</span>
              </div>
              <Progress value={wateringProgress} className="h-2" />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">
                  {selectedZone ? irrigationZones.find(z => z.id === selectedZone)?.name : 'Zone 1'}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => selectedZone && handleStopWatering(selectedZone)}
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zone Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Irrigation Zones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {irrigationZones.map((zone) => {
              const moistureStatus = getMoistureStatus(zone.moistureLevel);

              return (
                <Card key={zone.id} className={`border-slate-800 bg-slate-900/40 ${
                  zone.status === 'watering' ? 'ring-1 ring-blue-500/20' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-100">{zone.name}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${moistureStatus.bgColor} ${moistureStatus.color} border ${moistureStatus.color.replace('text', 'border')}`}>
                        {zone.moistureLevel}% moisture
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Moisture Level */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Soil Moisture</span>
                          <span>{zone.moistureLevel}%</span>
                        </div>
                        <Progress value={zone.moistureLevel} className="h-2" />
                      </div>

                      {/* Zone Status */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Status:</span>
                        <span className={`capitalize ${zone.status === 'watering' ? 'text-blue-400' : zone.status === 'idle' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {zone.status}
                        </span>
                      </div>

                      {/* Flow Rate */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Flow Rate:</span>
                        <span className="text-slate-200">{zone.flowRate} GPM</span>
                      </div>

                      {/* Last Watered */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Last Watered:</span>
                        <span className="text-slate-200">
                          {new Date(zone.lastWatered).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex space-x-2 pt-2">
                        {zone.status === 'watering' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleStopWatering(zone.id)}
                            disabled={!automationEnabled}
                          >
                            <Square className="w-4 h-4 mr-1" />
                            Stop
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                            onClick={() => {
                              setSelectedZone(zone.id);
                              handleStartWatering(zone.id);
                            }}
                            disabled={!automationEnabled || isWatering}
                          >
                            <Droplets className="w-4 h-4 mr-1" />
                            Water Now
                          </Button>
                        )}

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
              );
            })}
          </div>
        </div>

        {/* Settings Panel */}
        {editMode && (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-slate-100">Irrigation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Moisture Threshold (%)</Label>
                  <Slider
                    value={[settings.threshold]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, threshold: value[0] }))}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">{settings.threshold}%</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Watering Duration (minutes)</Label>
                  <Slider
                    value={[settings.duration]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, duration: value[0] }))}
                    max={30}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-slate-400">{settings.duration} min</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Flow Rate (GPM)</Label>
                  <Input
                    type="number"
                    value={settings.flowRate}
                    onChange={(e) => setSettings(prev => ({ ...prev, flowRate: parseFloat(e.target.value) }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Pressure Range (PSI)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={settings.pressureMin}
                      onChange={(e) => setSettings(prev => ({ ...prev, pressureMin: parseFloat(e.target.value) }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-200"
                      placeholder="Min"
                    />
                    <span className="text-slate-400">-</span>
                    <Input
                      type="number"
                      value={settings.pressureMax}
                      onChange={(e) => setSettings(prev => ({ ...prev, pressureMax: parseFloat(e.target.value) }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-200"
                      placeholder="Max"
                    />
                  </div>
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
        {averageMoisture < settings.threshold && (
          <Alert className="border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <AlertDescription className="text-orange-200">
              Average soil moisture ({Math.round(averageMoisture)}%) is below the threshold ({settings.threshold}%).
              Consider initiating watering cycle.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default IrrigationControl;