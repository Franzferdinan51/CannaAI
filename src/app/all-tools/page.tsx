'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LiveCamera from '@/components/live-camera';
import USBDeviceConfig from '@/components/usb-device-config';
import {
  Bug,
  Calculator,
  Beaker,
  Settings,
  TrendingUp,
  BookOpen,
  Wrench,
  Scissors,
  Package,
  Archive,
  Eye,
  Camera,
  Microscope,
  Webcam,
  Usb,
  Monitor,
  Zap,
  Leaf,
  Droplets,
  Thermometer,
  Activity,
  AlertTriangle,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

// Tool components imports
const PestDiseaseIdentifier = () => (
  <Card className="bg-slate-800/50 border-slate-600">
    <CardHeader>
      <CardTitle className="flex items-center text-slate-200">
        <Bug className="h-5 w-5 mr-2" />
        Pest & Disease Identifier
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
        <Bug className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-300 mb-4">Upload plant images for pest and disease analysis</p>
        <Button className="bg-green-600 hover:bg-green-500">
          <Camera className="h-4 w-4 mr-2" />
          Capture Image
        </Button>
      </div>
      <Alert className="border-blue-600 bg-blue-950/50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          AI-powered identification of common cannabis pests, diseases, and deficiencies with treatment recommendations.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

const HarvestTracker = () => (
  <Card className="bg-slate-800/50 border-slate-600">
    <CardHeader>
      <CardTitle className="flex items-center text-slate-200">
        <Scissors className="h-5 w-5 mr-2" />
        Harvest Tracker
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">47</div>
          <div className="text-sm text-slate-400">Plants Harvested</div>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">2.4kg</div>
          <div className="text-sm text-slate-400">Total Yield</div>
        </div>
        <div className="bg-purple-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">A+</div>
          <div className="text-sm text-slate-400">Quality Grade</div>
        </div>
      </div>
      <Button className="w-full bg-purple-600 hover:bg-purple-500">
        <Scissors className="h-4 w-4 mr-2" />
        Log Harvest
      </Button>
    </CardContent>
  </Card>
);

const NutrientCalculator = () => (
  <Card className="bg-slate-800/50 border-slate-600">
    <CardHeader>
      <CardTitle className="flex items-center text-slate-200">
        <Calculator className="h-5 w-5 mr-2" />
        Nutrient Calculator
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Growth Stage</label>
          <select className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200">
            <option>Seedling</option>
            <option>Vegetative</option>
            <option>Flowering</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Water Volume (L)</label>
          <input type="number" className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200" defaultValue="10" />
        </div>
      </div>
      <div className="bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-300 mb-2">Recommended Mix</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Grow A:</span>
            <span className="text-slate-300">4ml/L</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Grow B:</span>
            <span className="text-slate-300">4ml/L</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Micro:</span>
            <span className="text-slate-300">1ml/L</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const InventoryManager = () => (
  <Card className="bg-slate-800/50 border-slate-600">
    <CardHeader>
      <CardTitle className="flex items-center text-slate-200">
        <Archive className="h-5 w-5 mr-2" />
        Inventory Manager
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-orange-900/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Nutrients</span>
            <Badge className="bg-orange-600">Low Stock</Badge>
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-1">3 items</div>
        </div>
        <div className="bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Equipment</span>
            <Badge className="bg-green-600">Good</Badge>
          </div>
          <div className="text-2xl font-bold text-green-400 mt-1">12 items</div>
        </div>
      </div>
      <Button variant="outline" className="w-full border-slate-600 text-slate-300">
        <Package className="h-4 w-4 mr-2" />
        Manage Inventory
      </Button>
    </CardContent>
  </Card>
);

const SystemDiagnostics = () => (
  <Card className="bg-slate-800/50 border-slate-600">
    <CardHeader>
      <CardTitle className="flex items-center text-slate-200">
        <Settings className="h-5 w-5 mr-2" />
        System Diagnostics
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-slate-300">Camera System</span>
          </div>
          <Badge className="bg-green-600">Online</Badge>
        </div>
        <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
            <span className="text-slate-300">AI Analysis</span>
          </div>
          <Badge className="bg-green-600">Operational</Badge>
        </div>
        <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-slate-300">Storage Space</span>
          </div>
          <Badge className="bg-yellow-600">78% Full</Badge>
        </div>
      </div>
      <Button variant="outline" className="w-full border-slate-600 text-slate-300">
        <RefreshCw className="h-4 w-4 mr-2" />
        Run Diagnostics
      </Button>
    </CardContent>
  </Card>
);

export default function AllToolsPage() {
  const [selectedUSBDevice, setSelectedUSBDevice] = useState<any>(null);
  const [liveAnalysisData, setLiveAnalysisData] = useState<any>(null);

  // Handle image capture from live camera
  const handleImageCapture = async (imageData: string, deviceInfo: any) => {
    console.log('Image captured for analysis:', deviceInfo);
    // Handle analysis
  };

  // Handle trichome analysis
  const handleTrichomeAnalysis = async (imageData: string, deviceInfo: any) => {
    console.log('Trichome analysis requested:', deviceInfo);
    // Handle trichome analysis
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">Cultivation Tools Suite</h1>
            <p className="text-slate-300 text-lg">
              Complete toolkit for cannabis cultivation management and analysis
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-600 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              All Systems Online
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Tools Grid */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-slate-800/50 border border-slate-600">
          <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="live-vision" className="text-slate-300 data-[state=active]:bg-slate-700">
            Live Vision
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-slate-300 data-[state=active]:bg-slate-700">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="tracking" className="text-slate-300 data-[state=active]:bg-slate-700">
            Tracking
          </TabsTrigger>
          <TabsTrigger value="utilities" className="text-slate-300 data-[state=active]:bg-slate-700">
            Utilities
          </TabsTrigger>
          <TabsTrigger value="system" className="text-slate-300 data-[state=active]:bg-slate-700">
            System
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-600 hover:from-blue-800/40 hover:to-blue-700/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Eye className="h-8 w-8 text-blue-400" />
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <CardTitle className="text-slate-200">Live Plant Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  Real-time plant health monitoring with USB webcam and microscope integration
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">AI Analysis</Badge>
                  <Badge variant="outline" className="border-purple-600 text-purple-400 text-xs">Trichomes</Badge>
                  <Badge variant="outline" className="border-green-600 text-green-400 text-xs">Mobile</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-600 hover:from-green-800/40 hover:to-green-700/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Bug className="h-8 w-8 text-green-400" />
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <CardTitle className="text-slate-200">Pest & Disease ID</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  AI-powered identification and treatment recommendations for pests and diseases
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-green-600 text-green-400 text-xs">Visual Analysis</Badge>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-400 text-xs">Treatments</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-purple-600 hover:from-purple-800/40 hover:to-purple-700/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Scissors className="h-8 w-8 text-purple-400" />
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <CardTitle className="text-slate-200">Harvest Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  Comprehensive harvest management with yield tracking and curing schedules
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-purple-600 text-purple-400 text-xs">Yield Analysis</Badge>
                  <Badge variant="outline" className="border-orange-600 text-orange-400 text-xs">Curing</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 border-orange-600 hover:from-orange-800/40 hover:to-orange-700/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Calculator className="h-8 w-8 text-orange-400" />
                  <Badge className="bg-yellow-600">Coming Soon</Badge>
                </div>
                <CardTitle className="text-slate-200">Nutrient Calculator</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  Calculate optimal nutrient ratios and feeding schedules for your plants
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-orange-600 text-orange-400 text-xs">NPK</Badge>
                  <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">pH</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/30 border-cyan-600 hover:from-cyan-800/40 hover:to-cyan-700/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Archive className="h-8 w-8 text-cyan-400" />
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <CardTitle className="text-slate-200">Inventory Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  Track plants, equipment, and supplies with automated reorder alerts
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-cyan-600 text-cyan-400 text-xs">Stock Tracking</Badge>
                  <Badge variant="outline" className="border-red-600 text-red-400 text-xs">Alerts</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-700/30 to-slate-600/30 border-slate-600 hover:from-slate-600/40 hover:to-slate-500/40 transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Settings className="h-8 w-8 text-slate-400" />
                  <Badge className="bg-blue-600">Planned</Badge>
                </div>
                <CardTitle className="text-slate-200">System Diagnostics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm mb-4">
                  Monitor system performance and optimize cultivation environment
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">Performance</Badge>
                  <Badge variant="outline" className="border-green-600 text-green-400 text-xs">Health</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Vision Tab */}
        <TabsContent value="live-vision" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* USB Device Configuration */}
            <div className="space-y-6">
              <USBDeviceConfig
                onDeviceSelect={setSelectedUSBDevice}
                selectedDevice={selectedUSBDevice}
              />

              {/* Live Camera */}
              <LiveCamera
                onImageCapture={handleImageCapture}
                onTrichomeAnalysis={handleTrichomeAnalysis}
                autoAnalyze={false}
                enableTrichomeMode={true}
              />
            </div>

            {/* Live Analysis Display */}
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-200">
                    <Activity className="h-5 w-5 mr-2" />
                    Live Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {liveAnalysisData ? (
                    <div className="space-y-4">
                      <div className="bg-green-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-green-400 font-medium">Health Score</span>
                          <span className="text-2xl font-bold text-green-300">92%</span>
                        </div>
                        <div className="w-full bg-green-900 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Issues Found:</span>
                          <p className="text-slate-300 font-medium">0 Critical</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Last Analysis:</span>
                          <p className="text-slate-300 font-medium">Just now</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Start camera feed to begin live analysis</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Status */}
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-200">
                    <Monitor className="h-5 w-5 mr-2" />
                    Device Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">USB Devices</span>
                    <Badge className="bg-green-600">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Trichome Analysis</span>
                    <Badge className="bg-purple-600">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mobile Support</span>
                    <Badge className="bg-blue-600">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">AI Processing</span>
                    <Badge className="bg-green-600">Online</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PestDiseaseIdentifier />
            <div className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-200">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Harvest Optimizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-300 mb-4">Predict optimal harvest timing based on trichome development</p>
                    <Badge className="bg-blue-600">Coming Soon</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-200">
                    <Beaker className="h-5 w-5 mr-2" />
                    Strain Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Beaker className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-300 mb-4">Comprehensive cannabis strain database</p>
                    <Badge className="bg-yellow-600">Coming Soon</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HarvestTracker />
            <InventoryManager />

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Growing Journal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-300 mb-4">Track your grow journey with detailed notes and photos</p>
                  <Badge className="bg-blue-600">Planned</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Package className="h-5 w-5 mr-2" />
                  Logistics Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">15</div>
                    <div className="text-xs text-slate-400">Active Orders</div>
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">8</div>
                    <div className="text-xs text-slate-400">Delivered</div>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-500">
                  <Package className="h-4 w-4 mr-2" />
                  Manage Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Utilities Tab */}
        <TabsContent value="utilities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NutrientCalculator />

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Thermometer className="h-5 w-5 mr-2" />
                  Environment Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Temperature (°F)</label>
                    <input type="number" className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200" defaultValue="75" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Humidity (%)</label>
                    <input type="number" className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200" defaultValue="50" />
                  </div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-300 mb-2">VPD Calculation</h4>
                  <div className="text-2xl font-bold text-blue-400">1.2 kPa</div>
                  <p className="text-sm text-slate-400 mt-1">Optimal for flowering stage</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Zap className="h-5 w-5 mr-2" />
                  Light Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Grow Area (sq ft)</label>
                  <input type="number" className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200" defaultValue="16" />
                </div>
                <div className="bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-300 mb-2">Recommended Lighting</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vegetative:</span>
                      <span className="text-slate-300">320W LED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flowering:</span>
                      <span className="text-slate-300">480W LED</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Droplets className="h-5 w-5 mr-2" />
                  Water Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Plant Count</label>
                    <input type="number" className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200" defaultValue="8" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Stage</label>
                    <select className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200">
                      <option>Vegetative</option>
                      <option>Flowering</option>
                    </select>
                  </div>
                </div>
                <div className="bg-cyan-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-cyan-300 mb-2">Daily Water Needs</h4>
                  <div className="text-2xl font-bold text-cyan-400">2.4 Gallons</div>
                  <p className="text-sm text-slate-400 mt-1">~300ml per plant</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemDiagnostics />

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Settings className="h-5 w-5 mr-2" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Auto Analysis</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Notifications</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Data Export</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">API Access</span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Activity className="h-5 w-5 mr-2" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900/20 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-400">99.8%</div>
                    <div className="text-xs text-slate-400">Uptime</div>
                  </div>
                  <div className="bg-blue-900/20 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-400">1.2s</div>
                    <div className="text-xs text-slate-400">Avg Response</div>
                  </div>
                  <div className="bg-purple-900/20 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-400">2,847</div>
                    <div className="text-xs text-slate-400">Analyses</div>
                  </div>
                  <div className="bg-orange-900/20 rounded-lg p-3">
                    <div className="text-xl font-bold text-orange-400">45GB</div>
                    <div className="text-xs text-slate-400">Data Used</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-200">
                  <Usb className="h-5 w-5 mr-2" />
                  Device Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Usb className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-300 mb-4">Manage connected devices and peripherals</p>
                  <Button variant="outline" className="border-slate-600 text-slate-300">
                    Device Manager
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}