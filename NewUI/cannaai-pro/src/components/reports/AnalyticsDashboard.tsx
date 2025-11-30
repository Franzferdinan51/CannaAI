'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ComposedChart,
  Scatter,
  ScatterChart,
  Treemap
} from 'recharts';

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  DollarSign,
  Sprout,
  Thermometer,
  Zap,
  Eye,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Settings,
  Maximize2,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  Clock,
  Award,
  FileText,
  Database
} from 'lucide-react';

import {
  AnalyticsData,
  PlantGrowthAnalytics,
  EnvironmentalAnalytics,
  FinancialAnalytics,
  YieldAnalytics,
  TimeSeriesData,
  SummaryMetrics,
  TrendData,
  GrowthData,
  InsightData
} from './types';

import { analyticsApi, mockData } from './api';
import { dateUtils, numberUtils, chartUtils } from './utils';

interface AnalyticsDashboardProps {
  className?: string;
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d' | '90d';
  autoRefresh?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
  timeRange = '30d',
  autoRefresh = true
}) => {
  // State management
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [plantGrowthData, setPlantGrowthData] = useState<PlantGrowthAnalytics[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalAnalytics[]>([]);
  const [financialData, setFinancialData] = useState<FinancialAnalytics | null>(null);
  const [yieldData, setYieldData] = useState<YieldAnalytics | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);

  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['temperature', 'humidity', 'yield']);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar' | 'scatter'>('line');
  const [showInsights, setShowInsights] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadAnalyticsData();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const dateRange = dateUtils.getDateRangePreset(selectedTimeRange);

      // Load overview analytics
      const overviewData = await analyticsApi.getOverview({ dateRange });
      if (overviewData) {
        setAnalyticsData(overviewData);
      } else {
        // Fallback to mock data
        setAnalyticsData(mockData.generateMockAnalytics());
      }

      // Load other analytics data
      const [plantData, envData, financeData, yieldDataResponse] = await Promise.all([
        analyticsApi.getPlantGrowth({ dateRange }),
        analyticsApi.getEnvironmental({ dateRange }),
        analyticsApi.getFinancial({ dateRange }),
        analyticsApi.getYield({ dateRange })
      ]);

      setPlantGrowthData(plantData);
      setEnvironmentalData(envData);
      setFinancialData(financeData);
      setYieldData(yieldDataResponse);

      // Load insights
      const insightsData = await analyticsApi.getInsights({ dateRange });
      setInsights(insightsData);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
      // Fallback to mock data
      setAnalyticsData(mockData.generateMockAnalytics());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock financial data for demonstration
  const generateMockFinancialData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      revenue: 45000 + Math.random() * 20000,
      costs: 30000 + Math.random() * 10000,
      profit: 15000 + Math.random() * 10000,
      efficiency: 75 + Math.random() * 20
    }));
  };

  const financialDataChart = useMemo(() => generateMockFinancialData(), []);

  // Generate mock yield data
  const generateMockYieldData = () => {
    const strains = ['Blue Dream', 'OG Kush', 'Girl Scout Cookies', 'Sour Diesel', 'Green Crack'];
    return strains.map(strain => ({
      name: strain,
      yield: 2.5 + Math.random() * 3,
      quality: 85 + Math.random() * 15,
      growth: 20 + Math.random() * 10
    }));
  };

  const yieldDataChart = useMemo(() => generateMockYieldData(), []);

  // Generate environmental performance data
  const generateEnvironmentalData = () => {
    const metrics = ['Temperature', 'Humidity', 'CO2', 'Light', 'VPD'];
    return metrics.map(metric => ({
      metric,
      optimal: 90 + Math.random() * 10,
      current: 70 + Math.random() * 25,
      efficiency: 75 + Math.random() * 20
    }));
  };

  const environmentalPerformance = useMemo(() => generateEnvironmentalData(), []);

  // Pie chart colors
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1D23] border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {numberUtils.formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            {(['1h', '6h', '24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  selectedTimeRange === range
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {range === '1h' ? '1 Hour' :
                 range === '6h' ? '6 Hours' :
                 range === '24h' ? '1 Day' :
                 range === '7d' ? '1 Week' :
                 range === '30d' ? '1 Month' : '3 Months'}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            {(['line', 'area', 'bar'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  chartType === type
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefreshEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>

          <button
            onClick={() => setShowInsights(!showInsights)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showInsights ? 'Hide' : 'Show'} Insights
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">847</h3>
          <p className="text-sm text-gray-400 mb-2">Total Plants</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">+12.5%</span>
            <span className="text-xs text-gray-500">from last period</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">94.2%</h3>
          <p className="text-sm text-gray-400 mb-2">Health Score</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-400">+3.1%</span>
            <span className="text-xs text-gray-500">from last period</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">$47.8k</h3>
          <p className="text-sm text-gray-400 mb-2">Revenue</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">+8.7%</span>
            <span className="text-xs text-gray-500">from last period</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Target className="w-6 h-6 text-yellow-400" />
            </div>
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">2.4kg</h3>
          <p className="text-sm text-gray-400 mb-2">Avg Yield</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-400">-1.2%</span>
            <span className="text-xs text-gray-500">from last period</span>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      {showInsights && insights.length > 0 && (
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Key Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/50'
                    : insight.severity === 'high'
                    ? 'bg-orange-500/10 border-orange-500/50'
                    : insight.severity === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/50'
                    : 'bg-blue-500/10 border-blue-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    insight.severity === 'critical' ? 'text-red-400' :
                    insight.severity === 'high' ? 'text-orange-400' :
                    insight.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                  }`} />
                  <div>
                    <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-400">{insight.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environmental Trends Chart */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-blue-400" />
            Environmental Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={analyticsData?.timeSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9ca3af"
                  tickFormatter={(value) => dateUtils.formatDate(new Date(value), 'short')}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Temperature"
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Humidity"
                />
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={analyticsData?.timeSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9ca3af"
                  tickFormatter={(value) => dateUtils.formatDate(new Date(value), 'short')}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Temperature"
                />
                <Area
                  type="monotone"
                  dataKey="humidity"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Humidity"
                />
              </AreaChart>
            ) : (
              <BarChart data={analyticsData?.timeSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9ca3af"
                  tickFormatter={(value) => dateUtils.formatDate(new Date(value), 'short')}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Temperature" />
                <Bar dataKey="humidity" fill="#10b981" name="Humidity" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Financial Performance Chart */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-400" />
            Financial Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={financialDataChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="costs" fill="#ef4444" name="Costs" />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#8b5cf6"
                strokeWidth={3}
                name="Profit"
              />
              <Line
                type="monotone"
                dataKey="efficiency"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Efficiency"
                dot={{ fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Yield Analysis */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            Yield Analysis by Strain
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yieldDataChart} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="yield" fill="#10b981" name="Yield (kg)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Environmental Performance Radar */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Environmental Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={environmentalPerformance}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" domain={[0, 100]} />
              <Radar
                name="Optimal"
                dataKey="optimal"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.3}
              />
              <Radar
                name="Current"
                dataKey="current"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics Table */}
      <div className="bg-[#1A1D23] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Detailed Metrics
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#252A33]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Current</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Average</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Min / Max</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                { name: 'Temperature', current: 24.5, avg: 23.8, min: 22.1, max: 26.2, trend: 'up', status: 'optimal' },
                { name: 'Humidity', current: 58, avg: 60, min: 45, max: 75, trend: 'down', status: 'optimal' },
                { name: 'CO2 Level', current: 1200, avg: 1150, min: 800, max: 1400, trend: 'up', status: 'optimal' },
                { name: 'Light Intensity', current: 750, avg: 720, min: 600, max: 850, trend: 'stable', status: 'optimal' },
                { name: 'pH Level', current: 6.2, avg: 6.3, min: 5.8, max: 6.8, trend: 'stable', status: 'optimal' },
              ].map((metric, index) => (
                <tr key={index} className="hover:bg-[#252A33]/50">
                  <td className="px-6 py-4 text-sm font-medium text-white">{metric.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{metric.current}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{metric.avg}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{metric.min} / {metric.max}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {metric.trend === 'up' ? (
                        <ArrowUp className="w-4 h-4 text-emerald-400" />
                      ) : metric.trend === 'down' ? (
                        <ArrowDown className="w-4 h-4 text-red-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-300 capitalize">{metric.trend}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/50">
                      {metric.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;