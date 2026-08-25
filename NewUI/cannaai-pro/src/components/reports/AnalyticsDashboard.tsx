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

import { analyticsApi } from './api';
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
      setAnalyticsData(overviewData);

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
      setAnalyticsData(null);
      setPlantGrowthData([]);
      setEnvironmentalData([]);
      setFinancialData(null);
      setYieldData(null);
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  };

  const financialDataChart = useMemo(() => financialData ? [{
    month: dateUtils.formatDate(new Date(financialData.period.start), 'short'),
    revenue: financialData.revenue.total,
    costs: financialData.costs.total,
    profit: financialData.profit.net,
    efficiency: financialData.metrics.operatingMargin,
  }] : [], [financialData]);

  const yieldDataChart = useMemo(() => yieldData?.harvests.map((harvest) => ({
    name: harvest.strain,
    yield: harvest.dryWeight,
  })) || [], [yieldData]);

  const environmentalPerformance = useMemo(() => {
    const averages = environmentalData[0]?.averages;
    if (!averages) return [];
    return [
      { metric: 'Temperature', current: averages.temperature },
      { metric: 'Humidity', current: averages.humidity },
      { metric: 'CO2', current: averages.co2 },
      { metric: 'Light', current: averages.lightIntensity },
      { metric: 'VPD', current: averages.vpd },
    ];
  }, [environmentalData]);

  const averageHealthScore = plantGrowthData.length > 0
    ? plantGrowthData.reduce((sum, plant) => sum + plant.healthScore, 0) / plantGrowthData.length
    : null;
  const averageYield = yieldData?.yields.average ?? null;
  const environmentalMetrics = useMemo(() => {
    const averages = environmentalData[0]?.averages;
    if (!averages) return [];
    return [
      { name: 'Temperature', current: averages.temperature, avg: averages.temperature, min: null, max: null },
      { name: 'Humidity', current: averages.humidity, avg: averages.humidity, min: null, max: null },
      { name: 'CO2 Level', current: averages.co2, avg: averages.co2, min: null, max: null },
      { name: 'Light Intensity', current: averages.lightIntensity, avg: averages.lightIntensity, min: null, max: null },
      { name: 'pH Level', current: averages.ph, avg: averages.ph, min: null, max: null },
    ];
  }, [environmentalData]);

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
          <h3 className="text-2xl font-bold text-white mb-1">{plantGrowthData.length || '—'}</h3>
          <p className="text-sm text-gray-400 mb-2">Total Plants</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{plantGrowthData.length ? 'from loaded data' : 'No persisted data'}</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{averageHealthScore === null ? '—' : `${averageHealthScore.toFixed(1)}%`}</h3>
          <p className="text-sm text-gray-400 mb-2">Health Score</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{averageHealthScore === null ? 'No persisted data' : 'from loaded data'}</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{financialData ? numberUtils.formatCurrency(financialData.revenue.total) : '—'}</h3>
          <p className="text-sm text-gray-400 mb-2">Revenue</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{financialData ? 'from loaded data' : 'No persisted data'}</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Target className="w-6 h-6 text-yellow-400" />
            </div>
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{averageYield === null ? '—' : `${numberUtils.formatNumber(averageYield)}kg`}</h3>
          <p className="text-sm text-gray-400 mb-2">Avg Yield</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{averageYield === null ? 'No persisted data' : 'from loaded data'}</span>
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
              <PolarRadiusAxis stroke="#9ca3af" />
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
              {environmentalMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No persisted environmental readings for this period.</td>
                </tr>
              ) : environmentalMetrics.map((metric) => (
                <tr key={metric.name} className="hover:bg-[#252A33]/50">
                  <td className="px-6 py-4 text-sm font-medium text-white">{metric.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{metric.current}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{metric.avg}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">—</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Not measured</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/50">
                      observed
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
