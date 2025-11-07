'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Bell,
  Settings,
  Download,
  Upload,
  Calendar,
  Users,
  Building,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  maxStockLevel: number;
  cost: number;
  sellingPrice?: number;
  supplier?: string;
  lastRestocked: string;
  expiryDate?: string;
  location?: string;
  sku?: string;
  barcode?: string;
  notes?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  notes?: string;
  rating?: number;
  leadTime?: number; // days
}

interface Transaction {
  id: string;
  itemId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string;
  timestamp: string;
  performedBy: string;
}

export default function InventoryManager() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isViewItemOpen, setIsViewItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
    name: '',
    description: '',
    category: '',
    quantity: 0,
    unit: 'units',
    minStockLevel: 1,
    maxStockLevel: 100,
    cost: 0,
    sellingPrice: 0,
    supplier: '',
    location: '',
    sku: '',
    barcode: '',
    notes: '',
    status: 'in-stock'
  });

  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
    name: '',
    description: '',
    color: '#10b981',
    icon: 'Package'
  });

  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    notes: '',
    rating: 5,
    leadTime: 7
  });

  // Initial data
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'General Hydroponics Flora Series',
      description: 'Complete nutrient solution for hydroponic systems',
      category: 'Nutrients',
      quantity: 2,
      unit: 'L',
      minStockLevel: 1,
      maxStockLevel: 10,
      cost: 45,
      sellingPrice: 65,
      supplier: 'Hydro Supplier Inc',
      lastRestocked: '2024-05-01',
      expiryDate: '2025-12-01',
      location: 'Storage Room A',
      sku: 'GH-FS-001',
      barcode: '1234567890123',
      notes: 'Popular choice for hydroponic growers',
      status: 'in-stock',
      createdAt: '2024-04-15',
      updatedAt: '2024-05-01'
    },
    {
      id: '2',
      name: 'Fox Farm Ocean Forest',
      description: 'Premium potting soil with beneficial microbes',
      category: 'Soil',
      quantity: 3,
      unit: 'bags',
      minStockLevel: 2,
      maxStockLevel: 20,
      cost: 25,
      sellingPrice: 35,
      supplier: 'Garden Supply Co',
      lastRestocked: '2024-04-15',
      location: 'Storage Room B',
      sku: 'FF-OF-002',
      barcode: '2345678901234',
      status: 'in-stock',
      createdAt: '2024-04-15',
      updatedAt: '2024-04-15'
    },
    {
      id: '3',
      name: 'LED Grow Light 1000W',
      description: 'Full spectrum LED grow light with adjustable intensity',
      category: 'Equipment',
      quantity: 1,
      unit: 'units',
      minStockLevel: 1,
      maxStockLevel: 5,
      cost: 299,
      sellingPrice: 450,
      supplier: 'Lighting Pro',
      lastRestocked: '2024-03-20',
      location: 'Equipment Room',
      sku: 'LED-1000-003',
      barcode: '3456789012345',
      status: 'low-stock',
      createdAt: '2024-03-20',
      updatedAt: '2024-03-20'
    },
    {
      id: '4',
      name: 'pH Down Solution',
      description: 'Acidic solution for lowering pH levels',
      category: 'Nutrients',
      quantity: 0,
      unit: 'L',
      minStockLevel: 1,
      maxStockLevel: 5,
      cost: 15,
      sellingPrice: 22,
      supplier: 'Hydro Supplier Inc',
      lastRestocked: '2024-02-10',
      expiryDate: '2026-06-01',
      location: 'Storage Room A',
      sku: 'PH-D-004',
      barcode: '4567890123456',
      status: 'out-of-stock',
      createdAt: '2024-02-10',
      updatedAt: '2024-05-01'
    }
  ]);

  const [categories] = useState<Category[]>([
    { id: '1', name: 'Nutrients', description: 'Plant nutrients and supplements', color: '#10b981', icon: 'Droplets' },
    { id: '2', name: 'Soil', description: 'Growing media and soils', color: '#8b5cf6', icon: 'Mountain' },
    { id: '3', name: 'Equipment', description: 'Growing equipment and tools', color: '#f59e0b', icon: 'Settings' },
    { id: '4', name: 'Seeds', description: 'Cannabis seeds and genetics', color: '#ef4444', icon: 'Sprout' },
    { id: '5', name: 'Containers', description: 'Pots, trays, and containers', color: '#3b82f6', icon: 'Package' },
    { id: '6', name: 'Lighting', description: 'Grow lights and accessories', color: '#eab308', icon: 'Lightbulb' }
  ]);

  const [suppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Hydro Supplier Inc',
      contactPerson: 'John Smith',
      email: 'john@hydrosupplier.com',
      phone: '555-0101',
      address: '123 Hydro Street, Grow City, GC 12345',
      website: 'https://hydrosupplier.com',
      rating: 5,
      leadTime: 3
    },
    {
      id: '2',
      name: 'Garden Supply Co',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@gardensupply.com',
      phone: '555-0102',
      address: '456 Garden Ave, Plant Town, PT 67890',
      rating: 4,
      leadTime: 7
    },
    {
      id: '3',
      name: 'Lighting Pro',
      contactPerson: 'Mike Wilson',
      email: 'mike@lightingpro.com',
      phone: '555-0103',
      address: '789 Light Blvd, Bright City, BC 11111',
      rating: 5,
      leadTime: 5
    }
  ]);

  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      itemId: '1',
      type: 'purchase',
      quantity: 5,
      unitPrice: 45,
      totalPrice: 225,
      reason: 'Restocking',
      timestamp: '2024-05-01T10:00:00Z',
      performedBy: 'Admin User'
    },
    {
      id: '2',
      itemId: '2',
      type: 'sale',
      quantity: 1,
      unitPrice: 35,
      totalPrice: 35,
      reason: 'Customer sale',
      timestamp: '2024-04-28T14:30:00Z',
      performedBy: 'Store Clerk'
    },
    {
      id: '3',
      itemId: '3',
      type: 'adjustment',
      quantity: -1,
      unitPrice: 299,
      totalPrice: -299,
      reason: 'Damage',
      timestamp: '2024-04-25T09:15:00Z',
      performedBy: 'Manager'
    }
  ]);

  // Calculate statistics
  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const lowStockItems = inventory.filter(item => item.quantity <= item.minStockLevel).length;
  const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
  const inStockItems = inventory.filter(item => item.quantity > item.minStockLevel).length;

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof InventoryItem];
      let bValue: any = b[sortBy as keyof InventoryItem];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Handle form submissions
  const handleAddItem = () => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      ...itemForm as InventoryItem,
      lastRestocked: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Auto-determine status
    if (newItem.quantity === 0) {
      newItem.status = 'out-of-stock';
    } else if (newItem.quantity <= newItem.minStockLevel) {
      newItem.status = 'low-stock';
    } else {
      newItem.status = 'in-stock';
    }

    setInventory([...inventory, newItem]);
    setItemForm({
      name: '',
      description: '',
      category: '',
      quantity: 0,
      unit: 'units',
      minStockLevel: 1,
      maxStockLevel: 100,
      cost: 0,
      sellingPrice: 0,
      supplier: '',
      location: '',
      sku: '',
      barcode: '',
      notes: '',
      status: 'in-stock'
    });
    setIsAddItemOpen(false);
  };

  const handleEditItem = () => {
    if (!selectedItem) return;

    const updatedItem: InventoryItem = {
      ...selectedItem,
      ...itemForm as InventoryItem,
      updatedAt: new Date().toISOString()
    };

    // Auto-determine status
    if (updatedItem.quantity === 0) {
      updatedItem.status = 'out-of-stock';
    } else if (updatedItem.quantity <= updatedItem.minStockLevel) {
      updatedItem.status = 'low-stock';
    } else {
      updatedItem.status = 'in-stock';
    }

    setInventory(inventory.map(item => item.id === selectedItem.id ? updatedItem : item));
    setIsEditItemOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    setInventory(inventory.filter(item => item.id !== itemId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'low-stock': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'out-of-stock': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'discontinued': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-stock': return <TrendingUp className="h-3 w-3" />;
      case 'low-stock': return <AlertTriangle className="h-3 w-3" />;
      case 'out-of-stock': return <TrendingDown className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-lime-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-lime-500 p-3 rounded-full">
              <Package className="h-8 w-8 text-emerald-900" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-lime-300">Inventory Manager</h1>
              <p className="text-emerald-300">Comprehensive inventory tracking and management system</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button className="bg-lime-600 hover:bg-lime-500 text-emerald-900 font-medium">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lime-300">Add New Inventory Item</DialogTitle>
                  <DialogDescription className="text-emerald-300">
                    Enter the details for the new inventory item
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2">
                    <Label htmlFor="name" className="text-emerald-200">Item Name</Label>
                    <Input
                      id="name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description" className="text-emerald-200">Description</Label>
                    <Textarea
                      id="description"
                      value={itemForm.description}
                      onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Enter item description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-emerald-200">Category</Label>
                    <Select onValueChange={(value) => setItemForm({...itemForm, category: value})}>
                      <SelectTrigger className="bg-emerald-800/50 border-emerald-600 text-emerald-100">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-emerald-800 border-emerald-600">
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="unit" className="text-emerald-200">Unit</Label>
                    <Input
                      id="unit"
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="e.g., L, kg, units"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantity" className="text-emerald-200">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStockLevel" className="text-emerald-200">Min Stock Level</Label>
                    <Input
                      id="minStockLevel"
                      type="number"
                      value={itemForm.minStockLevel}
                      onChange={(e) => setItemForm({...itemForm, minStockLevel: parseInt(e.target.value) || 0})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxStockLevel" className="text-emerald-200">Max Stock Level</Label>
                    <Input
                      id="maxStockLevel"
                      type="number"
                      value={itemForm.maxStockLevel}
                      onChange={(e) => setItemForm({...itemForm, maxStockLevel: parseInt(e.target.value) || 0})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost" className="text-emerald-200">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={itemForm.cost}
                      onChange={(e) => setItemForm({...itemForm, cost: parseFloat(e.target.value) || 0})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice" className="text-emerald-200">Selling Price ($)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      value={itemForm.sellingPrice}
                      onChange={(e) => setItemForm({...itemForm, sellingPrice: parseFloat(e.target.value) || 0})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier" className="text-emerald-200">Supplier</Label>
                    <Select onValueChange={(value) => setItemForm({...itemForm, supplier: value})}>
                      <SelectTrigger className="bg-emerald-800/50 border-emerald-600 text-emerald-100">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="bg-emerald-800 border-emerald-600">
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-emerald-200">Location</Label>
                    <Input
                      id="location"
                      value={itemForm.location}
                      onChange={(e) => setItemForm({...itemForm, location: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Storage location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku" className="text-emerald-200">SKU</Label>
                    <Input
                      id="sku"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({...itemForm, sku: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Stock keeping unit"
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode" className="text-emerald-200">Barcode</Label>
                    <Input
                      id="barcode"
                      value={itemForm.barcode}
                      onChange={(e) => setItemForm({...itemForm, barcode: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Barcode number"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes" className="text-emerald-200">Notes</Label>
                    <Textarea
                      id="notes"
                      value={itemForm.notes}
                      onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                      className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddItemOpen(false)} className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                    Add Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alert for low stock items */}
        {lowStockItems > 0 && (
          <Alert className="mb-6 bg-yellow-500/20 border-yellow-500/30 text-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {lowStockItems} items that are low in stock and {outOfStockItems} items out of stock.
              Consider restocking soon to avoid disruptions.
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-200">Total Items</CardTitle>
              <Package className="h-4 w-4 text-lime-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-lime-300">{totalItems}</div>
              <p className="text-xs text-emerald-400">Active inventory items</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-200">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-lime-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-lime-300">${totalValue.toFixed(2)}</div>
              <p className="text-xs text-emerald-400">Current inventory value</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-200">In Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{inStockItems}</div>
              <p className="text-xs text-emerald-400">Items above minimum stock</p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-800/50 border-emerald-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-200">Need Attention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{lowStockItems + outOfStockItems}</div>
              <p className="text-xs text-emerald-400">Low or out of stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-emerald-800/50 border-emerald-700 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Overview
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Inventory Items
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Categories
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-lime-600 data-[state=active]:text-emerald-900 text-emerald-200">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Recent Items</CardTitle>
                  <CardDescription className="text-emerald-300">Recently added or updated items</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inventory.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-emerald-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="bg-lime-500/20 p-2 rounded">
                            <Package className="h-4 w-4 text-lime-400" />
                          </div>
                          <div>
                            <p className="font-medium text-emerald-200">{item.name}</p>
                            <p className="text-xs text-emerald-400">{item.category} • {item.quantity} {item.unit}</p>
                          </div>
                        </div>
                        <Badge className={cn("border", getStatusColor(item.status))}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Low Stock Alerts</CardTitle>
                  <CardDescription className="text-emerald-300">Items that need restocking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inventory.filter(item => item.quantity <= item.minStockLevel).slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <div>
                            <p className="font-medium text-emerald-200">{item.name}</p>
                            <p className="text-xs text-emerald-400">
                              Current: {item.quantity} {item.unit} • Min: {item.minStockLevel} {item.unit}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="bg-emerald-700/50 border-emerald-600 text-emerald-200 hover:bg-emerald-600/50">
                          Restock
                        </Button>
                      </div>
                    ))}
                    {inventory.filter(item => item.quantity <= item.minStockLevel).length === 0 && (
                      <p className="text-emerald-400 text-center py-4">All items are adequately stocked</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Items Tab */}
          <TabsContent value="inventory" className="space-y-6">
            {/* Filters and Search */}
            <Card className="bg-emerald-800/50 border-emerald-700">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
                      <Input
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-emerald-700/50 border-emerald-600 text-emerald-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40 bg-emerald-700/50 border-emerald-600 text-emerald-100">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-emerald-800 border-emerald-600">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-40 bg-emerald-700/50 border-emerald-600 text-emerald-100">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-emerald-800 border-emerald-600">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in-stock">In Stock</SelectItem>
                        <SelectItem value="low-stock">Low Stock</SelectItem>
                        <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40 bg-emerald-700/50 border-emerald-600 text-emerald-100">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="bg-emerald-800 border-emerald-600">
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="cost">Cost</SelectItem>
                        <SelectItem value="lastRestocked">Last Restocked</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="bg-emerald-700/50 border-emerald-600 text-emerald-200 hover:bg-emerald-600/50"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInventory.map(item => (
                <Card key={item.id} className="bg-emerald-800/50 border-emerald-700 hover:bg-emerald-800/70 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lime-300 text-lg">{item.name}</CardTitle>
                        <CardDescription className="text-emerald-300 mt-1">
                          {item.description || 'No description available'}
                        </CardDescription>
                      </div>
                      <Badge className={cn("border", getStatusColor(item.status))}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 text-xs">{item.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Category:</span>
                        <Badge variant="outline" className="bg-emerald-700/50 border-emerald-600 text-emerald-200">
                          {item.category}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Quantity:</span>
                        <span className="text-emerald-200 font-medium">
                          {item.quantity} {item.unit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Stock Level:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-emerald-700/50 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                item.quantity > item.minStockLevel ? "bg-green-500" :
                                item.quantity === 0 ? "bg-red-500" : "bg-yellow-500"
                              )}
                              style={{
                                width: `${Math.min(100, (item.quantity / item.maxStockLevel) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-emerald-400">
                            {Math.round((item.quantity / item.maxStockLevel) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Cost:</span>
                        <span className="text-emerald-200 font-medium">${item.cost.toFixed(2)}</span>
                      </div>

                      {item.sellingPrice && (
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-400 text-sm">Selling Price:</span>
                          <span className="text-emerald-200 font-medium">${item.sellingPrice.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Total Value:</span>
                        <span className="text-lime-400 font-bold">
                          ${(item.cost * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {item.supplier && (
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-400 text-sm">Supplier:</span>
                          <span className="text-emerald-200 text-sm">{item.supplier}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-emerald-400 text-sm">Last Restocked:</span>
                        <span className="text-emerald-200 text-sm">{item.lastRestocked}</span>
                      </div>

                      <Separator className="bg-emerald-700" />

                      <div className="flex justify-between pt-2">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setItemForm(item);
                              setIsViewItemOpen(true);
                            }}
                            className="bg-emerald-700/50 border-emerald-600 text-emerald-200 hover:bg-emerald-600/50"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(item);
                              setItemForm(item);
                              setIsEditItemOpen(true);
                            }}
                            className="bg-emerald-700/50 border-emerald-600 text-emerald-200 hover:bg-emerald-600/50"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteItem(item.id)}
                            className="bg-red-800/50 border-red-600 text-red-200 hover:bg-red-700/50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredInventory.length === 0 && (
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-emerald-200">No items found</p>
                  <p className="text-emerald-400 text-sm">Try adjusting your filters or add a new item</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-lime-300">Inventory Categories</h2>
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100">
                  <DialogHeader>
                    <DialogTitle className="text-lime-300">Add New Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="categoryName" className="text-emerald-200">Category Name</Label>
                      <Input
                        id="categoryName"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Enter category name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="categoryDescription" className="text-emerald-200">Description</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Enter category description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)} className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAddCategoryOpen(false)} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                      Add Category
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => {
                const categoryItems = inventory.filter(item => item.category === category.name);
                const categoryValue = categoryItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

                return (
                  <Card key={category.id} className="bg-emerald-800/50 border-emerald-700">
                    <CardHeader>
                      <CardTitle className="text-lime-300 flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </CardTitle>
                      <CardDescription className="text-emerald-300">
                        {category.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-emerald-400 text-sm">Items:</span>
                          <span className="text-emerald-200 font-medium">{categoryItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400 text-sm">Total Value:</span>
                          <span className="text-lime-400 font-bold">${categoryValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-lime-300">Supplier Management</h2>
              <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100">
                  <DialogHeader>
                    <DialogTitle className="text-lime-300">Add New Supplier</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="col-span-2">
                      <Label htmlFor="supplierName" className="text-emerald-200">Company Name</Label>
                      <Input
                        id="supplierName"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPerson" className="text-emerald-200">Contact Person</Label>
                      <Input
                        id="contactPerson"
                        value={supplierForm.contactPerson}
                        onChange={(e) => setSupplierForm({...supplierForm, contactPerson: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Contact person"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-emerald-200">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={supplierForm.email}
                        onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-emerald-200">Phone</Label>
                      <Input
                        id="phone"
                        value={supplierForm.phone}
                        onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="leadTime" className="text-emerald-200">Lead Time (days)</Label>
                      <Input
                        id="leadTime"
                        type="number"
                        value={supplierForm.leadTime}
                        onChange={(e) => setSupplierForm({...supplierForm, leadTime: parseInt(e.target.value) || 0})}
                        className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                        placeholder="Lead time"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)} className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAddSupplierOpen(false)} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                      Add Supplier
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map(supplier => {
                const supplierItems = inventory.filter(item => item.supplier === supplier.name);
                const supplierValue = supplierItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

                return (
                  <Card key={supplier.id} className="bg-emerald-800/50 border-emerald-700">
                    <CardHeader>
                      <CardTitle className="text-lime-300 flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        {supplier.name}
                      </CardTitle>
                      <CardDescription className="text-emerald-300">
                        {supplier.contactPerson}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-200 text-sm">{supplier.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-3 h-3 rounded-full ${
                                i < (supplier.rating || 0) ? 'bg-lime-400' : 'bg-emerald-700'
                              }`} />
                            ))}
                          </div>
                          <span className="text-emerald-400 text-xs">({supplier.rating || 0}/5)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400 text-sm">Items Supplied:</span>
                          <span className="text-emerald-200 font-medium">{supplierItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400 text-sm">Total Value:</span>
                          <span className="text-lime-400 font-bold">${supplierValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-400 text-sm">Lead Time:</span>
                          <span className="text-emerald-200 font-medium">{supplier.leadTime} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-lime-300">Transaction History</h2>
              <Button className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>

            <Card className="bg-emerald-800/50 border-emerald-700">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {transactions.map(transaction => {
                    const item = inventory.find(i => i.id === transaction.itemId);
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-4 bg-emerald-700/30 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded ${
                            transaction.type === 'purchase' ? 'bg-green-500/20' :
                            transaction.type === 'sale' ? 'bg-blue-500/20' :
                            transaction.type === 'adjustment' ? 'bg-yellow-500/20' :
                            'bg-red-500/20'
                          }`}>
                            {transaction.type === 'purchase' ? <TrendingUp className="h-4 w-4 text-green-400" /> :
                             transaction.type === 'sale' ? <DollarSign className="h-4 w-4 text-blue-400" /> :
                             transaction.type === 'adjustment' ? <Settings className="h-4 w-4 text-yellow-400" /> :
                             <TrendingDown className="h-4 w-4 text-red-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-emerald-200">{item?.name || 'Unknown Item'}</p>
                            <p className="text-xs text-emerald-400">
                              {transaction.type} • {new Date(transaction.timestamp).toLocaleDateString()} • {transaction.performedBy}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'purchase' ? 'text-green-400' :
                            transaction.type === 'sale' ? 'text-blue-400' :
                            transaction.type === 'adjustment' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {transaction.type === 'purchase' ? '+' :
                             transaction.type === 'sale' ? '-' :
                             transaction.type === 'adjustment' ? '±' : ''}
                            {Math.abs(transaction.quantity)} {item?.unit}
                          </p>
                          <p className="text-sm text-emerald-400">
                            ${Math.abs(transaction.totalPrice).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-2xl font-bold text-lime-300">Inventory Analytics</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map(category => {
                      const categoryItems = inventory.filter(item => item.category === category.name);
                      const percentage = (categoryItems.length / inventory.length) * 100;

                      return (
                        <div key={category.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-200">{category.name}</span>
                            <span className="text-emerald-400 text-sm">{categoryItems.length} items ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-emerald-700/50 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: category.color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-emerald-800/50 border-emerald-700">
                <CardHeader>
                  <CardTitle className="text-lime-300">Value by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map(category => {
                      const categoryItems = inventory.filter(item => item.category === category.name);
                      const categoryValue = categoryItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
                      const percentage = totalValue > 0 ? (categoryValue / totalValue) * 100 : 0;

                      return (
                        <div key={category.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-200">{category.name}</span>
                            <span className="text-lime-400 font-medium">${categoryValue.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-emerald-700/50 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-lime-400 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-emerald-800/50 border-emerald-700">
              <CardHeader>
                <CardTitle className="text-lime-300">Top Items by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventory
                    .sort((a, b) => (b.cost * b.quantity) - (a.cost * a.quantity))
                    .slice(0, 10)
                    .map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-emerald-700/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center">
                            <span className="text-lime-400 font-bold text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-emerald-200">{item.name}</p>
                            <p className="text-xs text-emerald-400">{item.quantity} {item.unit} @ ${item.cost.toFixed(2)} each</p>
                          </div>
                        </div>
                        <span className="text-lime-400 font-bold">
                          ${(item.cost * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lime-300">Edit Inventory Item</DialogTitle>
            <DialogDescription className="text-emerald-300">
              Update the details for this inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Same form fields as Add Item dialog */}
            <div className="col-span-2">
              <Label htmlFor="editName" className="text-emerald-200">Item Name</Label>
              <Input
                id="editName"
                value={itemForm.name}
                onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="Enter item name"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="editDescription" className="text-emerald-200">Description</Label>
              <Textarea
                id="editDescription"
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="Enter item description"
              />
            </div>
            <div>
              <Label htmlFor="editCategory" className="text-emerald-200">Category</Label>
              <Select value={itemForm.category} onValueChange={(value) => setItemForm({...itemForm, category: value})}>
                <SelectTrigger className="bg-emerald-800/50 border-emerald-600 text-emerald-100">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-emerald-800 border-emerald-600">
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editUnit" className="text-emerald-200">Unit</Label>
              <Input
                id="editUnit"
                value={itemForm.unit}
                onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="e.g., L, kg, units"
              />
            </div>
            <div>
              <Label htmlFor="editQuantity" className="text-emerald-200">Quantity</Label>
              <Input
                id="editQuantity"
                type="number"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="editMinStockLevel" className="text-emerald-200">Min Stock Level</Label>
              <Input
                id="editMinStockLevel"
                type="number"
                value={itemForm.minStockLevel}
                onChange={(e) => setItemForm({...itemForm, minStockLevel: parseInt(e.target.value) || 0})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="1"
              />
            </div>
            <div>
              <Label htmlFor="editMaxStockLevel" className="text-emerald-200">Max Stock Level</Label>
              <Input
                id="editMaxStockLevel"
                type="number"
                value={itemForm.maxStockLevel}
                onChange={(e) => setItemForm({...itemForm, maxStockLevel: parseInt(e.target.value) || 0})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="editCost" className="text-emerald-200">Cost ($)</Label>
              <Input
                id="editCost"
                type="number"
                step="0.01"
                value={itemForm.cost}
                onChange={(e) => setItemForm({...itemForm, cost: parseFloat(e.target.value) || 0})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="editSellingPrice" className="text-emerald-200">Selling Price ($)</Label>
              <Input
                id="editSellingPrice"
                type="number"
                step="0.01"
                value={itemForm.sellingPrice}
                onChange={(e) => setItemForm({...itemForm, sellingPrice: parseFloat(e.target.value) || 0})}
                className="bg-emerald-800/50 border-emerald-600 text-emerald-100"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemOpen(false)} className="bg-emerald-800/50 border-emerald-600 text-emerald-200 hover:bg-emerald-700/50">
              Cancel
            </Button>
            <Button onClick={handleEditItem} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Dialog */}
      <Dialog open={isViewItemOpen} onOpenChange={setIsViewItemOpen}>
        <DialogContent className="bg-emerald-900 border-emerald-700 text-emerald-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lime-300">Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Name</h3>
                  <p className="text-emerald-100">{selectedItem.name}</p>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Category</h3>
                  <Badge variant="outline" className="bg-emerald-700/50 border-emerald-600 text-emerald-200">
                    {selectedItem.category}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Quantity</h3>
                  <p className="text-emerald-100">{selectedItem.quantity} {selectedItem.unit}</p>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Status</h3>
                  <Badge className={cn("border", getStatusColor(selectedItem.status))}>
                    {getStatusIcon(selectedItem.status)}
                    <span className="ml-1">{selectedItem.status}</span>
                  </Badge>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Cost</h3>
                  <p className="text-emerald-100">${selectedItem.cost.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Total Value</h3>
                  <p className="text-lime-400 font-bold">${(selectedItem.cost * selectedItem.quantity).toFixed(2)}</p>
                </div>
                {selectedItem.description && (
                  <div className="col-span-2">
                    <h3 className="text-emerald-200 font-medium mb-1">Description</h3>
                    <p className="text-emerald-100">{selectedItem.description}</p>
                  </div>
                )}
                {selectedItem.supplier && (
                  <div>
                    <h3 className="text-emerald-200 font-medium mb-1">Supplier</h3>
                    <p className="text-emerald-100">{selectedItem.supplier}</p>
                  </div>
                )}
                {selectedItem.location && (
                  <div>
                    <h3 className="text-emerald-200 font-medium mb-1">Location</h3>
                    <p className="text-emerald-100">{selectedItem.location}</p>
                  </div>
                )}
                {selectedItem.sku && (
                  <div>
                    <h3 className="text-emerald-200 font-medium mb-1">SKU</h3>
                    <p className="text-emerald-100">{selectedItem.sku}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Last Restocked</h3>
                  <p className="text-emerald-100">{selectedItem.lastRestocked}</p>
                </div>
                <div>
                  <h3 className="text-emerald-200 font-medium mb-1">Created</h3>
                  <p className="text-emerald-100">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewItemOpen(false)} className="bg-lime-600 hover:bg-lime-500 text-emerald-900">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}