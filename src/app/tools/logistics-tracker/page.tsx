'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Types
interface NutrientItem {
  id: string;
  name: string;
  brand: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

interface SeedItem {
  id: string;
  name: string;
  strain: string;
  quantity: number;
  supplier: string;
}

interface SupplyItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
}

export default function LogisticsTracker() {
  const [activeTab, setActiveTab] = useState('overview');

  // Sample data
  const [nutrients] = useState<NutrientItem[]>([
    {
      id: '1',
      name: 'Advanced Nutrients Cal-Mag',
      brand: 'Advanced Nutrients',
      currentStock: 25.5,
      minStock: 15,
      unit: 'L'
    },
    {
      id: '2',
      name: 'General Hydroponics FloraMicro',
      brand: 'General Hydroponics',
      currentStock: 8.3,
      minStock: 10,
      unit: 'L'
    }
  ]);

  const [seeds] = useState<SeedItem[]>([
    {
      id: '1',
      name: 'Blue Dream',
      strain: 'Blue Dream',
      quantity: 50,
      supplier: 'Premium Seeds'
    },
    {
      id: '2',
      name: 'Girl Scout Cookies',
      strain: 'GSC',
      quantity: 25,
      supplier: 'Elite Genetics'
    }
  ]);

  const [supplies] = useState<SupplyItem[]>([
    {
      id: '1',
      name: '5 Gallon Fabric Pots',
      category: 'Containers',
      currentStock: 45,
      minStock: 20
    },
    {
      id: '2',
      name: 'LED Grow Lights',
      category: 'Equipment',
      currentStock: 2,
      minStock: 4
    }
  ]);

  const totalItems = nutrients.length + seeds.length + supplies.length;
  const lowStockItems = [
    ...nutrients.filter(n => n.currentStock <= n.minStock),
    ...supplies.filter(s => s.currentStock <= s.minStock)
  ].length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <Package className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100">Logistics Tracker</h1>
                <p className="text-slate-400">Manage nutrients, seeds, and supplies inventory</p>
              </div>
            </div>
            <Link href="/tools">
              <Button variant="outline" className="border-slate-600 text-slate-300">
                Back to Tools
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-200">{totalItems}</div>
                <div className="text-sm text-slate-400">Total Items</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{nutrients.length}</div>
                <div className="text-sm text-slate-400">Nutrients</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{seeds.length}</div>
                <div className="text-sm text-slate-400">Seed Strains</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-600">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{lowStockItems}</div>
                <div className="text-sm text-slate-400">Low Stock</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nutrients */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Nutrients ({nutrients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nutrients.map((nutrient) => (
                  <div key={nutrient.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-200">{nutrient.name}</p>
                      <p className="text-sm text-slate-400">{nutrient.brand} • {nutrient.currentStock} {nutrient.unit}</p>
                    </div>
                    <Badge
                      variant={nutrient.currentStock <= nutrient.minStock ? "destructive" : "secondary"}
                      className={nutrient.currentStock <= nutrient.minStock ? "bg-red-500" : "bg-green-500"}
                    >
                      {nutrient.currentStock <= nutrient.minStock ? "Low Stock" : "In Stock"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seeds */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Seeds ({seeds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seeds.map((seed) => (
                  <div key={seed.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-200">{seed.name}</p>
                      <p className="text-sm text-slate-400">{seed.strain} • {seed.quantity} seeds</p>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500">
                      {seed.supplier}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Supplies */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Supplies ({supplies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {supplies.map((supply) => (
                  <div key={supply.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-200">{supply.name}</p>
                      <p className="text-sm text-slate-400">{supply.category} • {supply.currentStock} units</p>
                    </div>
                    <Badge
                      variant={supply.currentStock <= supply.minStock ? "destructive" : "secondary"}
                      className={supply.currentStock <= supply.minStock ? "bg-red-500" : "bg-green-500"}
                    >
                      {supply.currentStock <= supply.minStock ? "Reorder" : "In Stock"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {lowStockItems > 0 && (
          <Card className="mt-6 bg-slate-800/50 border-slate-600 border-yellow-600">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Reorder Alerts ({lowStockItems})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-4">The following items need to be reordered soon:</p>
              <div className="space-y-2">
                {nutrients.filter(n => n.currentStock <= n.minStock).map((nutrient) => (
                  <div key={nutrient.id} className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/30">
                    <span className="text-slate-200">{nutrient.name}</span>
                    <span className="text-yellow-400 text-sm">{nutrient.currentStock} {nutrient.unit} remaining</span>
                  </div>
                ))}
                {supplies.filter(s => s.currentStock <= s.minStock).map((supply) => (
                  <div key={supply.id} className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/30">
                    <span className="text-slate-200">{supply.name}</span>
                    <span className="text-yellow-400 text-sm">{supply.currentStock} units remaining</span>
                  </div>
                ))}
              </div>
              <Button className="mt-4 bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-medium">
                Create Purchase Order
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}