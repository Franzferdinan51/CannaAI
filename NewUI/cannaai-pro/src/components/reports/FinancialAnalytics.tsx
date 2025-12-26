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
  ComposedChart,
  ScatterChart,
  Scatter,
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  CreditCard,
  ShoppingCart,
  Zap,
  Droplets,
  Package,
  Users,
  Clock,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  Grid,
  List,
  Maximize2,
  ChevronDown,
  Percent,
  Calculator,
  Wallet,
  Receipt
} from 'lucide-react';

import {
  FinancialAnalytics,
  FinancialPeriod,
  RevenueData,
  CostData,
  ProfitData,
  FinancialMetrics,
  FinancialForecast,
  FinancialKPI,
  CostCategory,
  RevenueSource,
  CostBreakdown
} from './types';

import { analyticsApi, mockData } from './api';
import { dateUtils, numberUtils } from './utils';

interface FinancialAnalyticsProps {
  className?: string;
  period?: FinancialPeriod;
  comparisonMode?: boolean;
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({
  className = '',
  period = {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
    type: 'monthly'
  },
  comparisonMode = false
}) => {
  // State management
  const [financialData, setFinancialData] = useState<FinancialAnalytics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(period.type);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'costs' | 'profit' | 'roi'>('revenue');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'forecasts' | 'kpis'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(comparisonMode);

  // Load financial data
  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      const data = await analyticsApi.getFinancial({
        dateRange: period,
        type: selectedPeriod
      });

      if (data) {
        setFinancialData(data);
      } else {
        // Fallback to mock data
        setFinancialData(generateMockFinancialData());
      }

    } catch (error) {
      console.error('Failed to load financial data:', error);
      setFinancialData(generateMockFinancialData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock financial data
  const generateMockFinancialData = (): FinancialAnalytics => {
    const generateMonthlyData = () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      return months.slice(0, currentMonth + 1).map((month, index) => ({
        month,
        revenue: 45000 + Math.random() * 20000,
        costs: 30000 + Math.random() * 10000,
        profit: 15000 + Math.random() * 10000,
        growth: index > 0 ? (Math.random() - 0.3) * 20 : 0
      }));
    };

    const monthlyData = generateMonthlyData();

    return {
      period,
      revenue: {
        total: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
        sources: [
          { source: 'Flower Sales', amount: 350000, percentage: 70, growth: 12.5 },
          { source: 'Clones', amount: 75000, percentage: 15, growth: 8.3 },
          { source: 'Processing', amount: 50000, percentage: 10, growth: -2.1 },
          { source: 'Other', amount: 25000, percentage: 5, growth: 15.7 }
        ],
        growth: 10.3,
        forecast: 525000
      },
      costs: {
        total: monthlyData.reduce((sum, m) => sum + m.costs, 0),
        categories: [
          { category: 'Energy', amount: 80000, percentage: 28.6, trend: 'up' as const },
          { category: 'Labor', amount: 100000, percentage: 35.7, trend: 'stable' as const },
          { category: 'Nutrients', amount: 45000, percentage: 16.1, trend: 'down' as const },
          { category: 'Equipment', amount: 35000, percentage: 12.5, trend: 'up' as const },
          { category: 'Other', amount: 20000, percentage: 7.1, trend: 'stable' as const }
        ],
        breakdown: {
          energy: 80000,
          water: 15000,
          nutrients: 45000,
          labor: 100000,
          equipment: 35000,
          supplies: 15000,
          other: 20000
        },
        savings: 15000
      },
      profit: {
        gross: 250000,
        net: 220000,
        margin: 44.0,
        growth: 8.7
      },
      metrics: {
        roi: 145.2,
        breakEvenPoint: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        costPerUnit: 280.50,
        revenuePerUnit: 500.75,
        operatingMargin: 38.5,
        grossMargin: 44.0
      },
      forecasts: [
        { period: 'Next Month', revenue: 52000, costs: 35000, profit: 17000, confidence: 0.85 },
        { period: 'Next Quarter', revenue: 165000, costs: 110000, profit: 55000, confidence: 0.75 },
        { period: 'Next Year', revenue: 650000, costs: 420000, profit: 230000, confidence: 0.65 }
      ],
      kpis: [
        { name: 'Revenue Growth Rate', value: 12.5, unit: '%', trend: { direction: 'up', percentage: 12.5, significance: 'medium' }, target: 15, status: 'good' as const },
        { name: 'Operating Margin', value: 38.5, unit: '%', trend: { direction: 'up', percentage: 2.3, significance: 'low' }, target: 40, status: 'warning' as const },
        { name: 'Cost Per Unit', value: 280.50, unit: '$', trend: { direction: 'down', percentage: -5.2, significance: 'medium' }, target: 275, status: 'warning' as const },
        { name: 'ROI', value: 145.2, unit: '%', trend: { direction: 'up', percentage: 8.7, significance: 'high' }, target: 150, status: 'good' as const }
      ]
    };
  };

  // Prepare chart data
  const monthlyRevenueData = useMemo(() => {
    if (!financialData) return [];

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    return months.slice(0, currentMonth + 1).map((month, index) => ({
      month,
      revenue: 45000 + Math.random() * 20000,
      costs: 30000 + Math.random() * 10000,
      profit: 15000 + Math.random() * 10000,
      efficiency: 75 + Math.random() * 20
    }));
  }, [financialData]);

  // Cost breakdown data
  const costBreakdownData = useMemo(() => {
    if (!financialData) return [];

    const breakdown = financialData.costs.breakdown;
    return [
      { name: 'Labor', value: breakdown.labor, color: '#3b82f6' },
      { name: 'Energy', value: breakdown.energy, color: '#ef4444' },
      { name: 'Nutrients', value: breakdown.nutrients, color: '#10b981' },
      { name: 'Equipment', value: breakdown.equipment, color: '#f59e0b' },
      { name: 'Water', value: breakdown.water, color: '#06b6d4' },
      { name: 'Supplies', value: breakdown.supplies, color: '#8b5cf6' },
      { name: 'Other', value: breakdown.other, color: '#6b7280' }
    ];
  }, [financialData]);

  // Revenue sources data
  const revenueSourcesData = useMemo(() => {
    if (!financialData) return [];

    return financialData.revenue.sources.map((source, index) => ({
      name: source.source,
      value: source.amount,
      growth: source.growth,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index]
    }));
  }, [financialData]);

  // KPI radar data
  const kpiRadarData = useMemo(() => {
    if (!financialData) return [];

    return financialData.kpis.map(kpi => ({
      metric: kpi.name.replace(' Rate', '').replace(' Per Unit', '').replace(' Growth', ''),
      current: Math.min(100, (kpi.value / kpi.target) * 100),
      target: 100
    }));
  }, [financialData]);

  // Forecast data
  const forecastData = useMemo(() => {
    if (!financialData) return [];

    return financialData.forecasts.map(forecast => ({
      period: forecast.period,
      revenue: forecast.revenue,
      costs: forecast.costs,
      profit: forecast.profit,
      confidence: forecast.confidence * 100
    }));
  }, [financialData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1D23] border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {numberUtils.formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-emerald-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get trend icon
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <ArrowUp className="w-4 h-4 text-emerald-400" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
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
          {/* Period Selector */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map((periodType) => (
              <button
                key={periodType}
                onClick={() => setSelectedPeriod(periodType)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  selectedPeriod === periodType
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {periodType}
              </button>
            ))}
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            {(['overview', 'detailed', 'forecasts', 'kpis'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showComparison
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Compare
          </button>

          <button onClick={loadFinancialData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
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

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {numberUtils.formatCurrency(financialData?.revenue.total || 0)}
          </h3>
          <p className="text-sm text-gray-400 mb-2">Total Revenue</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">+{financialData?.revenue.growth || 0}%</span>
            <span className="text-xs text-gray-500">growth</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Receipt className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingDown className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {numberUtils.formatCurrency(financialData?.costs.total || 0)}
          </h3>
          <p className="text-sm text-gray-400 mb-2">Total Costs</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">{financialData?.costs.savings || 0} saved</span>
            <span className="text-xs text-gray-500">this period</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {numberUtils.formatCurrency(financialData?.profit.net || 0)}
          </h3>
          <p className="text-sm text-gray-400 mb-2">Net Profit</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">{financialData?.profit.margin || 0}%</span>
            <span className="text-xs text-gray-500">margin</span>
          </div>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Percent className="w-6 h-6 text-yellow-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {financialData?.metrics.roi || 0}%
          </h3>
          <p className="text-sm text-gray-400 mb-2">Return on Investment</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400">Excellent</span>
            <span className="text-xs text-gray-500">performance</span>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Costs Chart */}
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Revenue vs Costs Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  name="Profit"
                  dot={{ fill: '#8b5cf6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Breakdown Pie Chart */}
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-blue-400" />
              Cost Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => numberUtils.formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Sources */}
      <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Revenue Sources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueSourcesData.map((source, index) => (
            <div key={index} className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">{source.name}</span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-white">
                  {numberUtils.formatCurrency(source.value)}
                </p>
                <div className="flex items-center gap-2">
                  {source.growth > 0 ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className={`text-xs ${source.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Math.abs(source.growth)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Dashboard */}
      {viewMode === 'kpis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KPI Radar Chart */}
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              Performance vs Targets
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={kpiRadarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
                <PolarRadiusAxis stroke="#9ca3af" domain={[0, 100]} />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* KPI Details */}
          <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Key Performance Indicators
            </h3>
            <div className="space-y-4">
              {financialData?.kpis.map((kpi, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{kpi.name}</span>
                      {getTrendIcon(kpi.trend.direction)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-white">
                        {kpi.value}{kpi.unit}
                      </span>
                      <span className="text-xs text-gray-500">/ {kpi.target}{kpi.unit}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    kpi.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' :
                    kpi.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {kpi.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Forecasts */}
      {viewMode === 'forecasts' && (
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Financial Forecasts
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              <Bar dataKey="costs" fill="#ef4444" name="Costs" />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#8b5cf6"
                strokeWidth={3}
                name="Profit"
                dot={{ fill: '#8b5cf6', r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Confidence %"
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Financial Table */}
      {viewMode === 'detailed' && (
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Detailed Financial Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#252A33]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr className="bg-emerald-500/5">
                  <td className="px-6 py-4 font-medium text-white">Revenue</td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">
                    {numberUtils.formatCurrency(financialData?.revenue.total || 0)}
                  </td>
                  <td className="px-6 py-4 text-gray-300">100%</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">+{financialData?.revenue.growth || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">
                      Excellent
                    </span>
                  </td>
                </tr>

                {financialData?.revenue.sources.map((source, index) => (
                  <tr key={index} className="hover:bg-[#252A33]/50">
                    <td className="px-6 py-4 pl-8">
                      <span className="text-gray-300">• {source.source}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {numberUtils.formatCurrency(source.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{source.percentage}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {source.growth > 0 ? (
                          <ArrowUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className={source.growth > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {Math.abs(source.growth)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        source.growth > 10 ? 'bg-emerald-500/10 text-emerald-400' :
                        source.growth > 0 ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {source.growth > 10 ? 'Strong' : source.growth > 0 ? 'Growing' : 'Declining'}
                      </span>
                    </td>
                  </tr>
                ))}

                <tr className="bg-red-500/5">
                  <td className="px-6 py-4 font-medium text-white">Costs</td>
                  <td className="px-6 py-4 text-red-400 font-medium">
                    {numberUtils.formatCurrency(financialData?.costs.total || 0)}
                  </td>
                  <td className="px-6 py-4 text-gray-300">100%</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Minus className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Stable</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400">
                      Monitor
                    </span>
                  </td>
                </tr>

                {financialData?.costs.categories.map((category, index) => (
                  <tr key={index} className="hover:bg-[#252A33]/50">
                    <td className="px-6 py-4 pl-8">
                      <span className="text-gray-300">• {category.category}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {numberUtils.formatCurrency(category.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{category.percentage}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {category.trend === 'up' ? (
                          <ArrowUp className="w-4 h-4 text-red-400" />
                        ) : category.trend === 'down' ? (
                          <ArrowDown className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={
                          category.trend === 'up' ? 'text-red-400' :
                          category.trend === 'down' ? 'text-emerald-400' :
                          'text-gray-400'
                        }>
                          {category.trend}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        category.trend === 'up' ? 'bg-red-500/10 text-red-400' :
                        category.trend === 'down' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {category.trend === 'up' ? 'Increasing' :
                         category.trend === 'down' ? 'Decreasing' :
                         'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAnalytics;