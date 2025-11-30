'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Plus,
  Calendar,
  TrendingUp,
  Droplets,
  Thermometer,
  Sun,
  Eye,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

// Types
interface HarvestBatch {
  id: string;
  strain: string;
  plantCount: number;
  startDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  room: string;
  stage: 'seedling' | 'vegetative' | 'flowering' | 'harvested' | 'drying' | 'curing';
  yield: number;
  quality: 'A' | 'B' | 'C';
  status: 'active' | 'completed' | 'failed';
  notes?: string;
}

export default function HarvestTracker() {
  const [batches, setBatches] = useState<HarvestBatch[]>([
    {
      id: '1',
      strain: 'White Widow',
      plantCount: 12,
      startDate: '2024-01-15',
      expectedHarvestDate: '2024-04-15',
      room: 'Room A',
      stage: 'flowering',
      yield: 0,
      quality: 'A',
      status: 'active',
      notes: 'Plants looking healthy'
    },
    {
      id: '2',
      strain: 'Blue Dream',
      plantCount: 8,
      startDate: '2024-02-01',
      expectedHarvestDate: '2024-05-01',
      room: 'Room B',
      stage: 'flowering',
      yield: 0,
      quality: 'A',
      status: 'active'
    },
    {
      id: '3',
      strain: 'OG Kush',
      plantCount: 10,
      startDate: '2024-01-01',
      expectedHarvestDate: '2024-03-30',
      actualHarvestDate: '2024-03-28',
      room: 'Room C',
      stage: 'curing',
      yield: 2400,
      quality: 'A',
      status: 'completed',
      notes: 'Excellent yield and quality'
    }
  ]);

  const [activeTab, setActiveTab] = useState('overview');

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'seedling': return 'bg-green-500';
      case 'vegetative': return 'bg-blue-500';
      case 'flowering': return 'bg-purple-500';
      case 'harvested': return 'bg-yellow-500';
      case 'drying': return 'bg-orange-500';
      case 'curing': return 'bg-amber-600';
      default: return 'bg-slate-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  const stats = {
    totalBatches: batches.length,
    activeBatches: batches.filter(b => b.status === 'active').length,
    completedBatches: batches.filter(b => b.status === 'completed').length,
    totalYield: batches.filter(b => b.yield > 0).reduce((sum, b) => sum + b.yield, 0)
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Harvest Tracker</h1>
          <p className="text-slate-400">Monitor and manage your cultivation cycles</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Batches</p>
                <p className="text-2xl font-bold">{stats.totalBatches}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active</p>
                <p className="text-2xl font-bold">{stats.activeBatches}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-2xl font-bold">{stats.completedBatches}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Yield</p>
                <p className="text-2xl font-bold">{stats.totalYield}g</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Batches</CardTitle>
              <CardDescription>Currently growing cultivation cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches.filter(b => b.status === 'active').map((batch) => (
                  <div key={batch.id} className="p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-12 rounded ${getStageColor(batch.stage)}`} />
                        <div>
                          <h4 className="font-medium">{batch.strain}</h4>
                          <p className="text-sm text-slate-400">{batch.plantCount} plants • {batch.room}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-xs ${getStatusColor(batch.status)}`}>
                              {batch.status}
                            </Badge>
                            <Badge className={`text-xs ${getStageColor(batch.stage)} text-white`}>
                              {batch.stage}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Harvest Date</p>
                        <p className="font-medium">{batch.expectedHarvestDate}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Batches ({batches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 px-4">Strain</th>
                      <th className="text-left py-3 px-4">Plants</th>
                      <th className="text-left py-3 px-4">Stage</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Start Date</th>
                      <th className="text-left py-3 px-4">Harvest Date</th>
                      <th className="text-left py-3 px-4">Yield</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id} className="border-b border-slate-700 hover:bg-slate-800">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{batch.strain}</p>
                            <p className="text-xs text-slate-400">{batch.room}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{batch.plantCount}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${getStageColor(batch.stage)} text-white`}>
                            {batch.stage}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{batch.startDate}</td>
                        <td className="py-3 px-4">{batch.actualHarvestDate || batch.expectedHarvestDate}</td>
                        <td className="py-3 px-4">{batch.yield > 0 ? `${batch.yield}g` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Harvest Schedule</CardTitle>
              <CardDescription>Upcoming harvest dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batches
                  .filter(b => b.status === 'active')
                  .sort((a, b) => new Date(a.expectedHarvestDate).getTime() - new Date(b.expectedHarvestDate).getTime())
                  .map((batch) => {
                    const daysUntilHarvest = Math.ceil(
                      (new Date(batch.expectedHarvestDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div key={batch.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                        <div>
                          <h4 className="font-medium">{batch.strain}</h4>
                          <p className="text-sm text-slate-400">{batch.room}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{batch.expectedHarvestDate}</p>
                          <p className={`text-sm ${daysUntilHarvest <= 7 ? 'text-yellow-500' : 'text-slate-400'}`}>
                            {daysUntilHarvest} days
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Harvest Analytics</CardTitle>
              <CardDescription>Performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800 rounded-lg">
                  <h4 className="font-medium mb-2">Average Yield per Plant</h4>
                  <p className="text-3xl font-bold text-green-500">
                    {stats.completedBatches > 0
                      ? Math.round(stats.totalYield / stats.completedBatches / batches.find(b => b.status === 'completed')?.plantCount! || 0)
                      : 0}g
                  </p>
                </div>
                <div className="p-4 bg-slate-800 rounded-lg">
                  <h4 className="font-medium mb-2">Success Rate</h4>
                  <p className="text-3xl font-bold text-blue-500">
                    {Math.round((stats.completedBatches / stats.totalBatches) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
