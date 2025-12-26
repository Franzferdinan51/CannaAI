'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Calendar,
  Home,
  Cpu,
  Lock,
  Unlock,
  Bell,
  BarChart3,
  MapPin
} from 'lucide-react';

// UI Components - Temporarily disabled for testing
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
// import { Button } from '../../ui/button';
// import { Switch } from '../../ui/switch';
// import { Badge } from '../../ui/badge';
// import { Progress } from '../../ui/progress';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
// import { Alert, AlertDescription } from '../../ui/alert';

// Import automation components
import { AutomationDashboard } from './AutomationDashboard';
import { EnvironmentalControls } from './EnvironmentalControls';
import { IrrigationControl } from './IrrigationControl';
import { LightingControl } from './LightingControl';
import { ClimateControl } from './ClimateControl';
import { ManualOverride } from './ManualOverride';
import { SafetyFeatures } from './SafetyFeatures';
import { AutomationScheduling } from './AutomationScheduling';
import { AutomationHistory } from './AutomationHistory';

// Import hooks and utilities (simplified for this component)
import { useState, useCallback, useEffect } from 'react';

// Mock implementation of useAutomationAPI hook
const useAutomationAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        enabled: true,
        uptime: 86400,
        lastUpdate: new Date(),
        systems: {
          watering: { enabled: true, active: false },
          lighting: { enabled: true, active: true },
          climate: { enabled: true, active: false }
        }
      };
    } catch (err) {
      setError('Failed to get status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getStatus,
    updateWatering: async () => {},
    updateLighting: async () => {},
    updateClimate: async () => {},
    executeManualOverride: async () => {}
  };
};

// Mock implementation of useAutomationSocket hook
const useAutomationSocket = () => {
  const [connected, setConnected] = useState(true);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [realTimeLogs, setRealTimeLogs] = useState([]);

  useEffect(() => {
    // Mock socket connection
    setConnected(true);
  }, []);

  const emitCommand = useCallback((event: string, data: any) => {
    console.log('Emitting command:', event, data);
  }, []);

  return {
    connected,
    automationStatus,
    safetyAlerts,
    realTimeLogs,
    emitCommand
  };
};

// Import utilities directly to avoid circular imports
const automationUtils = {
  calculateVPD: (tempF: number, humidity: number): number => {
    const tempC = (tempF - 32) * 5 / 9;
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    const vpd = svp * (1 - humidity / 100);
    return Math.round(vpd * 100) / 100;
  },
  formatDuration: (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  },
  validateCron: (cron: string): boolean => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return false;
    const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
    return parts.every((part, index) => {
      if (part === '*') return true;
      const num = parseInt(part);
      return !isNaN(num) && num >= ranges[index][0] && num <= ranges[index][1];
    });
  }
};

// Import types
import {
  AutomationStatus,
  SafetyAlert,
  AutomationLog,
  RoomConfig,
  WateringConfig,
  LightingConfig,
  ClimateConfig
} from './types';

interface AutomationProps {
  className?: string;
  initialView?: 'dashboard' | 'controls' | 'scheduling' | 'history' | 'safety';
}

const Automation: React.FC<AutomationProps> = ({
  className = '',
  initialView = 'dashboard'
}) => {
  // State management
  const [activeView, setActiveView] = useState<AutomationProps['initialView']>(initialView);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [isGlobalEnabled, setIsGlobalEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hooks
  const {
    getStatus,
    updateWatering,
    updateLighting,
    updateClimate,
    executeManualOverride,
    loading: apiLoading
  } = useAutomationAPI();

  const {
    connected,
    automationStatus,
    safetyAlerts,
    realTimeLogs,
    emitCommand
  } = useAutomationSocket();

  // Load initial data
  useEffect(() => {
    loadAutomationData();
  }, []);

  const loadAutomationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const status = await getStatus();
      // Update local state with automation status
      setIsGlobalEnabled(status?.enabled ?? true);

    } catch (err) {
      console.error('Failed to load automation data:', err);
      setError('Failed to load automation system');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle global enable/disable
  const handleGlobalToggle = async (enabled: boolean) => {
    try {
      setIsGlobalEnabled(enabled);
      // You would make an API call here to update global status
      await emitCommand('global-toggle', { enabled });
    } catch (err) {
      console.error('Failed to toggle automation:', err);
      setError('Failed to update automation status');
      setIsGlobalEnabled(!enabled); // Revert on error
    }
  };

  // Handle system selection
  const handleSystemSelect = (system: string) => {
    setSelectedSystem(system);
  };

  // Navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      description: 'Overview and quick controls'
    },
    {
      id: 'controls',
      label: 'Controls',
      icon: <Cpu className="w-5 h-5" />,
      description: 'System controls and settings'
    },
    {
      id: 'scheduling',
      label: 'Scheduling',
      icon: <Calendar className="w-5 h-5" />,
      description: 'Automation schedules'
    },
    {
      id: 'history',
      label: 'History',
      icon: <History className="w-5 h-5" />,
      description: 'Activity logs and history'
    },
    {
      id: 'safety',
      label: 'Safety',
      icon: <Shield className="w-5 h-5" />,
      description: 'Safety features and alerts'
    }
  ];

  // System control items
  const systemControls = [
    {
      id: 'environmental',
      label: 'Environmental',
      icon: <Thermometer className="w-4 h-4" />,
      description: 'Temperature and humidity control',
      component: EnvironmentalControls
    },
    {
      id: 'irrigation',
      label: 'Irrigation',
      icon: <Droplets className="w-4 h-4" />,
      description: 'Watering and nutrient management',
      component: IrrigationControl
    },
    {
      id: 'lighting',
      label: 'Lighting',
      icon: <Lightbulb className="w-4 h-4" />,
      description: 'Light schedules and intensity',
      component: LightingControl
    },
    {
      id: 'climate',
      label: 'Climate',
      icon: <Wind className="w-4 h-4" />,
      description: 'Air quality and circulation',
      component: ClimateControl
    }
  ];

  // Calculate system statistics
  const systemStats = {
    totalSystems: systemControls.length,
    activeSystems: systemControls.length, // This would come from actual status
    alerts: safetyAlerts.length,
    uptime: automationStatus?.uptime || 0,
    lastUpdate: automationStatus?.lastUpdate || new Date()
  };

  if (isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center">
          <Bot className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading automation system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Automation Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={loadAutomationData} variant="outline">
            Retry
          </Button>
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
              <Bot className="w-8 h-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Automation System</h1>
                <p className="text-sm text-gray-400">Environmental controls and automation</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6 ml-8">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{systemStats.activeSystems}/{systemStats.totalSystems} active</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">{systemStats.alerts} alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-gray-300">{automationUtils.formatDuration(systemStats.uptime)}</span>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1 rounded ${connected ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={`text-sm ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {connected ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Global Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={isGlobalEnabled}
                onCheckedChange={handleGlobalToggle}
                disabled={apiLoading}
              />
              <span className="text-sm text-gray-300">
                {isGlobalEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? 'default' : 'ghost'}
              onClick={() => setActiveView(item.id as any)}
              className="flex items-center gap-2"
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeView === 'dashboard' && (
              <AutomationDashboard
                onSystemSelect={handleSystemSelect}
                onViewChange={(view) => setActiveView(view as any)}
              />
            )}

            {activeView === 'controls' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">System Controls</h2>
                    <p className="text-gray-400">Manage and configure automation systems</p>
                  </div>

                  {/* System Control Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {systemControls.map((system) => {
                      const Component = system.component;
                      return (
                        <Card key={system.id} className="bg-gray-800 border-gray-700">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-900/30 rounded-lg">
                                {system.icon}
                              </div>
                              <div>
                                <CardTitle className="text-white">{system.label}</CardTitle>
                                <CardDescription className="text-gray-400">
                                  {system.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Component />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Manual Override Section */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Manual Override
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Temporary manual control of automation systems
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ManualOverride />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeView === 'scheduling' && (
              <AutomationScheduling />
            )}

            {activeView === 'history' && (
              <AutomationHistory />
            )}

            {activeView === 'safety' && (
              <div className="h-full overflow-y-auto p-6">
                <SafetyFeatures />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Automation;