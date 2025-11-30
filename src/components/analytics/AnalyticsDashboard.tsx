"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Zap,
  Droplets,
  Thermometer,
  Percent,
  Sun,
  Brain,
  Globe,
  Server,
  Database,
  Loader2,
  Eye,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Color scheme for charts
const COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#3b82f6', // blue-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  success: '#10b981', // emerald-500
  info: '#06b6d4', // cyan-500
  purple: '#8b5cf6',
  pink: '#ec4899',
  gradient: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
};

const RADIAN = Math.PI / 180;

interface AnalyticsDashboardProps {
  roomId?: string;
  plantId?: string;
}

export function AnalyticsDashboard({ roomId, plantId }: AnalyticsDashboardProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!mounted) return;

    const socketInstance = io({
      path: '/api/socketio',
    });

    socketInstance.on('connect', () => {
      console.log('Analytics Dashboard: WebSocket connected');
    });

    socketInstance.on('analytics-update', (data) => {
      // Invalidate and refetch queries when new data arrives
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    socketInstance.on('disconnect', () => {
      console.log('Analytics Dashboard: WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [mounted, queryClient]);

  // Fetch metrics data
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics', 'metrics', timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/metrics?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch plant health data
  const { data: plantHealthData, isLoading: healthLoading } = useQuery({
    queryKey: ['analytics', 'plant-health', timeframe, plantId],
    queryFn: async () => {
      const params = new URLSearchParams({ timeframe });
      if (plantId) params.append('plantId', plantId);
      const res = await fetch(`/api/analytics/plant-health?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch plant health data');
      return res.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Fetch sensor data
  const { data: sensorData, isLoading: sensorLoading } = useQuery({
    queryKey: ['analytics', 'sensors', timeframe, roomId],
    queryFn: async () => {
      const params = new URLSearchParams({ timeframe });
      if (roomId) params.append('roomId', roomId);
      const res = await fetch(`/api/analytics/sensors?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sensor data');
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch performance data
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['analytics', 'performance', timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/performance?timeframe=${timeframe}`);
      if (!res.ok) throw new Error('Failed to fetch performance data');
      return res.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Export data function
  const handleExport = async (type: string, format: 'csv' | 'json') => {
    const url = `/api/analytics/export?type=${type}&format=${format}&timeframe=${timeframe}`;
    window.open(url, '_blank');
  };

  const isLoading = metricsLoading || healthLoading || sensorLoading || performanceLoading;

  if (!mounted) return null;

  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Metrics Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {plantHealthData?.data?.summary?.totalAnalyses || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Plant health analyses completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">
            {performanceData?.data?.summary?.successRate?.toFixed(1) || 0}%
          </div>
          <Progress
            value={performanceData?.data?.summary?.successRate || 0}
            className="mt-2"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {performanceData?.data?.summary?.avgResponseTime?.toFixed(0) || 0}ms
          </div>
          <p className="text-xs text-muted-foreground">
            API endpoint performance
          </p>
        </CardContent>
      </Card>

      {/* Plant Health Distribution Chart */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Plant Health Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(
                    plantHealthData?.data?.summary?.statusDistribution || {}
                  ).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(
                    plantHealthData?.data?.summary?.statusDistribution || {}
                  ).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS.gradient[index % COLORS.gradient.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* API Status Codes */}
      <Card>
        <CardHeader>
          <CardTitle>API Status Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              performanceData?.data?.summary?.statusCodeDistribution || {}
            ).map(([code, count]) => (
              <div key={code} className="flex items-center justify-between">
                <span className="text-sm font-medium">HTTP {code}</span>
                <Badge variant={parseInt(code) < 400 ? 'default' : 'destructive'}>
                  {count as number}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time Trend */}
      <Card className="col-span-1 md:col-span-3">
        <CardHeader>
          <CardTitle>Response Time Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={performanceData?.data?.trends || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="avgResponseTime"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#colorResponseTime)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPlantHealthTab = () => (
    <div className="space-y-6">
      {/* Health Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Plant Health Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plantHealthData?.data?.summary?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Average Score"
                />
                <Line
                  type="monotone"
                  dataKey="minScore"
                  stroke={COLORS.warning}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Minimum Score"
                />
                <Line
                  type="monotone"
                  dataKey="maxScore"
                  stroke={COLORS.success}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Maximum Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Top Plant Health Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plantHealthData?.data?.topIssues?.length > 0 ? (
              plantHealthData.data.topIssues.map((issue: any, index: number) => (
                <div key={issue.issue} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="text-sm font-medium">{issue.issue}</span>
                  </div>
                  <Badge variant="secondary">{issue.count} occurrences</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No issues recorded</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSensorTab = () => (
    <div className="space-y-6">
      {/* Sensor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sensorData?.data?.summary?.totalReadings || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {sensorData?.data?.summary?.statusDistribution?.normal || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {sensorData?.data?.summary?.statusDistribution?.critical || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sensor Time Series */}
      <Card>
        <CardHeader>
          <CardTitle>Sensor Readings Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData?.data?.timeSeriesData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgReading"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Average Reading"
                />
                <Line
                  type="monotone"
                  dataKey="avgAnomaly"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  name="Anomaly Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData?.data?.summary?.totalRequests || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {performanceData?.data?.summary?.successRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData?.data?.summary?.avgResponseTime?.toFixed(0) || 0}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">P95 Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData?.data?.summary?.p95ResponseTime?.toFixed(0) || 0}ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData?.data?.topErrors?.length > 0 ? (
                performanceData.data.topErrors.map((error: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{error.error}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{error.count}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No errors recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('summary', 'csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plant-health">Plant Health</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="plant-health" className="space-y-4">
          {renderPlantHealthTab()}
        </TabsContent>

        <TabsContent value="sensors" className="space-y-4">
          {renderSensorTab()}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {renderPerformanceTab()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
