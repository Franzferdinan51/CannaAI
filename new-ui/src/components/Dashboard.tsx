'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Brain,
  Bot,
  Thermometer,
  Droplets,
  Sun,
  Activity,
  Sprout,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Cloud,
  Wind,
  Plus,
  Bell,
  Menu,
  X,
  Loader2,
  ZapIcon,
  Flame,
  Snowflake,
  AirVent,
  LightbulbOff,
  Volume2,
  VolumeX,
  Settings,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { ScrollArea } from './ui/ScrollArea';
import { Alert } from './ui/Alert';
import { Progress } from './ui/Progress';

import { SensorData, Notification, DashboardTab, EnvironmentalStat } from '../types';

import { PhotoAnalysis } from './PhotoAnalysis';
import { AIAssistantSidebar } from './AIAssistantSidebar';
import { apiClient } from '../services/api';

interface DashboardProps {
  initialTab?: string;
  onNotification?: (notification: Notification) => void;
  className?: string;
}

// Chart components (simplified for this port)
const SensorChart = ({ data, type }: { data: any[]; type: 'temperature' | 'humidity' }) => {
  const maxValue = Math.max(...data.map(d => type === 'temperature' ? d.temp : d.hum));
  const minValue = Math.min(...data.map(d => type === 'temperature' ? d.temp : d.hum));
  const range = maxValue - minValue;

  return (
    <div className="h-48 w-full flex items-end justify-between space-x-1 bg-slate-900/30 rounded-lg p-4">
      {data.map((point, index) => {
        const value = type === 'temperature' ? point.temp : point.hum;
        const height = range > 0 ? ((value - minValue) / range) * 100 : 50;

        return (
          <div
            key={index}
            className="flex-1 bg-emerald-500/30 hover:bg-emerald-500/50 transition-colors rounded-t"
            style={{ height: `${height}%` }}
            title={`${point.time}: ${value}`}
          />
        );
      })}
    </div>
  );
};

// Environmental Stats Component
const EnvironmentalStats = ({ sensorData }: { sensorData: SensorData }) => {
  const stats: EnvironmentalStat[] = [
    {
      label: 'Temperature',
      value: `${Math.round(sensorData.temperature)}°F`,
      icon: Thermometer,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20'
    },
    {
      label: 'Humidity',
      value: `${sensorData.humidity}%`,
      icon: Droplets,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      label: 'Light Intensity',
      value: `${sensorData.lightIntensity}μmol`,
      icon: Sun,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20'
    },
    {
      label: 'pH Level',
      value: sensorData.ph.toFixed(1),
      icon: FlaskConical,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      label: 'EC Level',
      value: `${sensorData.ec} mS/cm`,
      icon: ZapIcon,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    {
      label: 'CO2',
      value: `${sensorData.co2} ppm`,
      icon: Wind,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20'
    },
    {
      label: 'VPD',
      value: `${sensorData.vpd} kPa`,
      icon: Cloud,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20'
    },
    {
      label: 'Soil Moisture',
      value: `${sensorData.soilMoisture}%`,
      icon: Droplets,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/60 transition-all duration-300 group">
          <Card.Content className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                  {stat.label}
                </p>
                <h3 className="text-xl font-bold text-slate-100 mt-1">
                  {stat.value}
                </h3>
              </div>
              <div className={`p-2 rounded-full ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
};

// Quick Actions Component
const QuickActions = () => {
  const actions = [
    {
      icon: Plus,
      label: 'New Grow',
      description: 'Start a new cultivation cycle',
      color: 'bg-emerald-600 hover:bg-emerald-500'
    },
    {
      icon: Brain,
      label: 'Quick Analysis',
      description: 'Analyze plant health',
      color: 'bg-blue-600 hover:bg-blue-500'
    },
    {
      icon: Thermometer,
      label: 'Environment',
      description: 'View environmental data',
      color: 'bg-orange-600 hover:bg-orange-500'
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'Configure system settings',
      color: 'bg-slate-600 hover:bg-slate-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Card key={index} className="border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/60 transition-all duration-300 cursor-pointer group">
          <Card.Content className="p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-slate-100">{action.label}</h4>
                <p className="text-xs text-slate-400 mt-1">{action.description}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
};

// Recent Activity Component
const RecentActivity = ({ notifications }: { notifications: Notification[] }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'alert':
      case 'error':
        return AlertCircle;
      case 'success':
        return CheckCircle;
      case 'info':
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'alert':
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'success':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'info':
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <Card.Header>
        <Card.Title className="text-slate-100 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-emerald-400" />
          Recent Activity
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = getActivityIcon(notification.type);
                const colorClass = getActivityColor(notification.type);

                return (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <div className={`p-2 rounded-lg border ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card.Content>
    </Card>
  );
};

export function Dashboard({ initialTab = 'overview', onNotification, className = '' }: DashboardProps) {
  // State management
  const [activeTab, setActiveTab] = useState(initialTab);
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 22.5,
    humidity: 55,
    soilMoisture: 45,
    lightIntensity: 750,
    ph: 6.2,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85
  });
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'alert',
      message: 'pH levels dropping below optimal range',
      time: '2 min ago'
    },
    {
      id: 2,
      type: 'info',
      message: 'Automated watering cycle completed successfully',
      time: '15 min ago'
    }
  ]);
  const [strains, setStrains] = useState<any[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const socketRef = useRef<any>(null);

  // Dashboard tabs configuration
  const tabs: DashboardTab[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis', label: 'AI Analysis', icon: Brain },
    { id: 'environment', label: 'Environment', icon: Thermometer },
    { id: 'strains', label: 'Strain Database', icon: Sprout },
    { id: 'automation', label: 'Automation', icon: Bot }
  ];

  // Initialize data
  useEffect(() => {
    loadStrains();
    initializeWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Load strains data
  const loadStrains = async () => {
    try {
      const response = await apiClient.getStrains();
      setStrains(response.strains || []);
    } catch (error) {
      console.error('Failed to load strains:', error);
    }
  };

  // Initialize WebSocket connection for real-time sensor data
  const initializeWebSocket = () => {
    try {
      const serverUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin
        : `http://${window.location.hostname}:3000`;

      // In a real implementation, you would use socket.io-client here
      // For now, we'll simulate real-time updates with setInterval
      const interval = setInterval(() => {
        // Simulate sensor data fluctuations
        setSensorData(prev => ({
          ...prev,
          temperature: prev.temperature + (Math.random() - 0.5) * 0.5,
          humidity: Math.max(30, Math.min(80, prev.humidity + (Math.random() - 0.5) * 2)),
          lightIntensity: prev.lightIntensity + (Math.random() - 0.5) * 50,
          ph: Math.max(5.5, Math.min(7.0, prev.ph + (Math.random() - 0.5) * 0.1)),
          vpd: prev.vpd + (Math.random() - 0.5) * 0.05
        }));
      }, 5000);

      return () => clearInterval(interval);
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
    }
  };

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setShowMobileMenu(false);
  };

  // Add notification
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only last 10
    onNotification?.(notification);
  }, [onNotification]);

  // Handle analysis complete
  const handleAnalysisComplete = (result: any) => {
    addNotification({
      id: Date.now(),
      type: 'info',
      message: `Plant analysis completed successfully`,
      time: 'Just now'
    });
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Environmental Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-100">Environmental Status</h3>
              <EnvironmentalStats sensorData={sensorData} />
            </div>

            {/* Charts and Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Temperature Chart */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <Card.Header>
                  <Card.Title className="text-slate-100">Temperature Trend</Card.Title>
                </Card.Header>
                <Card.Content>
                  <SensorChart
                    data={[
                      { time: '00:00', temp: sensorData.temperature - 1 },
                      { time: '04:00', temp: sensorData.temperature - 0.5 },
                      { time: '08:00', temp: sensorData.temperature },
                      { time: '12:00', temp: sensorData.temperature + 1 },
                      { time: '16:00', temp: sensorData.temperature + 0.5 },
                      { time: '20:00', temp: sensorData.temperature },
                      { time: '24:00', temp: sensorData.temperature - 0.5 }
                    ]}
                    type="temperature"
                  />
                </Card.Content>
              </Card>

              {/* Humidity Chart */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <Card.Header>
                  <Card.Title className="text-slate-100">Humidity Trend</Card.Title>
                </Card.Header>
                <Card.Content>
                  <SensorChart
                    data={[
                      { time: '00:00', hum: sensorData.humidity + 5 },
                      { time: '04:00', hum: sensorData.humidity + 3 },
                      { time: '08:00', hum: sensorData.humidity },
                      { time: '12:00', hum: sensorData.humidity - 2 },
                      { time: '16:00', hum: sensorData.humidity - 1 },
                      { time: '20:00', hum: sensorData.humidity + 1 },
                      { time: '24:00', hum: sensorData.humidity + 3 }
                    ]}
                    type="humidity"
                  />
                </Card.Content>
              </Card>
            </div>

            {/* Recent Activity */}
            <RecentActivity notifications={notifications} />
          </div>
        );

      case 'analysis':
        return (
          <PhotoAnalysis
            strains={strains}
            sensorData={sensorData}
            onAnalysisComplete={handleAnalysisComplete}
            onNotification={addNotification}
          />
        );

      case 'environment':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Conditions */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <Card.Header>
                  <Card.Title className="text-slate-100">Current Conditions</Card.Title>
                </Card.Header>
                <Card.Content>
                  <EnvironmentalStats sensorData={sensorData} />
                </Card.Content>
              </Card>

              {/* Environmental Controls */}
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                <Card.Header>
                  <Card.Title className="text-slate-100">Environmental Controls</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Temperature Control</span>
                      <Button size="sm" variant="outline">
                        <Flame className="w-4 h-4 mr-2" />
                        Heat
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Cooling System</span>
                      <Button size="sm" variant="outline">
                        <Snowflake className="w-4 h-4 mr-2" />
                        Cool
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Ventilation</span>
                      <Button size="sm" variant="outline">
                        <AirVent className="w-4 h-4 mr-2" />
                        Vent
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Lighting</span>
                      <Button size="sm" variant="outline">
                        <LightbulbOff className="w-4 h-4 mr-2" />
                        Lights
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Humidifier</span>
                      <Button size="sm" variant="outline">
                        <Droplets className="w-4 h-4 mr-2" />
                        Mist
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>

            {/* Environmental Alerts */}
            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
              <Card.Header>
                <Card.Title className="text-slate-100">Environmental Alerts</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {sensorData.temperature > 28 && (
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>High Temperature Alert</AlertTitle>
                      <AlertDescription>
                        Temperature is above optimal range. Consider activating cooling system.
                      </AlertDescription>
                    </Alert>
                  )}
                  {sensorData.humidity < 40 && (
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Low Humidity Alert</AlertTitle>
                      <AlertDescription>
                        Humidity is below optimal range. Consider activating humidifier.
                      </AlertDescription>
                    </Alert>
                  )}
                  {sensorData.ph < 5.8 || sensorData.ph > 6.5 && (
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>pH Level Alert</AlertTitle>
                      <AlertDescription>
                        pH level is outside optimal range. Adjust nutrient solution.
                      </AlertDescription>
                    </Alert>
                  )}
                  {sensorData.temperature <= 28 && sensorData.humidity >= 40 && sensorData.ph >= 5.8 && sensorData.ph <= 6.5 && (
                    <Alert variant="success">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>All Systems Optimal</AlertTitle>
                      <AlertDescription>
                        Environmental conditions are within optimal ranges.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card.Content>
            </Card>
          </div>
        );

      case 'strains':
        return (
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title className="text-slate-100">Strain Database</Card.Title>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Strain
                  </Button>
                </div>
              </Card.Header>
              <Card.Content>
                {strains.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Sprout className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No strains in database</p>
                    <p className="text-sm mt-2">Add your first strain to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {strains.map((strain) => (
                      <Card key={strain.id} className="border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <Card.Content className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-slate-100">{strain.name}</h4>
                              <p className="text-xs text-slate-400 mt-1">{strain.type}</p>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{strain.description}</p>
                            </div>
                            {strain.isPurpleStrain && (
                              <Badge className="bg-purple-600">Purple</Badge>
                            )}
                          </div>
                        </Card.Content>
                      </Card>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        );

      case 'automation':
        return (
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
              <Card.Header>
                <Card.Title className="text-slate-100">Automation Controls</Card.Title>
              </Card.Header>
              <Card.Content className="space-y-6">
                {/* Lighting Schedule */}
                <div className="space-y-3">
                  <h4 className="text-medium font-medium text-slate-100">Lighting Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Vegetative Stage</label>
                      <div className="flex items-center space-x-2">
                        <Input type="time" defaultValue="06:00" className="bg-slate-950/50 border-slate-700" />
                        <span className="text-slate-400">to</span>
                        <Input type="time" defaultValue="00:00" className="bg-slate-950/50 border-slate-700" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Flowering Stage</label>
                      <div className="flex items-center space-x-2">
                        <Input type="time" defaultValue="06:00" className="bg-slate-950/50 border-slate-700" />
                        <span className="text-slate-400">to</span>
                        <Input type="time" defaultValue="18:00" className="bg-slate-950/50 border-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watering Schedule */}
                <div className="space-y-3">
                  <h4 className="text-medium font-medium text-slate-100">Watering Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Frequency</label>
                      <Select defaultValue="daily">
                        <Select.Trigger className="bg-slate-950/50 border-slate-700">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content className="bg-slate-900 border-slate-700">
                          <Select.Item value="daily">Daily</Select.Item>
                          <Select.Item value="twice">Twice Daily</Select.Item>
                          <Select.Item value="custom">Custom</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Duration (seconds)</label>
                      <Input type="number" defaultValue="30" className="bg-slate-950/50 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300">Moisture Threshold (%)</label>
                      <Input type="number" defaultValue="40" className="bg-slate-950/50 border-slate-700" />
                    </div>
                  </div>
                </div>

                {/* Environmental Controls */}
                <div className="space-y-3">
                  <h4 className="text-medium font-medium text-slate-100">Environmental Controls</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Temperature Control</span>
                        <Button size="sm" variant="outline">Configure</Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Min Temp</span>
                          <span className="text-slate-200">20°C</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Max Temp</span>
                          <span className="text-slate-200">26°C</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Humidity Control</span>
                        <Button size="sm" variant="outline">Configure</Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Min Humidity</span>
                          <span className="text-slate-200">40%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Max Humidity</span>
                          <span className="text-slate-200">60%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-slate-400">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Tab content not available</p>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden ${className}`}>
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Sprout className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-lg font-bold text-slate-100">CannaAI Pro</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400"
            onClick={() => setShowMobileMenu(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:translate-x-1'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${
                  activeTab === tab.id ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400/70 transition-colors'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900/30">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-slate-900/30 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400"
            onClick={() => setShowMobileMenu(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center space-x-4 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Grow
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
              )}
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* AI Assistant Sidebar */}
      <AIAssistantSidebar
        sensorData={sensorData}
        currentModel={{
          name: 'CannaAI Assistant',
          provider: 'auto',
          hasVision: true,
          isAvailable: true
        }}
        initialContext={{
          page: activeTab,
          title: `CannaAI Pro - ${activeTab}`,
          data: {
            sensorData,
            activeTab
          }
        }}
        onToggleCollapse={setAiSidebarOpen}
      />
    </div>
  );
}