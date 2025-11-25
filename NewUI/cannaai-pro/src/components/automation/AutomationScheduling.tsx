'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Timer,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Play,
  Pause,
  Repeat,
  AlertTriangle,
  CheckCircle,
  Settings,
  CalendarDays,
  Clock3
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { RoomConfig, AutomationSchedule } from '../sensors/types';
import { AutomationStatus } from './types';

interface AutomationSchedulingProps {
  rooms: RoomConfig[];
  automationStatus: AutomationStatus;
  onScheduleUpdate: (schedule: Partial<AutomationSchedule>) => void;
  disabled?: boolean;
  className?: string;
}

export const AutomationScheduling: React.FC<AutomationSchedulingProps> = ({
  rooms,
  automationStatus,
  onScheduleUpdate,
  disabled = false,
  className = ''
}) => {
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([
    {
      id: 'water_morning',
      name: 'Morning Watering',
      system: 'watering',
      enabled: true,
      schedule: '0 6 * * *', // 6:00 AM every day
      timezone: 'UTC',
      actions: [
        {
          type: 'water',
          config: { duration: 5, intensity: 100 }
        }
      ],
      priority: 1,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'water_evening',
      name: 'Evening Watering',
      system: 'watering',
      enabled: true,
      schedule: '0 18 * * *', // 6:00 PM every day
      timezone: 'UTC',
      actions: [
        {
          type: 'water',
          config: { duration: 3, intensity: 80 }
        }
      ],
      priority: 1,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lights_on',
      name: 'Lights On',
      system: 'lighting',
      enabled: true,
      schedule: '0 6 * * *', // 6:00 AM every day
      timezone: 'UTC',
      actions: [
        {
          type: 'light',
          config: { intensity: 75, spectrum: 'full' }
        }
      ],
      priority: 2,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'lights_off',
      name: 'Lights Off',
      system: 'lighting',
      enabled: true,
      schedule: '0 18 * * *', // 6:00 PM every day
      timezone: 'UTC',
      actions: [
        {
          type: 'light',
          config: { intensity: 0 }
        }
      ],
      priority: 2,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }
  ]);

  const [editingSchedule, setEditingSchedule] = useState<AutomationSchedule | null>(null);
  const [showNewSchedule, setShowNewSchedule] = useState(false);

  const cronPresets = [
    { label: 'Every Hour', value: '0 * * * *' },
    { label: 'Every 6 Hours', value: '0 */6 * * *' },
    { label: 'Every 12 Hours', value: '0 */12 * * *' },
    { label: 'Daily at 6AM', value: '0 6 * * *' },
    { label: 'Daily at 6PM', value: '0 18 * * *' },
    { label: 'Weekdays at 9AM', value: '0 9 * * 1-5' },
    { label: 'Weekends at 10AM', value: '0 10 * * 6,0' },
    { label: 'Custom', value: 'custom' }
  ];

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'watering': return '💧';
      case 'lighting': return '💡';
      case 'climate': return '🌡️';
      case 'co2': return '🌱';
      default: return '⚙️';
    }
  };

  const getSystemColor = (system: string) => {
    switch (system) {
      case 'watering': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'lighting': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'climate': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'co2': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatCronReadable = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [minute, hour, day, month, weekday] = parts;

    // Simple formatting for common patterns
    if (cron === '0 6 * * *') return 'Daily at 6:00 AM';
    if (cron === '0 18 * * *') return 'Daily at 6:00 PM';
    if (cron === '0 * * * *') return 'Every hour';
    if (cron === '0 */6 * * *') return 'Every 6 hours';
    if (cron === '0 */12 * * *') return 'Every 12 hours';
    if (cron === '0 9 * * 1-5') return 'Weekdays at 9:00 AM';
    if (cron === '0 10 * * 6,0') return 'Weekends at 10:00 AM';

    return cron;
  };

  const getNextRunTime = (schedule: string): string => {
    try {
      // This is a simplified calculation
      const now = new Date();
      const parts = schedule.split(' ');

      if (parts.length !== 5) return 'Invalid schedule';

      const [minute, hour] = parts;
      const nextRun = new Date(now);

      if (hour !== '*' && minute !== '*') {
        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        return nextRun.toLocaleString();
      }

      return 'Next execution soon';
    } catch (error) {
      return 'Invalid schedule';
    }
  };

  const handleToggleSchedule = (scheduleId: string, enabled: boolean) => {
    setSchedules(prev => prev.map(schedule =>
      schedule.id === scheduleId ? { ...schedule, enabled } : schedule
    ));
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
  };

  const handleSaveSchedule = (schedule: AutomationSchedule) => {
    if (editingSchedule) {
      setSchedules(prev => prev.map(s => s.id === schedule.id ? schedule : s));
    } else {
      setSchedules(prev => [...prev, schedule]);
    }
    setEditingSchedule(null);
    setShowNewSchedule(false);
  };

  const activeSchedules = schedules.filter(s => s.enabled).length;
  const nextExecution = schedules
    .filter(s => s.enabled)
    .sort((a, b) => new Date(a.nextRun || '').getTime() - new Date(b.nextRun || '').getTime())[0];

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-purple-400" />
            Automation Scheduling
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/20">
              {activeSchedules} Active
            </Badge>

            <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                  disabled={disabled}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Create New Schedule</DialogTitle>
                </DialogHeader>
                <ScheduleForm
                  schedule={null}
                  onSave={handleSaveSchedule}
                  onCancel={() => setShowNewSchedule(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <Timer className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-slate-400">Active Schedules</p>
            <p className="text-xl font-bold text-slate-100">{activeSchedules}</p>
          </div>
          <div className="text-center">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Total Schedules</p>
            <p className="text-xl font-bold text-slate-100">{schedules.length}</p>
          </div>
          <div className="text-center">
            <Clock3 className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm text-slate-400">Next Execution</p>
            <p className="text-lg font-bold text-slate-100">
              {nextExecution ? formatCronReadable(nextExecution.schedule) : 'None'}
            </p>
          </div>
        </div>

        {/* Schedules List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Scheduled Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id} className={`border-slate-800 bg-slate-900/40 ${
                schedule.enabled ? 'ring-1 ring-emerald-500/20' : 'opacity-60'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getSystemIcon(schedule.system)}</span>
                      <div>
                        <h4 className="font-medium text-slate-100">{schedule.name}</h4>
                        <p className="text-xs text-slate-400 capitalize">{schedule.system}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getSystemColor(schedule.system)}>
                        {formatCronReadable(schedule.schedule)}
                      </Badge>
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(enabled) => handleToggleSchedule(schedule.id, enabled)}
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Next Run:</span>
                      <span className="text-slate-200">
                        {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'Not scheduled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Priority:</span>
                      <span className="text-slate-200">Level {schedule.priority}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Actions:</span>
                      <span className="text-slate-200">{schedule.actions.length} action(s)</span>
                    </div>

                    {schedule.lastRun && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Last Run:</span>
                        <span className="text-slate-200">
                          {new Date(schedule.lastRun).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 pt-3 border-t border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                      onClick={() => setEditingSchedule(schedule)}
                      disabled={disabled}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                      disabled={disabled}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run Now
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Schedule Templates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100">Quick Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                name: 'Standard Veg',
                description: '18/6 light cycle, watering every 6 hours',
                icon: '🌱',
                schedules: ['18/6 lighting', '6-hour watering']
              },
              {
                name: 'Standard Flower',
                description: '12/12 light cycle, watering every 12 hours',
                icon: '🌸',
                schedules: ['12/12 lighting', '12-hour watering']
              },
              {
                name: 'Auto Watering',
                description: 'Moisture-based watering schedules',
                icon: '💧',
                schedules: ['Smart watering']
              },
              {
                name: 'Energy Saving',
                description: 'Optimized for minimal power usage',
                icon: '⚡',
                schedules: ['Energy optimized']
              }
            ].map((template, index) => (
              <Card key={index} className="border-slate-800 bg-slate-900/40 cursor-pointer hover:bg-slate-800/60 transition-colors">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <h4 className="font-medium text-slate-100 mb-1">{template.name}</h4>
                  <p className="text-xs text-slate-400 mb-3">{template.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                    disabled={disabled}
                  >
                    Apply Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Schedule Form Component
const ScheduleForm: React.FC<{
  schedule: AutomationSchedule | null;
  onSave: (schedule: AutomationSchedule) => void;
  onCancel: () => void;
}> = ({ schedule, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<AutomationSchedule>>({
    name: '',
    system: 'watering',
    enabled: true,
    schedule: '0 6 * * *',
    timezone: 'UTC',
    actions: [],
    priority: 1
  });

  const [selectedPreset, setSelectedPreset] = useState('0 6 * * *');
  const [customCron, setCustomCron] = useState('');

  const cronPresets = [
    { label: 'Every Hour', value: '0 * * * *' },
    { label: 'Every 6 Hours', value: '0 */6 * * *' },
    { label: 'Every 12 Hours', value: '0 */12 * * *' },
    { label: 'Daily at 6AM', value: '0 6 * * *' },
    { label: 'Daily at 6PM', value: '0 18 * * *' },
    { label: 'Weekdays at 9AM', value: '0 9 * * 1-5' },
    { label: 'Weekends at 10AM', value: '0 10 * * 6,0' }
  ];

  const handleSave = () => {
    if (!formData.name || !formData.schedule) return;

    const newSchedule: AutomationSchedule = {
      id: schedule?.id || `schedule_${Date.now()}`,
      name: formData.name,
      system: formData.system as any,
      enabled: formData.enabled ?? true,
      schedule: formData.schedule,
      timezone: formData.timezone || 'UTC',
      actions: formData.actions || [],
      priority: formData.priority || 1,
      created: schedule?.created || new Date().toISOString(),
      modified: new Date().toISOString()
    };

    onSave(newSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Schedule Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter schedule name"
            className="bg-slate-800/50 border-slate-700 text-slate-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">System</Label>
          <Select
            value={formData.system}
            onValueChange={(value) => setFormData(prev => ({ ...prev, system: value as any }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="watering">Watering</SelectItem>
              <SelectItem value="lighting">Lighting</SelectItem>
              <SelectItem value="climate">Climate</SelectItem>
              <SelectItem value="co2">CO₂</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Schedule Pattern</Label>
        <Select
          value={selectedPreset}
          onValueChange={(value) => {
            setSelectedPreset(value);
            if (value !== 'custom') {
              setFormData(prev => ({ ...prev, schedule: value }));
            }
          }}
        >
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            {cronPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom Cron Expression</SelectItem>
            </SelectContent>
        </Select>

        {selectedPreset === 'custom' && (
          <Input
            value={customCron}
            onChange={(e) => {
              setCustomCron(e.target.value);
              setFormData(prev => ({ ...prev, schedule: e.target.value }));
            }}
            placeholder="0 6 * * * (min hour day month weekday)"
            className="bg-slate-800/50 border-slate-700 text-slate-200 mt-2"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Priority</Label>
          <Select
            value={formData.priority?.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="1">High</SelectItem>
              <SelectItem value="2">Medium</SelectItem>
              <SelectItem value="3">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Timezone</Label>
          <Select
            value={formData.timezone}
            onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData(prev => ({ ...prev, enabled }))}
        />
        <Label className="text-slate-300">Enable Schedule</Label>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
          onClick={handleSave}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Schedule
        </Button>
        <Button
          variant="outline"
          className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
          onClick={onCancel}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AutomationScheduling;