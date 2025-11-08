'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Scissors, Plus, TrendingUp, Calendar, Weight,
  Timer, BarChart3, Package, Filter, Download,
  AlertCircle, CheckCircle, Clock, Target,
  Activity, Zap, Droplets, ThermometerSun, Edit, Trash2
} from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';

// Types
interface Harvest {
  id: string;
  strain: string;
  harvestDate: string;
  wetWeight: number;
  dryWeight: number;
  quality: 'A+' | 'A' | 'B+' | 'B' | 'C';
  thc: number;
  cbd: number;
  terpenes: string;
  growMethod: 'Indoor' | 'Outdoor' | 'Greenhouse';
  floweringTime: number;
  notes: string;
  status: 'drying' | 'curing' | 'completed' | 'archived';
  dryingStartDate?: string;
  curingStartDate?: string;
  targetCureDate?: string;
  batchNumber: string;
  roomNumber: string;
  plantCount: number;
  yieldPerPlant: number;
}

interface CuringBatch {
  id: string;
  harvestId: string;
  startDate: string;
  targetDate: string;
  currentHumidity: number;
  targetHumidity: number;
  currentTemp: number;
  burpingSchedule: string;
  notes: string;
  status: 'active' | 'completed' | 'paused';
}

export default function HarvestTracker() {
  // State management
  const [harvests, setHarvests] = useState<Harvest[]>([
    {
      id: '1',
      strain: 'Blue Dream',
      harvestDate: '2024-04-15',
      wetWeight: 500,
      dryWeight: 125,
      quality: 'A',
      thc: 22,
      cbd: 0.5,
      terpenes: 'Myrcene, Limonene, Caryophyllene',
      growMethod: 'Indoor',
      floweringTime: 56,
      notes: 'Excellent trichome development, sweet berry aroma',
      status: 'curing',
      dryingStartDate: '2024-04-15',
      curingStartDate: '2024-04-22',
      targetCureDate: '2024-05-20',
      batchNumber: 'BD-001',
      roomNumber: 'Room 1',
      plantCount: 4,
      yieldPerPlant: 31.25
    },
    {
      id: '2',
      strain: 'OG Kush',
      harvestDate: '2024-03-20',
      wetWeight: 450,
      dryWeight: 110,
      quality: 'A+',
      thc: 25,
      cbd: 0.3,
      terpenes: 'Limonene, Linalool, Humulene',
      growMethod: 'Indoor',
      floweringTime: 63,
      notes: 'Potent and resinous, classic fuel aroma',
      status: 'completed',
      dryingStartDate: '2024-03-20',
      curingStartDate: '2024-03-27',
      targetCureDate: '2024-04-24',
      batchNumber: 'OGK-001',
      roomNumber: 'Room 2',
      plantCount: 3,
      yieldPerPlant: 36.67
    }
  ]);

  const [curingBatches, setCuringBatches] = useState<CuringBatch[]>([
    {
      id: '1',
      harvestId: '1',
      startDate: '2024-04-22',
      targetDate: '2024-05-20',
      currentHumidity: 62,
      targetHumidity: 60,
      currentTemp: 68,
      burpingSchedule: 'Daily for 30 minutes',
      notes: 'Smelling great, humidity stable',
      status: 'active'
    }
  ]);

  const [showHarvestDialog, setShowHarvestDialog] = useState(false);
  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStrain, setFilterStrain] = useState<string>('all');

  // New harvest form state
  const [newHarvest, setNewHarvest] = useState<Partial<Harvest>>({
    strain: '',
    harvestDate: new Date().toISOString().split('T')[0],
    wetWeight: 0,
    dryWeight: 0,
    quality: 'A',
    thc: 0,
    cbd: 0,
    terpenes: '',
    growMethod: 'Indoor',
    floweringTime: 56,
    notes: '',
    status: 'drying',
    batchNumber: '',
    roomNumber: '',
    plantCount: 1,
    yieldPerPlant: 0
  });

  // Calculate analytics
  const calculateAnalytics = () => {
    const totalWet = harvests.reduce((sum, h) => sum + h.wetWeight, 0);
    const totalDry = harvests.reduce((sum, h) => sum + h.dryWeight, 0);
    const avgYieldPerPlant = harvests.length > 0
      ? harvests.reduce((sum, h) => sum + h.yieldPerPlant, 0) / harvests.length
      : 0;
    const avgTHC = harvests.length > 0
      ? harvests.reduce((sum, h) => sum + h.thc, 0) / harvests.length
      : 0;
    const dryingRatio = totalWet > 0 ? ((totalDry / totalWet) * 100).toFixed(1) : 0;

    return {
      totalWet,
      totalDry,
      avgYieldPerPlant: avgYieldPerPlant.toFixed(1),
      avgTHC: avgTHC.toFixed(1),
      dryingRatio,
      totalHarvests: harvests.length
    };
  };

  const analytics = calculateAnalytics();

  // Filter harvests
  const filteredHarvests = harvests.filter(harvest => {
    const statusMatch = filterStatus === 'all' || harvest.status === filterStatus;
    const strainMatch = filterStrain === 'all' || harvest.strain === filterStrain;
    return statusMatch && strainMatch;
  });

  // Yield trend data for charts
  const yieldTrendData = harvests.map(h => ({
    date: h.harvestDate,
    wetWeight: h.wetWeight,
    dryWeight: h.dryWeight,
    yieldPerPlant: h.yieldPerPlant,
    thc: h.thc
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Quality distribution data
  const qualityDistribution = harvests.reduce((acc, h) => {
    acc[h.quality] = (acc[h.quality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const qualityChartData = Object.entries(qualityDistribution).map(([quality, count]) => ({
    name: quality,
    value: count,
    percentage: ((count / harvests.length) * 100).toFixed(1)
  }));

  // Strain performance data
  const strainPerformance = harvests.reduce((acc, h) => {
    if (!acc[h.strain]) {
      acc[h.strain] = { totalYield: 0, count: 0, avgTHC: 0, avgQuality: 0 };
    }
    acc[h.strain].totalYield += h.dryWeight;
    acc[h.strain].count += 1;
    acc[h.strain].avgTHC += h.thc;
    return acc;
  }, {} as Record<string, any>);

  const strainChartData = Object.entries(strainPerformance).map(([strain, data]) => ({
    strain,
    avgYield: (data.totalYield / data.count).toFixed(1),
    avgTHC: (data.avgTHC / data.count).toFixed(1),
    harvests: data.count
  }));

  // Add new harvest
  const handleAddHarvest = () => {
    if (!newHarvest.strain || !newHarvest.wetWeight || !newHarvest.dryWeight) return;

    const harvest: Harvest = {
      id: Date.now().toString(),
      strain: newHarvest.strain || '',
      harvestDate: newHarvest.harvestDate || new Date().toISOString().split('T')[0],
      wetWeight: newHarvest.wetWeight || 0,
      dryWeight: newHarvest.dryWeight || 0,
      quality: newHarvest.quality as any || 'A',
      thc: newHarvest.thc || 0,
      cbd: newHarvest.cbd || 0,
      terpenes: newHarvest.terpenes || '',
      growMethod: newHarvest.growMethod as any || 'Indoor',
      floweringTime: newHarvest.floweringTime || 56,
      notes: newHarvest.notes || '',
      status: newHarvest.status as any || 'drying',
      dryingStartDate: newHarvest.status === 'drying' ? new Date().toISOString().split('T')[0] : undefined,
      batchNumber: newHarvest.batchNumber || `${newHarvest.strain?.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`,
      roomNumber: newHarvest.roomNumber || '',
      plantCount: newHarvest.plantCount || 1,
      yieldPerPlant: (newHarvest.dryWeight || 0) / (newHarvest.plantCount || 1)
    };

    setHarvests([harvest, ...harvests]);
    setShowHarvestDialog(false);
    setNewHarvest({
      strain: '',
      harvestDate: new Date().toISOString().split('T')[0],
      wetWeight: 0,
      dryWeight: 0,
      quality: 'A',
      thc: 0,
      cbd: 0,
      terpenes: '',
      growMethod: 'Indoor',
      floweringTime: 56,
      notes: '',
      status: 'drying',
      batchNumber: '',
      roomNumber: '',
      plantCount: 1,
      yieldPerPlant: 0
    });
  };

  // Update harvest status
  const updateHarvestStatus = (id: string, newStatus: Harvest['status']) => {
    setHarvests(harvests.map(h => {
      if (h.id === id) {
        const updated = { ...h, status: newStatus };
        if (newStatus === 'curing' && !h.curingStartDate) {
          updated.curingStartDate = new Date().toISOString().split('T')[0];
          updated.targetCureDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        return updated;
      }
      return h;
    }));
  };

  // Delete harvest
  const handleDeleteHarvest = (id: string) => {
    setHarvests(harvests.filter(h => h.id !== id));
    // Also remove associated curing batches
    setCuringBatches(curingBatches.filter(cb => cb.harvestId !== id));
  };

  // Get unique strains for filter
  const uniqueStrains = Array.from(new Set(harvests.map(h => h.strain)));

  // Status badge colors
  const getStatusColor = (status: Harvest['status']) => {
    switch (status) {
      case 'drying': return 'bg-yellow-600';
      case 'curing': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'archived': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  // Quality badge colors
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'A+': return 'bg-purple-600';
      case 'A': return 'bg-blue-600';
      case 'B+': return 'bg-green-600';
      case 'B': return 'bg-yellow-600';
      case 'C': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <Scissors className="h-8 w-8 text-blue-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-blue-300">Harvest Tracker</h1>
                <p className="text-slate-400">Comprehensive harvest management and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowHarvestDialog(true)}
                className="bg-blue-700 hover:bg-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Harvest
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Analytics Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Harvested</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.totalDry}g</p>
                  <p className="text-xs text-slate-500">Dry weight</p>
                </div>
                <Package className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Yield/Plant</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.avgYieldPerPlant}g</p>
                  <p className="text-xs text-slate-500">Per plant</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg THC</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.avgTHC}%</p>
                  <p className="text-xs text-slate-500">Potency</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Drying Ratio</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.dryingRatio}%</p>
                  <p className="text-xs text-slate-500">Dry/Wet</p>
                </div>
                <Droplets className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Harvests</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.totalHarvests}</p>
                  <p className="text-xs text-slate-500">All time</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-4 mb-6"
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Filters:</span>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="drying">Drying</SelectItem>
              <SelectItem value="curing">Curing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStrain} onValueChange={setFilterStrain}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600">
              <SelectValue placeholder="Strain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strains</SelectItem>
              {uniqueStrains.map(strain => (
                <SelectItem key={strain} value={strain}>{strain}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="harvests" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-600">
            <TabsTrigger value="harvests" className="data-[state=active]:bg-slate-700">
              <Package className="h-4 w-4 mr-2" />
              Harvests
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="curing" className="data-[state=active]:bg-slate-700">
              <Timer className="h-4 w-4 mr-2" />
              Curing Batches
            </TabsTrigger>
          </TabsList>

          {/* Harvests Tab */}
          <TabsContent value="harvests" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredHarvests.map((harvest) => (
                <motion.div
                  key={harvest.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="bg-slate-900/50 border-slate-700 hover:border-blue-500 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-blue-300">{harvest.strain}</CardTitle>
                          <p className="text-sm text-slate-400">{harvest.batchNumber} • {harvest.roomNumber}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={`${getStatusColor(harvest.status)} text-white`}>
                            {harvest.status}
                          </Badge>
                          <Badge className={`${getQualityColor(harvest.quality)} text-white`}>
                            {harvest.quality} Quality
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Harvest Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">Harvest Date</p>
                          <p className="text-sm font-medium text-slate-200">{harvest.harvestDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Flowering Time</p>
                          <p className="text-sm font-medium text-slate-200">{harvest.floweringTime} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Wet Weight</p>
                          <p className="text-sm font-medium text-slate-200">{harvest.wetWeight}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Dry Weight</p>
                          <p className="text-sm font-medium text-green-400">{harvest.dryWeight}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Yield/Plant</p>
                          <p className="text-sm font-medium text-slate-200">{harvest.yieldPerPlant.toFixed(1)}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Plant Count</p>
                          <p className="text-sm font-medium text-slate-200">{harvest.plantCount}</p>
                        </div>
                      </div>

                      {/* Potency */}
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <p className="text-xs text-emerald-400">Cannabinoids</p>
                          <div className="flex space-x-2">
                            <Badge variant="secondary" className="bg-purple-700/50 text-purple-300">
                              THC: {harvest.thc}%
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-700/50 text-blue-300">
                              CBD: {harvest.cbd}%
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Terpenes */}
                      {harvest.terpenes && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Terpenes</p>
                          <p className="text-sm text-slate-200">{harvest.terpenes}</p>
                        </div>
                      )}

                      {/* Status Actions */}
                      <div className="flex space-x-2">
                        {harvest.status === 'drying' && (
                          <Button
                            size="sm"
                            onClick={() => updateHarvestStatus(harvest.id, 'curing')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Curing
                          </Button>
                        )}
                        {harvest.status === 'curing' && (
                          <Button
                            size="sm"
                            onClick={() => updateHarvestStatus(harvest.id, 'completed')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Mark Complete
                          </Button>
                        )}
                        {harvest.status === 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => updateHarvestStatus(harvest.id, 'archived')}
                            className="bg-gray-600 hover:bg-gray-700"
                          >
                            Archive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedHarvest(harvest)}
                          className="border-slate-600 text-slate-300"
                        >
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteHarvest(harvest.id)}
                          className="border-red-600 text-red-300 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Progress bars for active processes */}
                      {harvest.status === 'drying' && harvest.dryingStartDate && (
                        <div>
                          <p className="text-xs text-emerald-400 mb-1">Drying Progress</p>
                          <Progress value={75} className="h-2" />
                          <p className="text-xs text-emerald-500 mt-1">Day 5 of 7</p>
                        </div>
                      )}

                      {harvest.status === 'curing' && harvest.curingStartDate && harvest.targetCureDate && (
                        <div>
                          <p className="text-xs text-emerald-400 mb-1">Curing Progress</p>
                          <Progress value={30} className="h-2" />
                          <p className="text-xs text-emerald-500 mt-1">Day 8 of 28</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Yield Trend Chart */}
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Yield Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={yieldTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #10b981' }}
                        labelStyle={{ color: '#84cc16' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="wetWeight" stroke="#60a5fa" name="Wet Weight (g)" />
                      <Line type="monotone" dataKey="dryWeight" stroke="#34d399" name="Dry Weight (g)" />
                      <Line type="monotone" dataKey="yieldPerPlant" stroke="#fbbf24" name="Yield/Plant (g)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quality Distribution */}
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Quality Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={qualityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {qualityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Strain Performance */}
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Strain Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={strainChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="strain" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #10b981' }}
                        labelStyle={{ color: '#84cc16' }}
                      />
                      <Legend />
                      <Bar dataKey="avgYield" fill="#34d399" name="Avg Yield (g)" />
                      <Bar dataKey="avgTHC" fill="#a78bfa" name="Avg THC (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* THC Potency Trends */}
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">THC Potency Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={yieldTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#064e3b', border: '1px solid #10b981' }}
                        labelStyle={{ color: '#84cc16' }}
                      />
                      <Area type="monotone" dataKey="thc" stroke="#a78bfa" fill="#8b5cf6" name="THC %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Insights Section */}
            <Card className="bg-emerald-800/50 border-emerald-700">
              <CardHeader>
                <CardTitle className="text-lime-300 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Yield Optimization Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-700/30 border border-emerald-600 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      <h4 className="font-medium text-green-300">Top Performer</h4>
                    </div>
                    <p className="text-sm text-emerald-200">
                      OG Kush leads with {analytics.avgTHC}% average THC and highest yield per plant
                    </p>
                  </div>
                  <div className="bg-blue-700/30 border border-blue-600 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      <h4 className="font-medium text-blue-300">Improvement Area</h4>
                    </div>
                    <p className="text-sm text-emerald-200">
                      Consider extending drying time to improve drying ratio from {analytics.dryingRatio}%
                    </p>
                  </div>
                  <div className="bg-purple-700/30 border border-purple-600 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-5 w-5 text-purple-400" />
                      <h4 className="font-medium text-purple-300">Potency Focus</h4>
                    </div>
                    <p className="text-sm text-emerald-200">
                      Current average THC of {analytics.avgTHC}% is excellent for commercial quality
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curing Batches Tab */}
          <TabsContent value="curing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {curingBatches.map((batch) => {
                const harvest = harvests.find(h => h.id === batch.harvestId);
                if (!harvest) return null;

                return (
                  <Card key={batch.id} className="bg-emerald-800/50 border-emerald-700">
                    <CardHeader>
                      <CardTitle className="text-lime-300 flex items-center justify-between">
                        <span>{harvest.strain} - Curing Batch</span>
                        <Badge className={`${batch.status === 'active' ? 'bg-blue-600' : 'bg-green-600'} text-white`}>
                          {batch.status}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-emerald-400">Start Date</p>
                          <p className="text-sm font-medium text-emerald-200">{batch.startDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400">Target Date</p>
                          <p className="text-sm font-medium text-emerald-200">{batch.targetDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400">Current Humidity</p>
                          <div className="flex items-center space-x-2">
                            <Droplets className="h-4 w-4 text-blue-400" />
                            <p className="text-sm font-medium text-emerald-200">{batch.currentHumidity}%</p>
                            <span className="text-xs text-emerald-500">→ {batch.targetHumidity}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-400">Temperature</p>
                          <div className="flex items-center space-x-2">
                            <ThermometerSun className="h-4 w-4 text-orange-400" />
                            <p className="text-sm font-medium text-emerald-200">{batch.currentTemp}°F</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-emerald-400 mb-1">Burping Schedule</p>
                        <p className="text-sm text-emerald-200">{batch.burpingSchedule}</p>
                      </div>

                      <div>
                        <p className="text-xs text-emerald-400 mb-1">Progress</p>
                        <Progress value={30} className="h-2" />
                        <p className="text-xs text-emerald-500 mt-1">Day 8 of 28 days</p>
                      </div>

                      {batch.notes && (
                        <div>
                          <p className="text-xs text-emerald-400 mb-1">Notes</p>
                          <p className="text-sm text-emerald-200">{batch.notes}</p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Timer className="h-4 w-4 mr-2" />
                          Log Burping
                        </Button>
                        <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-300">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Curing Best Practices */}
            <Card className="bg-emerald-800/50 border-emerald-700">
              <CardHeader>
                <CardTitle className="text-lime-300">Curing Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-lime-300 mb-3 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                      Ideal Conditions
                    </h4>
                    <ul className="space-y-2 text-sm text-emerald-200">
                      <li>• Temperature: 60-70°F (15-21°C)</li>
                      <li>• Humidity: 60-65% RH</li>
                      <li>• Dark environment with minimal light exposure</li>
                      <li>• Stable temperatures with minimal fluctuations</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-lime-300 mb-3 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-400" />
                      Burping Schedule
                    </h4>
                    <ul className="space-y-2 text-sm text-emerald-200">
                      <li>• Week 1-2: Daily for 30 minutes</li>
                      <li>• Week 3-4: Every other day for 15 minutes</li>
                      <li>• Week 5-8: 2-3 times per week for 10 minutes</li>
                      <li>• Monitor for mold and appropriate moisture levels</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Harvest Dialog */}
        <Dialog open={showHarvestDialog} onOpenChange={setShowHarvestDialog}>
          <DialogContent className="bg-emerald-900 border-emerald-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lime-300">Log New Harvest</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strain" className="text-emerald-300">Strain</Label>
                <Input
                  id="strain"
                  value={newHarvest.strain}
                  onChange={(e) => setNewHarvest({ ...newHarvest, strain: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="Enter strain name"
                />
              </div>
              <div>
                <Label htmlFor="harvestDate" className="text-emerald-300">Harvest Date</Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={newHarvest.harvestDate}
                  onChange={(e) => setNewHarvest({ ...newHarvest, harvestDate: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="wetWeight" className="text-emerald-300">Wet Weight (g)</Label>
                <Input
                  id="wetWeight"
                  type="number"
                  value={newHarvest.wetWeight}
                  onChange={(e) => setNewHarvest({ ...newHarvest, wetWeight: parseFloat(e.target.value) || 0 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="dryWeight" className="text-emerald-300">Dry Weight (g)</Label>
                <Input
                  id="dryWeight"
                  type="number"
                  value={newHarvest.dryWeight}
                  onChange={(e) => setNewHarvest({ ...newHarvest, dryWeight: parseFloat(e.target.value) || 0 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="plantCount" className="text-emerald-300">Plant Count</Label>
                <Input
                  id="plantCount"
                  type="number"
                  value={newHarvest.plantCount}
                  onChange={(e) => setNewHarvest({ ...newHarvest, plantCount: parseInt(e.target.value) || 1 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="batchNumber" className="text-emerald-300">Batch Number</Label>
                <Input
                  id="batchNumber"
                  value={newHarvest.batchNumber}
                  onChange={(e) => setNewHarvest({ ...newHarvest, batchNumber: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="e.g., BD-001"
                />
              </div>
              <div>
                <Label htmlFor="roomNumber" className="text-emerald-300">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={newHarvest.roomNumber}
                  onChange={(e) => setNewHarvest({ ...newHarvest, roomNumber: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="e.g., Room 1"
                />
              </div>
              <div>
                <Label htmlFor="quality" className="text-emerald-300">Quality Grade</Label>
                <Select value={newHarvest.quality} onValueChange={(value) => setNewHarvest({ ...newHarvest, quality: value as any })}>
                  <SelectTrigger className="bg-emerald-800 border-emerald-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="growMethod" className="text-emerald-300">Grow Method</Label>
                <Select value={newHarvest.growMethod} onValueChange={(value) => setNewHarvest({ ...newHarvest, growMethod: value as any })}>
                  <SelectTrigger className="bg-emerald-800 border-emerald-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indoor">Indoor</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                    <SelectItem value="Greenhouse">Greenhouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="thc" className="text-emerald-300">THC %</Label>
                <Input
                  id="thc"
                  type="number"
                  step="0.1"
                  value={newHarvest.thc}
                  onChange={(e) => setNewHarvest({ ...newHarvest, thc: parseFloat(e.target.value) || 0 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="cbd" className="text-emerald-300">CBD %</Label>
                <Input
                  id="cbd"
                  type="number"
                  step="0.1"
                  value={newHarvest.cbd}
                  onChange={(e) => setNewHarvest({ ...newHarvest, cbd: parseFloat(e.target.value) || 0 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="0.0"
                />
              </div>
              <div>
                <Label htmlFor="floweringTime" className="text-emerald-300">Flowering Time (days)</Label>
                <Input
                  id="floweringTime"
                  type="number"
                  value={newHarvest.floweringTime}
                  onChange={(e) => setNewHarvest({ ...newHarvest, floweringTime: parseInt(e.target.value) || 56 })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="56"
                />
              </div>
              <div>
                <Label htmlFor="terpenes" className="text-emerald-300">Terpenes</Label>
                <Input
                  id="terpenes"
                  value={newHarvest.terpenes}
                  onChange={(e) => setNewHarvest({ ...newHarvest, terpenes: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="e.g., Myrcene, Limonene"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes" className="text-emerald-300">Notes</Label>
                <Textarea
                  id="notes"
                  value={newHarvest.notes}
                  onChange={(e) => setNewHarvest({ ...newHarvest, notes: e.target.value })}
                  className="bg-emerald-800 border-emerald-600 text-white"
                  placeholder="Additional notes about this harvest..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowHarvestDialog(false)} className="border-emerald-600 text-emerald-300">
                Cancel
              </Button>
              <Button onClick={handleAddHarvest} className="bg-emerald-700 hover:bg-emerald-600">
                Log Harvest
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Harvest Details Dialog */}
        <Dialog open={!!selectedHarvest} onOpenChange={() => setSelectedHarvest(null)}>
          <DialogContent className="bg-emerald-900 border-emerald-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lime-300">
                {selectedHarvest?.strain} - Harvest Details
              </DialogTitle>
            </DialogHeader>
            {selectedHarvest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-emerald-400">Batch Number</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Room</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Harvest Date</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.harvestDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Grow Method</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.growMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Total Wet Weight</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.wetWeight}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Total Dry Weight</p>
                    <p className="font-medium text-lime-400">{selectedHarvest.dryWeight}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Yield Per Plant</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.yieldPerPlant.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Plant Count</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.plantCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Flowering Time</p>
                    <p className="font-medium text-emerald-200">{selectedHarvest.floweringTime} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-400">Drying Ratio</p>
                    <p className="font-medium text-emerald-200">
                      {((selectedHarvest.dryWeight / selectedHarvest.wetWeight) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <Separator className="bg-emerald-700" />

                <div>
                  <p className="text-sm text-emerald-400 mb-2">Cannabinoid Profile</p>
                  <div className="flex space-x-3">
                    <Badge className="bg-purple-700/50 text-purple-300">
                      THC: {selectedHarvest.thc}%
                    </Badge>
                    <Badge className="bg-blue-700/50 text-blue-300">
                      CBD: {selectedHarvest.cbd}%
                    </Badge>
                    <Badge className={`${getQualityColor(selectedHarvest.quality)} text-white`}>
                      {selectedHarvest.quality} Quality
                    </Badge>
                  </div>
                </div>

                {selectedHarvest.terpenes && (
                  <div>
                    <p className="text-sm text-emerald-400 mb-1">Terpene Profile</p>
                    <p className="text-emerald-200">{selectedHarvest.terpenes}</p>
                  </div>
                )}

                {selectedHarvest.notes && (
                  <div>
                    <p className="text-sm text-emerald-400 mb-1">Notes</p>
                    <p className="text-emerald-200">{selectedHarvest.notes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" className="border-emerald-600 text-emerald-300">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => setSelectedHarvest(null)} className="bg-emerald-700 hover:bg-emerald-600">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}