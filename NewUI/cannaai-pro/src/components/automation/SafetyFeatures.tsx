'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Settings,
  Power,
  Bell,
  Eye,
  Clock,
  AlertCircle,
  Info,
  TriangleAlert
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

import { SafetyAlert } from './types';

interface SafetyFeaturesProps {
  alerts: any[];
  systemHealth: any;
  automationEnabled: boolean;
  className?: string;
}

export const SafetyFeatures: React.FC<SafetyFeaturesProps> = ({
  alerts,
  systemHealth,
  automationEnabled,
  className = ''
}) => {
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([
    {
      id: 'temp_high',
      type: 'warning',
      category: 'temperature',
      title: 'High Temperature Alert',
      message: 'Temperature in Zone A is approaching critical levels (85°F)',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      acknowledged: false,
      resolved: false,
      actions: [
        { id: '1', label: 'Acknowledge', action: 'acknowledge', requiresAuth: false, completed: false },
        { id: '2', label: 'Increase Cooling', action: 'override', system: 'climate', requiresAuth: true, completed: false }
      ]
    },
    {
      id: 'moisture_low',
      type: 'warning',
      category: 'water',
      title: 'Low Soil Moisture',
      message: 'Soil moisture levels are below threshold in Zone B (15%)',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      acknowledged: false,
      resolved: false,
      actions: [
        { id: '1', label: 'Acknowledge', action: 'acknowledge', requiresAuth: false, completed: false },
        { id: '2', label: 'Water Now', action: 'override', system: 'watering', requiresAuth: true, completed: false }
      ]
    }
  ]);

  const [safetySettings, setSafetySettings] = useState({
    emergencyShutdown: true,
    autoRecovery: true,
    alertsEnabled: true,
    criticalTempThreshold: 90,
    lowTempThreshold: 50,
    criticalHumidityThreshold: 85,
    lowHumidityThreshold: 25,
    maxCo2Threshold: 2000,
    leakDetection: true,
    smokeDetection: true,
    powerOutageResponse: 'suspend'
  });

  const [systemStatus, setSystemStatus] = useState({
    overall: 'operational',
    temperature: 'normal',
    humidity: 'normal',
    co2: 'normal',
    power: 'stable',
    connectivity: 'online'
  });

  // Count alerts by severity
  const criticalAlerts = safetyAlerts.filter(alert => alert.type === 'critical').length;
  const warningAlerts = safetyAlerts.filter(alert => alert.type === 'warning').length;
  const infoAlerts = safetyAlerts.filter(alert => alert.type === 'info').length;

  const handleAcknowledgeAlert = (alertId: string) => {
    setSafetyAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedAt: new Date().toISOString(),
            actions: alert.actions.map(action =>
              action.action === 'acknowledge'
                ? { ...action, completed: true, completedAt: new Date().toISOString() }
                : action
            )
          }
        : alert
    ));
  };

  const handleResolveAlert = (alertId: string) => {
    setSafetyAlerts(prev => prev.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            resolved: true,
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'user'
          }
        : alert
    ));
  };

  const handleSafetyAction = (alertId: string, actionId: string) => {
    // Handle different safety actions
    const alert = safetyAlerts.find(a => a.id === alertId);
    const action = alert?.actions.find(a => a.id === actionId);

    if (action) {
      setSafetyAlerts(prev => prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              actions: a.actions.map(ac =>
                ac.id === actionId
                  ? { ...ac, completed: true, completedAt: new Date().toISOString() }
                  : ac
              )
            }
          : a
      ));

      // Implement action logic here
      console.log(`Executing safety action: ${action.action}`, action);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'temperature': return <Thermometer className="w-4 h-4" />;
      case 'humidity': return <Droplets className="w-4 h-4" />;
      case 'water': return <Droplets className="w-4 h-4" />;
      case 'co2': return <Wind className="w-4 h-4" />;
      case 'electrical': return <Zap className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500/20 bg-red-950/10';
      case 'warning': return 'border-yellow-500/20 bg-yellow-950/10';
      case 'info': return 'border-blue-500/20 bg-blue-950/10';
      default: return 'border-slate-800 bg-slate-900/40';
    }
  };

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-emerald-400" />
            Safety Features
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={systemStatus.overall === 'operational' ? 'default' : 'secondary'}
                   className={systemStatus.overall === 'operational'
                     ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                     : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'}>
              {systemStatus.overall === 'operational' ? 'All Safe' : 'Issues Detected'}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Safety Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-slate-400">Critical</p>
            <p className="text-xl font-bold text-slate-100">{criticalAlerts}</p>
          </div>
          <div className="text-center">
            <TriangleAlert className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-slate-400">Warnings</p>
            <p className="text-xl font-bold text-slate-100">{warningAlerts}</p>
          </div>
          <div className="text-center">
            <Info className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Info</p>
            <p className="text-xl font-bold text-slate-100">{infoAlerts}</p>
          </div>
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm text-slate-400">Protected</p>
            <p className="text-xl font-bold text-slate-100">4 Zones</p>
          </div>
        </div>

        {/* Safety Systems Status */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: Thermometer, label: 'Temperature', status: systemStatus.temperature },
            { icon: Droplets, label: 'Humidity', status: systemStatus.humidity },
            { icon: Wind, label: 'CO₂', status: systemStatus.co2 },
            { icon: Zap, label: 'Power', status: systemStatus.power },
            { icon: Activity, label: 'Connectivity', status: systemStatus.connectivity },
            { icon: Shield, label: 'Emergency', status: 'ready' }
          ].map((system, index) => (
            <Card key={index} className={`border-slate-800 bg-slate-900/40 ${
              system.status === 'normal' || system.status === 'stable' || system.status === 'online' || system.status === 'ready'
                ? 'ring-1 ring-emerald-500/20'
                : 'ring-1 ring-yellow-500/20'
            }`}>
              <CardContent className="p-3 text-center">
                <system.icon className={`w-6 h-6 mx-auto mb-2 ${
                  system.status === 'normal' || system.status === 'stable' || system.status === 'online' || system.status === 'ready'
                    ? 'text-emerald-400'
                    : 'text-yellow-400'
                }`} />
                <p className="text-sm font-medium text-slate-300">{system.label}</p>
                <div className={`mt-1 w-2 h-2 rounded-full mx-auto ${
                  system.status === 'normal' || system.status === 'stable' || system.status === 'online' || system.status === 'ready'
                    ? 'bg-emerald-500'
                    : 'bg-yellow-500'
                }`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Alerts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-yellow-400" />
            Active Alerts
            {safetyAlerts.filter(a => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {safetyAlerts.filter(a => !a.acknowledged).length} Unacknowledged
              </Badge>
            )}
          </h3>

          <div className="space-y-3">
            <AnimatePresence>
              {safetyAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`border rounded-lg p-4 ${getAlertColor(alert.type)} ${
                    alert.acknowledged ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type)}
                      <div>
                        <h4 className="font-medium text-slate-100">{alert.title}</h4>
                        <p className="text-sm text-slate-300 flex items-center">
                          <getCategoryIcon category={alert.category} className="w-3 h-3 mr-1" />
                          {alert.category} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {alert.acknowledged && (
                        <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
                          Acknowledged
                        </Badge>
                      )}
                      {alert.resolved && (
                        <Badge variant="outline" className="border-blue-500/20 text-blue-400">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 mb-3">{alert.message}</p>

                  <div className="flex flex-wrap gap-2">
                    {alert.actions.map((action) => (
                      <Button
                        key={action.id}
                        variant={action.completed ? 'secondary' : 'outline'}
                        size="sm"
                        className={`${
                          action.completed
                            ? 'bg-slate-700/50 text-slate-400 border-slate-600'
                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700'
                        }`}
                        onClick={() => {
                          if (action.action === 'acknowledge' && !action.completed) {
                            handleAcknowledgeAlert(alert.id);
                          } else if (action.action === 'override' && !action.completed) {
                            handleSafetyAction(alert.id, action.id);
                          }
                        }}
                        disabled={action.completed}
                      >
                        {action.action === 'acknowledge' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {action.action === 'override' && <Settings className="w-3 h-3 mr-1" />}
                        {action.completed ? 'Completed' : action.label}
                      </Button>
                    ))}

                    {!alert.resolved && alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Safety Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Safety Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Emergency Shutdown</Label>
                  <p className="text-xs text-slate-400">Automatically shut down on critical conditions</p>
                </div>
                <Switch
                  checked={safetySettings.emergencyShutdown}
                  onCheckedChange={(checked) => setSafetySettings(prev => ({ ...prev, emergencyShutdown: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Auto Recovery</Label>
                  <p className="text-xs text-slate-400">Automatically resume operations when safe</p>
                </div>
                <Switch
                  checked={safetySettings.autoRecovery}
                  onCheckedChange={(checked) => setSafetySettings(prev => ({ ...prev, autoRecovery: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Leak Detection</Label>
                  <p className="text-xs text-slate-400">Monitor for water leaks and moisture</p>
                </div>
                <Switch
                  checked={safetySettings.leakDetection}
                  onCheckedChange={(checked) => setSafetySettings(prev => ({ ...prev, leakDetection: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300">Smoke Detection</Label>
                  <p className="text-xs text-slate-400">Monitor for smoke and fire hazards</p>
                </div>
                <Switch
                  checked={safetySettings.smokeDetection}
                  onCheckedChange={(checked) => setSafetySettings(prev => ({ ...prev, smokeDetection: checked }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Critical Temperature (°F)</Label>
                <Slider
                  value={[safetySettings.criticalTempThreshold]}
                  onValueChange={(value) => setSafetySettings(prev => ({ ...prev, criticalTempThreshold: value[0] }))}
                  max={110}
                  min={80}
                  step={1}
                  className="w-full"
                />
                <div className="text-sm text-slate-400">{safetySettings.criticalTempThreshold}°F</div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Max CO₂ Level (ppm)</Label>
                <Slider
                  value={[safetySettings.maxCo2Threshold]}
                  onValueChange={(value) => setSafetySettings(prev => ({ ...prev, maxCo2Threshold: value[0] }))}
                  max={5000}
                  min={1000}
                  step={100}
                  className="w-full"
                />
                <div className="text-sm text-slate-400">{safetySettings.maxCo2Threshold} ppm</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Controls */}
        <Alert className="border-red-500/20 bg-red-950/10">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-200">
            Emergency controls are available for immediate shutdown of all automation systems. Use only in critical situations.
          </AlertDescription>
          <div className="mt-3 flex space-x-3">
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Power className="w-4 h-4 mr-2" />
              Emergency Shutdown
            </Button>
            <Button
              variant="outline"
              className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause All Systems
            </Button>
          </div>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SafetyFeatures;