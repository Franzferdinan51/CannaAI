import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Settings,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Eye,
  Maximize2,
  Grid,
  List,
  ChevronDown,
  Info,
  Zap,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Beaker,
  Gauge,
  FileText
} from 'lucide-react';

import {
  SensorAnalytics,
  SensorData,
  SensorConfig,
  SensorType,
  RoomConfig,
  AnalyticsDataPoint
} from './types';

interface SensorAnalyticsProps {
  className?: string;
  sensors?: SensorConfig[];
  rooms?: RoomConfig[];
  selectedSensorId?: string;
  selectedRoomId?: string;
}

const SensorAnalytics: React.FC<SensorAnalyticsProps> = ({
  className = '',
  sensors = [],
  rooms = [],
  selectedSensorId,
  selectedRoomId
}) => {
  // State management
  const [timeframe, setTimeframe] = useState<'1h' | '6h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute
  const [analyticsData, setAnalyticsData] = useState<SensorAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate mock analytics data
  const generateMockData = (sensorId: string, sensorType: SensorType, timePoints: number): AnalyticsDataPoint[] => {
    const data: AnalyticsDataPoint[] = [];
    const now = Date.now();
    const interval = timeframe === '1h' ? 60000 : // 1 min
                    timeframe === '6h' ? 600000 : // 10 min
                    timeframe === '24h' ? 3600000 : // 1 hour
                    timeframe === '7d' ? 14400000 : // 4 hours
                    timeframe === '30d' ? 86400000 : // 1 day
                    259200000; // 3 days

    let baseValue = getBaseValue(sensorType);
    let trend = 0;

    for (let i = 0; i < timePoints; i++) {
      const timestamp = new Date(now - (timePoints - i) * interval).toISOString();

      // Add realistic variations
      const randomVariation = (Math.random() - 0.5) * getVariationRange(sensorType);
      const trendChange = Math.sin(i * 0.1) * 2;
      const value = Math.max(0, baseValue + randomVariation + trendChange);

      // Determine quality based on variation
      const quality = Math.random() > 0.9 ? 'poor' : Math.random() > 0.8 ? 'fair' : 'good';

      data.push({
        timestamp,
        value: parseFloat(value.toFixed(2)),
        quality: quality as 'good' | 'fair' | 'poor'
      });

      // Update trend
      trend += (Math.random() - 0.5) * 0.5;
      trend = Math.max(-5, Math.min(5, trend));
      baseValue += trend * 0.1;
      baseValue = Math.max(getMinValue(sensorType), Math.min(getMaxValue(sensorType), baseValue));
    }

    return data;
  };

  const getBaseValue = (sensorType: SensorType): number => {
    switch (sensorType) {
      case 'temperature': return 75;
      case 'humidity': return 55;
      case 'ph': return 6.2;
      case 'ec': return 1.4;
      case 'co2': return 1200;
      case 'vpd': return 1.0;
      case 'soil_moisture': return 45;
      case 'light_intensity': return 600;
      case 'dli': return 25;
      case 'oxygen': return 8;
      case 'pressure': return 1013;
      default: return 50;
    }
  };

  const getVariationRange = (sensorType: SensorType): number => {
    switch (sensorType) {
      case 'temperature': return 10;
      case 'humidity': return 15;
      case 'ph': return 1.0;
      case 'ec': return 0.5;
      case 'co2': return 300;
      case 'vpd': return 0.5;
      case 'soil_moisture': return 20;
      case 'light_intensity': return 400;
      case 'dli': return 10;
      case 'oxygen': return 2;
      case 'pressure': return 20;
      default: return 10;
    }
  };

  const getMinValue = (sensorType: SensorType): number => {
    switch (sensorType) {
      case 'temperature': return 32;
      case 'humidity': return 0;
      case 'ph': return 0;
      case 'ec': return 0;
      case 'co2': return 0;
      case 'vpd': return 0;
      case 'soil_moisture': return 0;
      case 'light_intensity': return 0;
      case 'dli': return 0;
      case 'oxygen': return 0;
      case 'pressure': return 900;
      default: return 0;
    }
  };

  const getMaxValue = (sensorType: SensorType): number => {
    switch (sensorType) {
      case 'temperature': return 120;
      case 'humidity': return 100;
      case 'ph': return 14;
      case 'ec': return 5;
      case 'co2': return 3000;
      case 'vpd': return 5;
      case 'soil_moisture': return 100;
      case 'light_intensity': return 2000;
      case 'dli': return 60;
      case 'oxygen': return 15;
      case 'pressure': return 1100;
      default: return 100;
    }
  };

  const getUnit = (sensorType: SensorType): string => {
    switch (sensorType) {
      case 'temperature': return '°F';
      case 'humidity': return '%';
      case 'ph': return 'pH';
      case 'ec': return 'mS/cm';
      case 'co2': return 'ppm';
      case 'vpd': return 'kPa';
      case 'soil_moisture': return '%';
      case 'light_intensity': return 'PPFD';
      case 'dli': return 'mol/m²';
      case 'oxygen': return 'mg/L';
      case 'pressure': return 'hPa';
      default: return '';
    }
  };

  // Load analytics data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const timePoints = timeframe === '1h' ? 60 :
                          timeframe === '6h' ? 36 :
                          timeframe === '24h' ? 24 :
                          timeframe === '7d' ? 42 :
                          timeframe === '30d' ? 30 :
                          30;

        const data: SensorAnalytics[] = sensors.map(sensor => {
          const dataPoints = generateMockData(sensor.id, sensor.type, timePoints);
          const values = dataPoints.map(d => d.value);
          const statistics = calculateStatistics(values);

          return {
            sensorId: sensor.id,
            timeframe,
            data: dataPoints,
            statistics,
            alerts: Math.floor(Math.random() * 5),
            dataQuality: calculateDataQuality(dataPoints)
          };
        });

        setAnalyticsData(data);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [sensors, timeframe, autoRefresh, refreshInterval]);

  // Calculate statistics
  const calculateStatistics = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0] || 0;
    const max = sorted[sorted.length - 1] || 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length || 0;
    const current = values[values.length - 1] || 0;

    // Calculate trend
    const recentValues = values.slice(-10);
    const olderValues = values.slice(-20, -10);
    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length || 0;
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length || 0;

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (recentAvg > olderAvg * 1.05) {
      trend = 'rising';
      trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
    } else if (recentAvg < olderAvg * 0.95) {
      trend = 'falling';
      trendPercentage = ((olderAvg - recentAvg) / olderAvg) * 100;
    } else {
      trendPercentage = Math.abs(((recentAvg - olderAvg) / olderAvg) * 100);
    }

    return { min, max, avg, current, trend, trendPercentage: parseFloat(trendPercentage.toFixed(1)) };
  };

  // Calculate data quality
  const calculateDataQuality = (dataPoints: AnalyticsDataPoint[]): number => {
    const goodPoints = dataPoints.filter(d => d.quality === 'good').length;
    const fairPoints = dataPoints.filter(d => d.quality === 'fair').length;
    return ((goodPoints * 100 + fairPoints * 50) / dataPoints.length);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (analyticsData.length === 0) return [];

    const timestamps = analyticsData[0].data.map(d => d.timestamp);
    return timestamps.map((timestamp, index) => {
      const point: any = { timestamp: new Date(timestamp).toLocaleTimeString() };

      analyticsData.forEach(analytic => {
        const dataPoint = analytic.data[index];
        if (dataPoint) {
          point[analytic.sensorId] = dataPoint.value;
          point[`${analytic.sensorId}_quality`] = dataPoint.quality;
        }
      });

      return point;
    });
  }, [analyticsData]);

  // Get color for sensor
  const getSensorColor = (sensorId: string): string => {
    const colors = [
      '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const index = sensors.findIndex(s => s.id === sensorId);
    return colors[index % colors.length];
  };

  // Get trend icon
  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'falling': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // Export data
  const exportData = () => {
    const exportData = analyticsData.map(analytic => ({
      sensorId: analytic.sensorId,
      timeframe: analytic.timeframe,
      statistics: analytic.statistics,
      alerts: analytic.alerts,
      dataQuality: analytic.dataQuality,
      dataPoints: analytic.data.length
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `sensor-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className={`flex-1 overflow-y-auto p-6 bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
              Sensor Analytics
            </h1>
            <p className="text-gray-400">Historical data analysis and sensor performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${autoRefresh ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-400' : 'bg-gray-800 border border-gray-700 text-gray-400'}`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto Refresh' : 'Manual'}
            </button>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Timeframe Selector */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg">
            {(['1h', '6h', '24h', '7d', '30d', '90d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 ${timeframe === tf ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'} first:rounded-l-lg last:rounded-r-lg`}
              >
                {tf === '1h' ? '1 Hour' :
                 tf === '6h' ? '6 Hours' :
                 tf === '24h' ? '1 Day' :
                 tf === '7d' ? '1 Week' :
                 tf === '30d' ? '1 Month' : '3 Months'}
              </button>
            ))}
          </div>

          {/* Chart Type Selector */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg">
            {(['line', 'area', 'bar'] as const).map(type => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-2 capitalize ${chartType === type ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'} first:rounded-l-lg last:rounded-r-lg`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Toggle Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-400">
              <input
                type="checkbox"
                checked={showStatistics}
                onChange={(e) => setShowStatistics(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500"
              />
              Statistics
            </label>
            <label className="flex items-center gap-2 text-gray-400">
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500"
              />
              Anomalies
            </label>
          </div>
        </div>

        {/* Statistics Cards */}
        {showStatistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {analyticsData.slice(0, 4).map((analytic) => {
              const sensor = sensors.find(s => s.id === analytic.sensorId);
              const stats = analytic.statistics;

              return (
                <div key={analytic.sensorId} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-300">{sensor?.name || analytic.sensorId}</h3>
                    <span className="text-xs text-gray-500">{sensor?.type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Current</p>
                      <p className="text-white font-semibold">{stats.current.toFixed(2)}{getUnit(sensor?.type || '')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Average</p>
                      <p className="text-white font-semibold">{stats.avg.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Min / Max</p>
                      <p className="text-white text-xs">{stats.min.toFixed(1)} / {stats.max.toFixed(1)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-gray-500 text-xs">Trend</p>
                      {getTrendIcon(stats.trend)}
                      <span className={`text-xs ${
                        stats.trend === 'rising' ? 'text-emerald-400' :
                        stats.trend === 'falling' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Data Quality</span>
                      <span className={`${
                        analytic.dataQuality > 80 ? 'text-emerald-400' :
                        analytic.dataQuality > 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {analytic.dataQuality.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Sensor Data Over Time</h3>
            <div className="flex items-center gap-2">
              {analyticsData.map(analytic => {
                const sensor = sensors.find(s => s.id === analytic.sensorId);
                return (
                  <div key={analytic.sensorId} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getSensorColor(analytic.sensorId) }}
                    />
                    <span className="text-xs text-gray-400">{sensor?.name || analytic.sensorId}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  {analyticsData.map(analytic => (
                    <Line
                      key={analytic.sensorId}
                      type="monotone"
                      dataKey={analytic.sensorId}
                      stroke={getSensorColor(analytic.sensorId)}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  {analyticsData.map(analytic => (
                    <Area
                      key={analytic.sensorId}
                      type="monotone"
                      dataKey={analytic.sensorId}
                      stackId="1"
                      stroke={getSensorColor(analytic.sensorId)}
                      fill={getSensorColor(analytic.sensorId)}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  {analyticsData.map(analytic => (
                    <Bar
                      key={analytic.sensorId}
                      dataKey={analytic.sensorId}
                      fill={getSensorColor(analytic.sensorId)}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data available for selected timeframe</p>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Analytics Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Detailed Analytics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Sensor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Current</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Average</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Min / Max</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trend</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Quality</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {analyticsData.map((analytic) => {
                  const sensor = sensors.find(s => s.id === analytic.sensorId);
                  const stats = analytic.statistics;

                  return (
                    <tr key={analytic.sensorId} className="hover:bg-gray-900/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getSensorColor(analytic.sensorId) }}
                          />
                          <span className="text-sm text-white">{sensor?.name || analytic.sensorId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{sensor?.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white">
                          {stats.current.toFixed(2)}{getUnit(sensor?.type || '')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">{stats.avg.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-300">
                          {stats.min.toFixed(1)} / {stats.max.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(stats.trend)}
                          <span className={`text-sm ${
                            stats.trend === 'rising' ? 'text-emerald-400' :
                            stats.trend === 'falling' ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                analytic.dataQuality > 80 ? 'bg-emerald-500' :
                                analytic.dataQuality > 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${analytic.dataQuality}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{analytic.dataQuality.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${
                          analytic.alerts > 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {analytic.alerts}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorAnalytics;