'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
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
  Radar,
  ComposedChart
} from 'recharts';

import {
  Sprout,
  TrendingUp,
  Activity,
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Award,
  Users,
  Clock,
  Zap,
  Thermometer,
  Droplets,
  Sun,
  Beaker,
  Heart,
  Bug,
  TestTube,
  RefreshCw,
  Grid,
  List,
  ChevronDown,
  Info,
  FileText,
  Database
} from 'lucide-react';

import {
  PlantGrowthAnalytics,
  GrowthMeasurement,
  PlantGrowthStage,
  PlantHealth,
  HealthIssue,
  NutrientStatus,
  PestStatus,
  DiseaseStatus,
  YieldPrediction,
  GrowthData,
  TrendData
} from './types';

import { analyticsApi, mockData } from './api';
import { dateUtils, numberUtils, chartUtils } from './utils';

interface PlantGrowthAnalyticsProps {
  className?: string;
  plantIds?: string[];
  strainIds?: string[];
  roomIds?: string[];
  timeRange?: { start: Date; end: Date };
}

export const PlantGrowthAnalytics: React.FC<PlantGrowthAnalyticsProps> = ({
  className = '',
  plantIds = [],
  strainIds = [],
  roomIds = [],
  timeRange
}) => {
  // State management
  const [growthData, setGrowthData] = useState<PlantGrowthAnalytics[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<PlantGrowthAnalytics | null>(null);
  const [selectedStage, setSelectedStage] = useState<PlantGrowthStage | 'all'>('all');
  const [selectedMetric, setSelectedMetric] = useState<'height' | 'health' | 'yield'>('height');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'chart'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPredictions, setShowPredictions] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load plant growth data
  useEffect(() => {
    loadPlantGrowthData();
  }, [plantIds, strainIds, roomIds, selectedStage]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadPlantGrowthData();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, plantIds, strainIds, roomIds, selectedStage]);

  const loadPlantGrowthData = async () => {
    setIsLoading(true);
    try {
      const dateRange = timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const data = await analyticsApi.getPlantGrowth({
        plantIds,
        strainIds,
        roomIds,
        dateRange,
        growthStages: selectedStage === 'all' ? undefined : [selectedStage]
      });

      setGrowthData(data);

      // Select first plant if none selected
      if (!selectedPlant && data.length > 0) {
        setSelectedPlant(data[0]);
      }

    } catch (error) {
      console.error('Failed to load plant growth data:', error);
      // Fallback to mock data
      setGrowthData(generateMockPlantGrowthData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock data for demonstration
  const generateMockPlantGrowthData = (): PlantGrowthAnalytics[] => {
    const mockPlants: PlantGrowthAnalytics[] = [];
    const stages: PlantGrowthStage[] = ['vegetative', 'flowering', 'ripening'];
    const strains = ['Blue Dream', 'OG Kush', 'Girl Scout Cookies', 'Sour Diesel'];

    for (let i = 0; i < 12; i++) {
      const strain = strains[i % strains.length];
      const stage = stages[Math.floor(Math.random() * stages.length)];

      const measurements: GrowthMeasurement[] = [];
      const now = Date.now();
      const days = 30;

      for (let d = 0; d < days; d++) {
        const timestamp = new Date(now - (days - d) * 24 * 60 * 60 * 1000);
        measurements.push({
          timestamp,
          height: 20 + d * 2 + Math.random() * 5,
          width: 10 + d * 1.5 + Math.random() * 3,
          leafCount: Math.floor(d * 2 + Math.random() * 5),
          color: {
            dominant: '#4ade80',
            variance: 0.2,
            chlorophyll: 45 + Math.random() * 20,
            stress: Math.random() * 0.3
          },
          health: {
            score: 75 + Math.random() * 25,
            issues: [],
            nutrients: [
              { nutrient: 'Nitrogen', level: 200 + Math.random() * 100, status: 'optimal' as const },
              { nutrient: 'Phosphorus', level: 50 + Math.random() * 50, status: 'optimal' as const },
              { nutrient: 'Potassium', level: 150 + Math.random() * 100, status: 'optimal' as const }
            ],
            pests: [],
            diseases: []
          },
          environmental: {
            temperature: 22 + Math.random() * 4,
            humidity: 50 + Math.random() * 20,
            co2: 1000 + Math.random() * 400,
            light: {
              intensity: 600 + Math.random() * 300,
              duration: 16 + Math.random() * 4,
              spectrum: {
                blue: 20,
                green: 30,
                red: 40,
                far_red: 5,
                uv: 5
              },
              dli: 25 + Math.random() * 10
            },
            water: {
              ph: 6.0 + Math.random() * 0.8,
              ec: 1.2 + Math.random() * 0.8,
              temperature: 20 + Math.random() * 4,
              oxygen: 8 + Math.random() * 2,
              nutrients: []
            }
          }
        });
      }

      mockPlants.push({
        plantId: `plant_${i + 1}`,
        strain,
        growthStage: stage,
        measurements,
        healthScore: 75 + Math.random() * 25,
        growthRate: 2.5 + Math.random() * 2,
        yieldPrediction: {
          estimated: 2.5 + Math.random() * 2,
          unit: 'kg',
          confidence: 0.8 + Math.random() * 0.2,
          factors: [
            { factor: 'Genetics', impact: 0.4, description: 'Strain genetic potential' },
            { factor: 'Environment', impact: 0.3, description: 'Growing conditions' },
            { factor: 'Nutrition', impact: 0.2, description: 'Nutrient regimen' },
            { factor: 'Care', impact: 0.1, description: 'Maintenance quality' }
          ],
          timeline: new Date(now + 30 * 24 * 60 * 60 * 1000)
        },
        recommendations: [
          'Maintain current environmental conditions',
          'Monitor for any signs of nutrient deficiencies',
          'Consider pruning lower leaves for better air circulation'
        ]
      });
    }

    return mockPlants;
  };

  // Filter plants
  const filteredPlants = useMemo(() => {
    let filtered = [...growthData];

    if (searchQuery) {
      filtered = filtered.filter(plant =>
        plant.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.plantId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStage !== 'all') {
      filtered = filtered.filter(plant => plant.growthStage === selectedStage);
    }

    return filtered;
  }, [growthData, searchQuery, selectedStage]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!selectedPlant) return [];

    return selectedPlant.measurements.map(measurement => ({
      date: dateUtils.formatDate(measurement.timestamp, 'short'),
      height: measurement.height,
      width: measurement.width,
      leafCount: measurement.leafCount,
      healthScore: measurement.health.score,
      chlorophyll: measurement.color.chlorophyll,
      stress: measurement.color.stress * 100
    }));
  }, [selectedPlant]);

  // Generate yield prediction data
  const yieldPredictionData = useMemo(() => {
    if (!selectedPlant) return [];

    const prediction = selectedPlant.yieldPrediction;
    return [
      { name: 'Current Yield', value: prediction.estimated, fill: '#10b981' },
      { name: 'Potential', value: prediction.estimated * 1.2, fill: '#3b82f6' }
    ];
  }, [selectedPlant]);

  // Generate health distribution data
  const healthDistribution = useMemo(() => {
    const distribution = [
      { name: 'Excellent', value: 0, color: '#10b981' },
      { name: 'Good', value: 0, color: '#3b82f6' },
      { name: 'Fair', value: 0, color: '#f59e0b' },
      { name: 'Poor', value: 0, color: '#ef4444' }
    ];

    growthData.forEach(plant => {
      const score = plant.healthScore;
      if (score >= 90) distribution[0].value++;
      else if (score >= 75) distribution[1].value++;
      else if (score >= 60) distribution[2].value++;
      else distribution[3].value++;
    });

    return distribution.filter(d => d.value > 0);
  }, [growthData]);

  // Generate growth stage distribution
  const growthStageDistribution = useMemo(() => {
    const stages = ['germination', 'seedling', 'vegetative', 'flowering', 'ripening', 'harvest'];
    const colors = ['#06b6d4', '#84cc16', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return stages.map((stage, index) => ({
      name: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: growthData.filter(plant => plant.growthStage === stage).length,
      color: colors[index]
    })).filter(d => d.value > 0);
  }, [growthData]);

  // Custom tooltip
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

  // Get health status info
  const getHealthStatus = (score: number) => {
    if (score >= 90) return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Excellent' };
    if (score >= 75) return { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Good' };
    if (score >= 60) return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Fair' };
    return { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Poor' };
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
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1D23] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Stages</option>
            <option value="germination">Germination</option>
            <option value="seedling">Seedling</option>
            <option value="vegetative">Vegetative</option>
            <option value="flowering">Flowering</option>
            <option value="ripening">Ripening</option>
            <option value="harvest">Harvest</option>
          </select>

          {/* View Mode */}
          <div className="flex bg-[#1A1D23] border border-gray-700 rounded-lg">
            {(['grid', 'list', 'chart'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {mode === 'grid' ? <Grid className="w-4 h-4" /> :
                 mode === 'list' ? <List className="w-4 h-4" /> :
                 <BarChart3 className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-colors"
          >
            <Target className="w-4 h-4" />
            {showPredictions ? 'Hide' : 'Show'} Predictions
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Sprout className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-2xl font-bold text-white">{filteredPlants.length}</span>
          </div>
          <p className="text-sm text-gray-400">Total Plants</p>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Heart className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {numberUtils.formatNumber(
                filteredPlants.reduce((sum, plant) => sum + plant.healthScore, 0) / filteredPlants.length, 1
              )}
            </span>
          </div>
          <p className="text-sm text-gray-400">Avg Health Score</p>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {numberUtils.formatNumber(
                filteredPlants.reduce((sum, plant) => sum + plant.growthRate, 0) / filteredPlants.length, 1
              )}
            </span>
          </div>
          <p className="text-sm text-gray-400">Avg Growth Rate</p>
        </div>

        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-2xl font-bold text-white">
              {numberUtils.formatNumber(
                filteredPlants.reduce((sum, plant) => sum + plant.yieldPrediction.estimated, 0), 1
              )}
            </span>
          </div>
          <p className="text-sm text-gray-400">Predicted Yield</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant List/Chart */}
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlants.map((plant) => {
                const healthStatus = getHealthStatus(plant.healthScore);

                return (
                  <div
                    key={plant.plantId}
                    onClick={() => setSelectedPlant(plant)}
                    className={`bg-[#1A1D23] border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-gray-600 ${
                      selectedPlant?.plantId === plant.plantId ? 'border-emerald-500' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{plant.strain}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${healthStatus.bg} ${healthStatus.color} border border-current/20`}>
                        {healthStatus.label}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Plant ID:</span>
                        <span className="text-white">{plant.plantId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stage:</span>
                        <span className="text-white capitalize">{plant.growthStage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Health:</span>
                        <span className="text-white">{plant.healthScore.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Growth Rate:</span>
                        <span className="text-white">{plant.growthRate.toFixed(2)}/day</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Est. Yield</span>
                        <span className="text-sm font-medium text-white">
                          {plant.yieldPrediction.estimated.toFixed(2)} {plant.yieldPrediction.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-[#1A1D23] border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#252A33]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Strain</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Health</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Growth Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredPlants.map((plant) => {
                      const healthStatus = getHealthStatus(plant.healthScore);

                      return (
                        <tr
                          key={plant.plantId}
                          onClick={() => setSelectedPlant(plant)}
                          className={`cursor-pointer hover:bg-[#252A33]/50 ${
                            selectedPlant?.plantId === plant.plantId ? 'bg-emerald-500/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-white">{plant.plantId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300">{plant.strain}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">
                              {plant.growthStage}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white">{plant.healthScore.toFixed(1)}%</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${healthStatus.bg} ${healthStatus.color}`}>
                                {healthStatus.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-white">{plant.growthRate.toFixed(2)}/day</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-white">
                              {plant.yieldPrediction.estimated.toFixed(2)} {plant.yieldPrediction.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Growth Comparison Chart</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Height (cm)"
                  />
                  <Line
                    type="monotone"
                    dataKey="healthScore"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Health Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="leafCount"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Leaf Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Selected Plant Details */}
        <div className="space-y-6">
          {selectedPlant ? (
            <>
              {/* Plant Overview */}
              <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-400" />
                  {selectedPlant.strain}
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Plant ID</p>
                    <p className="text-white font-medium">{selectedPlant.plantId}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-1">Growth Stage</p>
                    <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 capitalize">
                      {selectedPlant.growthStage}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Health Score</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">
                          {selectedPlant.healthScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">Growth Rate</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">
                          {selectedPlant.growthRate.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-400">cm/day</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Yield Prediction */}
              {showPredictions && (
                <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Yield Prediction
                  </h3>

                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white mb-1">
                        {selectedPlant.yieldPrediction.estimated.toFixed(2)} {selectedPlant.yieldPrediction.unit}
                      </p>
                      <p className="text-sm text-gray-400">
                        Confidence: {Math.round(selectedPlant.yieldPrediction.confidence * 100)}%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white mb-2">Influencing Factors:</p>
                      {selectedPlant.yieldPrediction.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{factor.factor}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${factor.impact * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">
                              {Math.round(factor.impact * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Recommendations
                </h3>

                <ul className="space-y-3">
                  {selectedPlant.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6 text-center">
              <Sprout className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">Select a plant to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Distribution */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-400" />
            Health Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={healthDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {healthDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Stage Distribution */}
        <div className="bg-[#1A1D23] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Growth Stage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={growthStageDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6">
                {growthStageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PlantGrowthAnalytics;