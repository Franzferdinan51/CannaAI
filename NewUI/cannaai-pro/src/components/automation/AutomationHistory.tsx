'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Clock,
  Calendar,
  Activity,
  Droplets,
  Lightbulb,
  Thermometer,
  Wind,
  Filter,
  Download,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Eye
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { AutomationLog, AutomationStatus } from './types';

interface AutomationHistoryProps {
  logs: AutomationLog[];
  systemHealth: any;
  automationStatus: AutomationStatus;
  className?: string;
}

export const AutomationHistory: React.FC<AutomationHistoryProps> = ({
  logs = [],
  systemHealth,
  automationStatus,
  className = ''
}) => {
  const [filteredLogs, setFilteredLogs] = useState<AutomationLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('24h');
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);

  // Mock historical data
  const [historicalLogs] = useState<AutomationLog[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      system: 'watering',
      action: 'Watering cycle completed',
      status: 'success',
      details: 'Zone A: 5 minutes, 2.5 gallons',
      duration: 300,
      triggeredBy: 'schedule',
      roomId: 'room_1',
      zoneId: 'zone_a',
      metadata: { moistureLevel: 65, flowRate: 2.5 }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      system: 'lighting',
      action: 'Lights turned on',
      status: 'success',
      details: 'All zones: 75% intensity, full spectrum',
      triggeredBy: 'schedule',
      roomId: 'room_1',
      metadata: { intensity: 75, spectrum: 'full', powerUsage: 600 }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      system: 'climate',
      action: 'Temperature adjustment',
      status: 'success',
      details: 'Cooling activated: 78°F → 75°F',
      duration: 600,
      triggeredBy: 'sensor',
      roomId: 'room_1',
      metadata: { oldTemp: 78, newTemp: 75, humidity: 55 }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      system: 'watering',
      action: 'Moisture threshold reached',
      status: 'warning',
      details: 'Zone B: Soil moisture at 18%',
      triggeredBy: 'sensor',
      roomId: 'room_2',
      zoneId: 'zone_b',
      metadata: { moistureLevel: 18, threshold: 30 }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      system: 'co2',
      action: 'CO₂ injection completed',
      status: 'success',
      details: 'Target 1200ppm reached in 15 minutes',
      duration: 900,
      triggeredBy: 'schedule',
      roomId: 'room_1',
      metadata: { targetLevel: 1200, actualLevel: 1185, injectionRate: 0.5 }
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      system: 'safety',
      action: 'High temperature alert',
      status: 'warning',
      details: 'Temperature exceeded safe threshold: 85°F',
      triggeredBy: 'sensor',
      roomId: 'room_1',
      metadata: { temperature: 85, threshold: 80, action: 'increased_cooling' }
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      system: 'manual',
      action: 'Manual watering initiated',
      status: 'success',
      details: 'User started manual watering for Zone C',
      duration: 180,
      triggeredBy: 'manual',
      roomId: 'room_2',
      zoneId: 'zone_c',
      userId: 'user_123',
      metadata: { reason: 'dry soil', duration: 3 }
    }
  ]);

  useEffect(() => {
    let filtered = [...historicalLogs, ...logs];

    // Apply system filter
    if (filterSystem !== 'all') {
      filtered = filtered.filter(log => log.system === filterSystem);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => log.status === filterStatus);
    }

    // Apply timeframe filter
    const now = new Date();
    const timeframes = {
      '1h': 1 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    if (filterTimeframe !== 'all') {
      const cutoffTime = new Date(now.getTime() - timeframes[filterTimeframe as keyof typeof timeframes]);
      filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffTime);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.system.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredLogs(filtered);
  }, [historicalLogs, logs, filterSystem, filterStatus, filterTimeframe, searchTerm]);

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'watering': return <Droplets className="w-4 h-4" />;
      case 'lighting': return <Lightbulb className="w-4 h-4" />;
      case 'climate': return <Thermometer className="w-4 h-4" />;
      case 'co2': return <Wind className="w-4 h-4" />;
      case 'safety': return <AlertTriangle className="w-4 h-4" />;
      case 'manual': return <Activity className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getTriggerIcon = (triggeredBy: string) => {
    switch (triggeredBy) {
      case 'schedule': return <Clock className="w-3 h-3" />;
      case 'sensor': return <Activity className="w-3 h-3" />;
      case 'manual': return <Eye className="w-3 h-3" />;
      case 'safety': return <AlertTriangle className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const getStatistics = () => {
    const total = filteredLogs.length;
    const successful = filteredLogs.filter(log => log.status === 'success').length;
    const warnings = filteredLogs.filter(log => log.status === 'warning').length;
    const errors = filteredLogs.filter(log => log.status === 'error').length;

    const systemStats = filteredLogs.reduce((acc, log) => {
      acc[log.system] = (acc[log.system] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgDuration = filteredLogs
      .filter(log => log.duration)
      .reduce((sum, log) => sum + (log.duration || 0), 0) /
      filteredLogs.filter(log => log.duration).length;

    return { total, successful, warnings, errors, systemStats, avgDuration };
  };

  const stats = getStatistics();

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'System', 'Action', 'Status', 'Details', 'Duration', 'Triggered By'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.system,
        log.action,
        log.status,
        log.details,
        log.duration || '',
        log.triggeredBy
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <div className="flex items-center">
            <History className="w-5 h-5 mr-2 text-purple-400" />
            Automation History
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
              onClick={exportLogs}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Total Events</p>
            <p className="text-xl font-bold text-slate-100">{stats.total}</p>
          </div>
          <div className="text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm text-slate-400">Successful</p>
            <p className="text-xl font-bold text-slate-100">{stats.successful}</p>
          </div>
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-sm text-slate-400">Warnings</p>
            <p className="text-xl font-bold text-slate-100">{stats.warnings}</p>
          </div>
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-sm text-slate-400">Avg Duration</p>
            <p className="text-xl font-bold text-slate-100">
              {stats.avgDuration ? formatDuration(Math.round(stats.avgDuration)) : 'N/A'}
            </p>
          </div>
        </div>

        {/* System Distribution */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(stats.systemStats).map(([system, count]) => (
            <div key={system} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-2">
                {getSystemIcon(system)}
                <span className="text-sm font-medium text-slate-200 capitalize">{system}</span>
              </div>
              <span className="text-sm text-slate-400">{count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-slate-300 text-sm">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="bg-slate-800/50 border-slate-700 text-slate-200 pl-10"
              />
            </div>
          </div>

          <div className="min-w-[120px]">
            <Label className="text-slate-300 text-sm">System</Label>
            <Select value={filterSystem} onValueChange={setFilterSystem}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">All Systems</SelectItem>
                <SelectItem value="watering">Watering</SelectItem>
                <SelectItem value="lighting">Lighting</SelectItem>
                <SelectItem value="climate">Climate</SelectItem>
                <SelectItem value="co2">CO₂</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <Label className="text-slate-300 text-sm">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <Label className="text-slate-300 text-sm">Timeframe</Label>
            <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-100">Recent Events</h3>
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-2 pr-4">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No logs found matching your filters</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      getStatusColor(log.status)
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getSystemIcon(log.system)}
                        <div>
                          <h4 className="font-medium text-slate-100">{log.action}</h4>
                          <p className="text-sm text-slate-300">{log.details}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 text-xs text-slate-400">
                          {getTriggerIcon(log.triggeredBy)}
                          <span className="capitalize">{log.triggeredBy}</span>
                        </div>
                        <Badge variant="outline" className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-4">
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        {log.duration && (
                          <span>Duration: {formatDuration(log.duration)}</span>
                        )}
                        {log.roomId && (
                          <span>Room: {log.roomId}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Selected Log Details */}
        {selectedLog && (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-400" />
                  Log Details
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-slate-400">Timestamp</Label>
                  <p className="text-slate-200">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-slate-400">System</Label>
                  <p className="text-slate-200 capitalize">{selectedLog.system}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Action</Label>
                  <p className="text-slate-200">{selectedLog.action}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Status</Label>
                  <Badge variant="outline" className={getStatusColor(selectedLog.status)}>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-400">Triggered By</Label>
                  <p className="text-slate-200 capitalize">{selectedLog.triggeredBy}</p>
                </div>
                {selectedLog.duration && (
                  <div>
                    <Label className="text-slate-400">Duration</Label>
                    <p className="text-slate-200">{formatDuration(selectedLog.duration)}</p>
                  </div>
                )}
                {selectedLog.roomId && (
                  <div>
                    <Label className="text-slate-400">Room</Label>
                    <p className="text-slate-200">{selectedLog.roomId}</p>
                  </div>
                )}
                {selectedLog.zoneId && (
                  <div>
                    <Label className="text-slate-400">Zone</Label>
                    <p className="text-slate-200">{selectedLog.zoneId}</p>
                  </div>
                )}
              </div>

              {selectedLog.details && (
                <div className="mt-4">
                  <Label className="text-slate-400">Details</Label>
                  <p className="text-slate-200 mt-1">{selectedLog.details}</p>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="mt-4">
                  <Label className="text-slate-400">Metadata</Label>
                  <div className="mt-1 p-3 bg-slate-800/50 rounded-lg">
                    {Object.entries(selectedLog.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-400 capitalize">{key}:</span>
                        <span className="text-slate-200">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationHistory;