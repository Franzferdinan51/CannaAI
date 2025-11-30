'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Edit,
  Trash2,
  BarChart3,
  Bell
} from 'lucide-react';

// Import hooks and types
import { useInventory } from '@/components/inventory/hooks/useInventory';
import { useInventoryFilters } from '@/components/inventory/hooks/useInventoryFilters';
import {
  InventoryItem,
  InventoryFormData,
  SupplierFormData,
  CategoryFormData
} from '@/components/inventory/types/inventory';

export default function InventoryManager() {
  const {
    inventory,
    categories,
    suppliers,
    addItem,
    updateItem,
    deleteItem,
    addCategory,
    addSupplier,
    updateItemQuantity
  } = useInventory();

  const {
    filters,
    filteredInventory,
    categories: inventoryCategories,
    stats,
    updateFilter
  } = useInventoryFilters(inventory);

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate stats
  const statsData = [
    {
      title: 'Total Items',
      value: stats.totalItems.toString(),
      icon: <Package className="h-5 w-5 text-blue-500" />,
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Total Value',
      value: `$${stats.totalValue.toLocaleString()}`,
      icon: <DollarSign className="h-5 w-5 text-green-500" />,
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Low Stock',
      value: stats.lowStock.toString(),
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      change: '-3',
      trend: 'down'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock.toString(),
      icon: <Bell className="h-5 w-5 text-red-500" />,
      change: stats.outOfStock > 0 ? 'Needs Attention' : 'All Good',
      trend: stats.outOfStock > 0 ? 'up' : 'down'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Manager</h1>
          <p className="text-slate-400">Manage your cultivation supplies and equipment</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className={`h-4 w-4 mr-1 ${
                      stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-sm ${
                      stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search items..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.selectedCategory}
                onChange={(e) => updateFilter('selectedCategory', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Categories</option>
                {inventoryCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={filters.selectedStatus}
                onChange={(e) => updateFilter('selectedStatus', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Overview</CardTitle>
              <CardDescription>Current stock levels and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInventory.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-700 p-2 rounded">
                        <Package className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-slate-400">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.quantity} {item.unit}</p>
                        <Badge
                          variant={item.status === 'in-stock' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Items ({filteredInventory.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Quantity</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Cost</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-800">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{item.category}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.quantity} {item.unit}</p>
                            <p className="text-xs text-slate-400">Min: {item.minStockLevel}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={item.status === 'in-stock' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">${item.cost}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categories ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <h4 className="font-medium">{category.name}</h4>
                    </div>
                    <p className="text-sm text-slate-400">{category.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers ({suppliers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{supplier.name}</h4>
                        <p className="text-sm text-slate-400">{supplier.contactPerson}</p>
                        <p className="text-sm text-slate-400">{supplier.email}</p>
                        <p className="text-sm text-slate-400">Lead Time: {supplier.leadTime} days</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h4 className="font-medium mb-2">Low Stock Alert</h4>
                    <p className="text-2xl font-bold text-yellow-500">{stats.lowStock}</p>
                    <p className="text-sm text-slate-400">Items need restocking</p>
                  </div>
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <h4 className="font-medium mb-2">Total Inventory Value</h4>
                    <p className="text-2xl font-bold text-green-500">${stats.totalValue.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Current market value</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
