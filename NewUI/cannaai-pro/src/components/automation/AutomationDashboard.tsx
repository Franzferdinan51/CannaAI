'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Activity,
  Droplets,
  Lightbulb,
  Thermometer,
  Wind,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Power,
  Pause,
  Play,
  History,
  TrendingUp,
  Zap,
  Gauge,
  Timer,
  Calendar
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { EnvironmentalControls } from './EnvironmentalControls';
import { AutomationScheduling } from './AutomationScheduling';
import { IrrigationControl } from './IrrigationControl';
import { LightingControl } from './LightingControl';
import { ClimateControl } from './ClimateControl';
import { AutomationHistory } from './AutomationHistory';
import { ManualOverride } from './ManualOverride';
import { SafetyFeatures } from './SafetyFeatures';

import {
  SensorData,
  RoomConfig,
  WateringConfig,
  LightingConfig,
  ClimateConfig,
  AutomationStatus,
  AutomationLog
} from './types';

interface AutomationDashboardProps {
  sensorData: SensorData;
  rooms: RoomConfig[];
  initialAutomationSettings?: any;
  className?: string;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({
  sensorData,
  rooms,
  initialAutomationSettings,
  className = ''
}) => {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    watering: { active: false, lastRun: '', nextRun: '', status: 'idle' },
    lighting: { active: true, schedule: '18/6', status: 'running' },
    climate: { active: true, status: 'maintaining' },
    co2: { active: false, status: 'idle' }
  });
  const [recentLogs, setRecentLogs] = useState<AutomationLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Calculate overall system health
  const systemHealth = {
    overall: automationEnabled ? 'healthy' : 'paused',
    activeSystems: Object.values(automationStatus).filter(s => s.active).length,
    totalSystems: Object.keys(automationStatus).length,
    lastUpdate: new Date().toISOString()
  };

  const activeRooms = rooms.filter(room => room.active);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Bot className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Automation Control</h2>
            <p className="text-slate-400">Environmental controls and automation systems</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Master Control</span>
            <Switch
              checked={automationEnabled}
              onCheckedChange={setAutomationEnabled}
              disabled={false}
            />
          </div>

          <Badge variant={systemHealth.overall === 'healthy' ? 'default' : 'secondary'}
                 className={`${systemHealth.overall === 'healthy'
                   ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                   : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'}`}>
            {systemHealth.overall === 'healthy' ? 'All Systems Operational' : 'System Paused'}
          </Badge>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Watering',
            icon: Droplets,
            status: automationStatus.watering.status,
            active: automationStatus.watering.active,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
          },
          {
            title: 'Lighting',
            icon: Lightbulb,
            status: automationStatus.lighting.status,
            active: automationStatus.lighting.active,
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20'
          },
          {
            title: 'Climate',
            icon: Thermometer,
            status: automationStatus.climate.status,
            active: automationStatus.climate.active,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20'
          },
          {
            title: 'CO₂ Control',
            icon: Wind,
            status: automationStatus.co2.status,
            active: automationStatus.co2.active,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
          }
        ].map((system, index) => (
          <Card key={index} className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm
            ${system.active ? 'ring-1 ring-emerald-500/20' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-full ${system.bgColor} ${system.borderColor} border`}>
                  <system.icon className={`w-5 h-5 ${system.color}`} />
                </div>
                <div className={`w-2 h-2 rounded-full ${system.active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              </div>

              <h3 className="text-lg font-semibold text-slate-100 mb-1">{system.title}</h3>
              <p className="text-sm text-slate-400 capitalize">{system.status}</p>

              {system.active && (
                <div className="mt-3">
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Environmental Status */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-emerald-400" />
            Current Environmental Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Temperature', value: `${sensorData.temperature}°F`, icon: Thermometer, color: 'text-orange-400' },
              { label: 'Humidity', value: `${sensorData.humidity}%`, icon: Droplets, color: 'text-blue-400' },
              { label: 'CO₂', value: `${sensorData.co2} ppm`, icon: Wind, color: 'text-green-400' },
              { label: 'Soil Moisture', value: `${sensorData.soilMoisture}%`, icon: Droplets, color: 'text-cyan-400' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="text-xl font-bold text-slate-100">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Gauge className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="environmental" className="flex items-center space-x-2">
            <Thermometer className="w-4 h-4" />
            <span className="hidden sm:inline">Environmental</span>
          </TabsTrigger>
          <TabsTrigger value="lighting" className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Lighting</span>
          </TabsTrigger>
          <TabsTrigger value="irrigation" className="flex items-center space-x-2">
            <Droplets className="w-4 h-4" />
            <span className="hidden sm:inline">Irrigation</span>
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Scheduling</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnvironmentalControls
              sensorData={sensorData}
              rooms={activeRooms}
              automationEnabled={automationEnabled}
            />

            <ManualOverride
              automationStatus={automationStatus}
              onUpdateStatus={setAutomationStatus}
              disabled={!automationEnabled}
            />
          </div>

          <SafetyFeatures
            alerts={alerts}
            systemHealth={systemHealth}
            automationEnabled={automationEnabled}
          />
        </TabsContent>

        <TabsContent value="environmental" className="space-y-6">
          <ClimateControl
            sensorData={sensorData}
            rooms={activeRooms}
            automationEnabled={automationEnabled}
            onStatusUpdate={(status) => setAutomationStatus(prev => ({
              ...prev,
              climate: { ...prev.climate, ...status }
            }))}
          />
        </TabsContent>

        <TabsContent value="lighting" className="space-y-6">
          <LightingControl
            rooms={activeRooms}
            automationEnabled={automationEnabled}
            onStatusUpdate={(status) => setAutomationStatus(prev => ({
              ...prev,
              lighting: { ...prev.lighting, ...status }
            }))}
          />
        </TabsContent>

        <TabsContent value="irrigation" className="space-y-6">
          <IrrigationControl
            sensorData={sensorData}
            rooms={activeRooms}
            automationEnabled={automationEnabled}
            onStatusUpdate={(status) => setAutomationStatus(prev => ({
              ...prev,
              watering: { ...prev.watering, ...status }
            }))}
          />
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <AutomationScheduling
            rooms={activeRooms}
            automationStatus={automationStatus}
            onScheduleUpdate={(updates) => {
              // Handle schedule updates
              console.log('Schedule updates:', updates);
            }}
            disabled={!automationEnabled}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AutomationHistory
            logs={recentLogs}
            systemHealth={systemHealth}
            automationStatus={automationStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDashboard;