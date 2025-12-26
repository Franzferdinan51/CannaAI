'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Play,
  Pause,
  Square,
  AlertTriangle,
  Shield,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Settings,
  Power,
  Timer,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { AutomationStatus } from './types';

interface ManualOverrideProps {
  automationStatus: AutomationStatus;
  onUpdateStatus: (status: Partial<AutomationStatus>) => void;
  disabled?: boolean;
  className?: string;
}

export const ManualOverride: React.FC<ManualOverrideProps> = ({
  automationStatus,
  onUpdateStatus,
  disabled = false,
  className = ''
}) => {
  const [selectedSystem, setSelectedSystem] = useState<'all' | 'watering' | 'lighting' | 'climate' | 'co2'>('all');
  const [overrideDuration, setOverrideDuration] = useState<number>(30); // minutes
  const [overrideReason, setOverrideReason] = useState('');
  const [permanentOverride, setPermanentOverride] = useState(false);
  const [activeOverride, setActiveOverride] = useState(false);

  const handleOverride = (system: keyof AutomationStatus, action: 'start' | 'stop' | 'pause') => {
    const updateData: Partial<AutomationStatus> = {};

    switch (system) {
      case 'watering':
        updateData.watering = {
          ...automationStatus.watering,
          active: action === 'start',
          status: action === 'start' ? 'running' : action === 'pause' ? 'paused' : 'idle'
        };
        break;
      case 'lighting':
        updateData.lighting = {
          ...automationStatus.lighting,
          active: action === 'start',
          status: action === 'start' ? 'running' : 'off'
        };
        break;
      case 'climate':
        updateData.climate = {
          ...automationStatus.climate,
          active: action === 'start',
          status: action === 'start' ? 'maintaining' : 'idle'
        };
        break;
      case 'co2':
        updateData.co2 = {
          ...automationStatus.co2,
          active: action === 'start',
          status: action === 'start' ? 'injecting' : 'idle'
        };
        break;
    }

    onUpdateStatus(updateData);
    setActiveOverride(true);
  };

  const handleMasterOverride = (action: 'start' | 'stop' | 'pause') => {
    const updateData: Partial<AutomationStatus> = {
      watering: { ...automationStatus.watering, active: action === 'start', status: action === 'start' ? 'running' : 'idle' },
      lighting: { ...automationStatus.lighting, active: action === 'start', status: action === 'start' ? 'running' : 'off' },
      climate: { ...automationStatus.climate, active: action === 'start', status: action === 'start' ? 'maintaining' : 'idle' },
      co2: { ...automationStatus.co2, active: action === 'start', status: action === 'start' ? 'injecting' : 'idle' }
    };

    onUpdateStatus(updateData);
    setActiveOverride(true);
  };

  const getSystemIcon = (system: keyof AutomationStatus) => {
    switch (system) {
      case 'watering': return '💧';
      case 'lighting': return '💡';
      case 'climate': return '🌡️';
      case 'co2': return '🌱';
      default: return '⚡';
    }
  };

  const getSystemName = (system: keyof AutomationStatus) => {
    switch (system) {
      case 'watering': return 'Watering System';
      case 'lighting': return 'Lighting System';
      case 'climate': return 'Climate Control';
      case 'co2': return 'CO₂ Control';
      default: return 'System';
    }
  };

  const getSystemStatus = (system: keyof AutomationStatus) => {
    return automationStatus[system]?.status || 'idle';
  };

  const isSystemActive = (system: keyof AutomationStatus) => {
    return automationStatus[system]?.active || false;
  };

  const systemControls = [
    { key: 'watering' as keyof AutomationStatus, name: 'Watering', icon: '💧' },
    { key: 'lighting' as keyof AutomationStatus, name: 'Lighting', icon: '💡' },
    { key: 'climate' as keyof AutomationStatus, name: 'Climate', icon: '🌡️' },
    { key: 'co2' as keyof AutomationStatus, name: 'CO₂', icon: '🌱' }
  ];

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Manual Override
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={activeOverride ? 'default' : 'secondary'}
                   className={activeOverride
                     ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                     : 'bg-slate-700/50 text-slate-400 border-slate-600/50'}>
              {activeOverride ? 'Override Active' : 'Normal Mode'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Override Configuration */}
        <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Override Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Override Duration</Label>
              <Select value={overrideDuration.toString()} onValueChange={(value) => setOverrideDuration(parseInt(value))}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="0">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Target System</Label>
              <Select value={selectedSystem} onValueChange={(value: any) => setSelectedSystem(value)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All Systems</SelectItem>
                  <SelectItem value="watering">Watering Only</SelectItem>
                  <SelectItem value="lighting">Lighting Only</SelectItem>
                  <SelectItem value="climate">Climate Only</SelectItem>
                  <SelectItem value="co2">CO₂ Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Override Reason</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain the reason for this override..."
              className="bg-slate-800/50 border-slate-700 text-slate-200 min-h-[80px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={permanentOverride}
              onCheckedChange={setPermanentOverride}
            />
            <Label className="text-slate-300">Permanent Override (requires manual reversal)</Label>
          </div>
        </div>

        {/* Master Controls */}
        {selectedSystem === 'all' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Master Controls</h3>
            <div className="grid grid-cols-3 gap-3">
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => handleMasterOverride('start')}
                disabled={disabled}
              >
                <Play className="w-4 h-4 mr-2" />
                Start All
              </Button>
              <Button
                variant="outline"
                className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => handleMasterOverride('pause')}
                disabled={disabled}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause All
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleMasterOverride('stop')}
                disabled={disabled}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop All
              </Button>
            </div>
          </div>
        )}

        {/* Individual System Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Individual System Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemControls.map((system) => {
              const status = getSystemStatus(system.key);
              const isActive = isSystemActive(system.key);

              return (
                <Card key={system.key} className={`border-slate-800 bg-slate-900/40 ${
                  isActive ? 'ring-1 ring-emerald-500/20' : ''
                } ${selectedSystem !== 'all' && selectedSystem !== system.key ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{system.icon}</span>
                        <h4 className="font-medium text-slate-100">{system.name}</h4>
                      </div>
                      <Badge variant={
                        status === 'running' ? 'default' :
                        status === 'idle' ? 'secondary' :
                        'outline'
                      } className={
                        status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                        status === 'idle' ? 'bg-slate-700/50 text-slate-400 border-slate-600/50' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                      }>
                        {status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {/* System Status Info */}
                      <div className="text-sm text-slate-400">
                        {system.key === 'watering' && automationStatus.watering.currentZone && (
                          <p>Current Zone: {automationStatus.watering.currentZone}</p>
                        )}
                        {system.key === 'lighting' && (
                          <p>Intensity: {automationStatus.lighting.currentIntensity || 0}%</p>
                        )}
                        {system.key === 'climate' && (
                          <p>Mode: {automationStatus.climate.currentMode || 'auto'}</p>
                        )}
                        {system.key === 'co2' && (
                          <p>Level: {automationStatus.co2.currentLevel || 0} ppm</p>
                        )}
                      </div>

                      {/* Control Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => handleOverride(system.key, 'start')}
                          disabled={disabled || (selectedSystem !== 'all' && selectedSystem !== system.key)}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                          onClick={() => handleOverride(system.key, 'pause')}
                          disabled={disabled || (selectedSystem !== 'all' && selectedSystem !== system.key)}
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOverride(system.key, 'stop')}
                          disabled={disabled || (selectedSystem !== 'all' && selectedSystem !== system.key)}
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Quick Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-xs text-slate-400">Quick Toggle</span>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => handleOverride(system.key, checked ? 'start' : 'stop')}
                          disabled={disabled || (selectedSystem !== 'all' && selectedSystem !== system.key)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Safety Notice */}
        <Alert className="border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            Manual overrides will temporarily disable automated responses and safety interlocks for the specified duration.
            Use with caution and monitor the system closely during override periods.
          </AlertDescription>
        </Alert>

        {/* Active Override Info */}
        {activeOverride && (
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <Activity className="w-4 h-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              Override is currently active. Duration: {overrideDuration} minutes.
              System will automatically resume normal operation when the override expires.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualOverride;