import React, { useState, useEffect, Suspense } from 'react';
import {
    Leaf, AlertTriangle, Droplet, Droplets, Sun, Settings, CheckCircle, XCircle,
    RefreshCw, Image as ImageIcon, Upload, Database, Search, Trash2, Plus, Edit, Save,
    Wheat, Thermometer, Percent, Lightbulb, List, ArrowLeft, Activity, Tag,
    Brain, Ruler, Scale, Palette, Wifi, Zap, Clock, Bell, Cloud, HardDrive,
    Home, MessageSquare, Bot, Rocket, AlertOctagon, Shield, Globe, Cpu, Moon,
    LayoutDashboard, ChartBar, Video, Camera, Calendar, FlaskConical,
    ZapIcon, CloudRain, Wind, Minimize2, Maximize2, Monitor, Smartphone, Mail,
    MessageCircle, AlertCircle, Loader2, Menu, SendHorizontal, Book, Calculator,
    Bug, SprayCan, Scissors, Package, DollarSign, TrendingUp, Users, FileText,
    TestTube, Beaker, Eye, Heart, Timer, Target, Award, Archive, ShoppingCart,
    Clipboard, Filter, Download, DownloadCloud, UploadCloud, BarChart3, ActivityIcon,
    Flame, Snowflake, AirVent, LightbulbOff, Volume2, VolumeX, X, Grid,
    TrendingDown, Star, Wrench, LogOut, Sprout, ChevronDown, ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { useSocketContext } from '../../contexts/SocketContext';
import { analyzePlant, getStrains } from '../../lib/cannai-api';

// UI Components
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';

// Types
interface FormData {
  strain: string;
  leafSymptoms: string;
  phLevel: string;
  temperature: string;
  humidity: string;
  medium: string;
  growthStage: string;
  plantImage: string | null;
  pestDiseaseFocus: string;
  urgency: string;
  additionalNotes: string;
}

interface AnalysisResult {
  diagnosis?: string;
  urgency?: string;
  confidence?: number;
  healthScore?: number;
  causes?: string[];
  strainSpecificAdvice?: string;
  reasoning?: Array<{
    step: string;
    weight: number;
    explanation: string;
  }>;
  recommendations?: string[] | {
    immediate?: string[];
    shortTerm?: string[];
    longTerm?: string[];
  };
}

interface AnalysisMetadata {
  provider: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

interface Notification {
  id: number;
  type: 'alert' | 'info' | 'success' | 'error';
  message: string;
  time: string;
}

interface Strain {
  id: string;
  name: string;
  type: string;
  lineage?: string;
  description?: string;
  isPurpleStrain?: boolean;
  optimalConditions?: {
    ph: { range: [number, number]; medium: string };
    temperature: { veg: [number, number]; flower: [number, number] };
    humidity: { veg: [number, number]; flower: [number, number] };
    light: { veg: string; flower: string };
  };
  commonDeficiencies?: string[];
}

// Default data
const defaultStrains: Strain[] = [
  {
    id: 'strain_001',
    name: 'Blue Dream',
    type: 'Hybrid (60% Sativa)',
    lineage: 'Blueberry x Haze',
    description: 'Popular hybrid known for balanced effects and resilience',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Magnesium', 'Calcium']
  },
  {
    id: 'strain_002',
    name: 'Purple Kush',
    type: 'Indica',
    lineage: 'Hindu Kush x Purple Afghani',
    description: 'Classic purple strain known for vibrant colors and relaxing effects',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Potassium']
  },
  {
    id: 'strain_003',
    name: 'Girl Scout Cookies',
    type: 'Hybrid',
    lineage: 'OG Kush x Durban Poison',
    description: 'Award-winning hybrid with potent effects',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'hydro' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Magnesium', 'Calcium']
  }
];

// Dashboard Navigation Items
const dashboardItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analysis', label: 'AI Analysis', icon: Brain },
  { id: 'environment', label: 'Environment', icon: Thermometer },
  { id: 'strains', label: 'Strain Database', icon: Sprout },
];

const ComprehensiveDashboard: React.FC = () => {
  const { lastSensorData, isConnected } = useSocketContext();

  // Form & Analysis State
  const [formData, setFormData] = useState<FormData>({
    strain: 'Select Strain',
    leafSymptoms: '',
    phLevel: '',
    temperature: '',
    humidity: '',
    medium: 'soil',
    growthStage: 'flowering',
    plantImage: null,
    pestDiseaseFocus: 'all',
    urgency: 'medium',
    additionalNotes: ''
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<AnalysisMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // Data State
  const [strains, setStrains] = useState<Strain[]>(defaultStrains);
  const [sensorData, setSensorData] = useState({
    temperature: 22.5,
    humidity: 55,
    soilMoisture: 45,
    lightIntensity: 750,
    ph: 6.2,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85
  });
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, type: 'alert', message: 'pH levels dropping below optimal range', time: '2 min ago' },
    { id: 2, type: 'info', message: 'Automated watering cycle completed successfully', time: '15 min ago' }
  ]);

  // UI State
  const [activeDashboard, setActiveDashboard] = useState('overview');
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Update sensor data from Socket.IO context
  useEffect(() => {
    if (lastSensorData) {
      setSensorData(prev => ({ ...prev, ...lastSensorData }));
    }
  }, [lastSensorData]);

  // Fetch Strains from API
  useEffect(() => {
    const fetchStrains = async () => {
      try {
        const strainsData = await getStrains();
        if (strainsData && strainsData.length > 0) {
          setStrains(strainsData);
        }
      } catch (error) {
        console.log('Using default strains due to API unavailability');
        // Continue with default strains if API is not available
      }
    };
    fetchStrains();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/'))) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setFormData(prev => ({ ...prev, plantImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAnalysisResult(null);
    setAnalysisMetadata(null);

    try {
      const payload = { ...formData };

      // Call the real API
      const response = await analyzePlant(payload);

      setAnalysisResult(response.analysis);
      if (response.metadata) {
        setAnalysisMetadata(response.metadata);

        // Show notification about provider usage
        if (response.metadata.fallbackUsed) {
          setNotifications(prev => [{
            id: Date.now(),
            type: 'alert',
            message: `Analysis completed using fallback provider (${response.metadata?.provider}). Reason: ${response.metadata?.fallbackReason}`,
            time: 'Just now'
          }, ...prev]);
        } else {
          setNotifications(prev => [{
            id: Date.now(),
            type: 'success',
            message: `Analysis completed successfully using ${response.metadata?.provider}`,
            time: 'Just now'
          }, ...prev]);
        }
      }

      setIsLoading(false);

    } catch (error: any) {
      console.error('Analysis error:', error);
      setNotifications(prev => [{
        id: Date.now(),
        type: 'error',
        message: `Analysis failed: ${error.message}`,
        time: 'Just now'
      }, ...prev]);
      setIsLoading(false);
    }
  };

  // Environmental stats for cards
  const environmentalStats = [
    { label: 'Temperature', value: `${sensorData.temperature}°C`, icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { label: 'Humidity', value: `${sensorData.humidity}%`, icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Soil Moisture', value: `${sensorData.soilMoisture}%`, icon: Droplet, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Light Intensity', value: `${sensorData.lightIntensity} µmol`, icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'pH Level', value: sensorData.ph.toFixed(1), icon: FlaskConical, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'EC Level', value: `${sensorData.ec} mS/cm`, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'VPD', value: `${sensorData.vpd} kPa`, icon: Cloud, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'CO2', value: `${sensorData.co2} ppm`, icon: Wind, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  ];

  // Chart data for environmental trends
  const environmentalTrendsData = [
    { time: '00:00', temp: 22, hum: 50, co2: 800 },
    { time: '04:00', temp: 21, hum: 52, co2: 750 },
    { time: '08:00', temp: 23, hum: 55, co2: 900 },
    { time: '12:00', temp: 25, hum: 48, co2: 1200 },
    { time: '16:00', temp: 24, hum: 50, co2: 1100 },
    { time: '20:00', temp: 22, hum: 53, co2: 850 },
    { time: '24:00', temp: 21, hum: 55, co2: 800 },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0f1419] text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800 bg-[#181b21]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">CannaAI Pro Dashboard</h1>
          <Badge variant="outline" className={`${isConnected ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
            {isConnected ? 'Connected' : 'Offline'}
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700">
            <Plus className="w-4 h-4 mr-2" />
            New Grow
          </Button>
          <Button variant="ghost" size="sm" className="relative text-gray-400 hover:text-white hover:bg-gray-800">
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <div className="lg:hidden px-4 py-2 border-b border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <Menu className="w-5 h-5 mr-2" />
          {showMobileMenu ? 'Hide Menu' : 'Show Menu'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${showMobileMenu ? 'block' : 'hidden'} lg:block w-64 border-r border-gray-800 bg-[#181b21] overflow-y-auto`}>
          <nav className="p-4 space-y-2">
            {dashboardItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveDashboard(item.id);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeDashboard === item.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${activeDashboard === item.id ? 'text-emerald-400' : 'text-gray-500'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400">System Online</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Overview Dashboard */}
            {activeDashboard === 'overview' && (
              <div className="space-y-6">
                {/* Analysis and Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* New Analysis Card */}
                  <Card className="bg-[#1a1f2e] border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-emerald-400" />
                        New Analysis
                      </CardTitle>
                      <CardDescription className="text-gray-400">Upload a photo or enter details for AI diagnosis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-gray-300">Strain</Label>
                          <Select value={formData.strain} onValueChange={(val) => setFormData(prev => ({ ...prev, strain: val }))}>
                            <SelectTrigger className="bg-[#0f1419] border-gray-700 text-gray-200">
                              <SelectValue placeholder="Select Strain" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1f2e] border-gray-700">
                              {strains.map(s => (
                                <SelectItem key={s.id} value={s.name} className="focus:bg-gray-800">
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300">Plant Image</Label>
                          <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-[#0f1419] hover:bg-[#1a1f2e] transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {image ? (
                                  <img src={image} alt="Preview" className="h-24 object-contain rounded-md" />
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 mb-3 text-gray-500" />
                                    <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                  </>
                                )}
                              </div>
                              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-gray-300">Symptoms / Notes</Label>
                          <Textarea
                            placeholder="Describe what you see..."
                            value={formData.leafSymptoms}
                            onChange={(e) => setFormData(prev => ({ ...prev, leafSymptoms: e.target.value }))}
                            className="bg-[#0f1419] border-gray-700 text-gray-200 min-h-[100px]"
                          />
                        </div>

                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 mr-2" />
                              Analyze Plant
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Analysis Results Card */}
                  {analysisResult && (
                    <Card className="bg-[#1a1f2e] border-emerald-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-emerald-400">
                          <Activity className="w-5 h-5 mr-2" />
                          Analysis Results
                          {analysisMetadata?.provider && (
                            <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400">
                              {analysisMetadata.provider}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex flex-col space-y-6">
                          {/* Header Section: Health Score & Urgency */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-white">{analysisResult.diagnosis || 'Analysis Complete'}</h3>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                  analysisResult.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                  analysisResult.urgency === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                  analysisResult.urgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                }`}>
                                  {analysisResult.urgency || 'NORMAL'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Confidence: {analysisResult.confidence || 0}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-4xl font-bold ${
                                (analysisResult.healthScore || 0) > 70 ? "text-emerald-400" :
                                (analysisResult.healthScore || 0) > 40 ? "text-amber-400" :
                                "text-red-400"
                              }`}>
                                {analysisResult.healthScore || '?'}
                              </div>
                              <div className="text-xs text-gray-500 uppercase font-medium tracking-wider">Health Score</div>
                            </div>
                          </div>

                          {/* Root Causes */}
                          {analysisResult.causes && analysisResult.causes.length > 0 && (
                            <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-700">
                              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
                                Identified Causes
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {analysisResult.causes.map((cause, i) => (
                                  <li key={i} className="text-sm text-gray-400">{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommendations */}
                          {analysisResult.recommendations && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                                <ClipboardList className="w-4 h-4 mr-2 text-emerald-400" />
                                Recommended Actions
                              </h4>

                              {Array.isArray(analysisResult.recommendations) ? (
                                <ul className="space-y-2">
                                  {analysisResult.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start text-sm text-gray-400">
                                      <span className="mr-2 text-emerald-500">•</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              ) : typeof analysisResult.recommendations === 'object' && (
                                <div className="space-y-4">
                                  {analysisResult.recommendations.immediate && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">Immediate Action</h5>
                                      <ul className="space-y-2">
                                        {analysisResult.recommendations.immediate.map((rec, i) => (
                                          <li key={i} className="flex items-start text-sm text-gray-400">
                                            <span className="mr-2 text-red-500">•</span>
                                            {rec}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {analysisResult.recommendations.shortTerm && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-amber-400 uppercase mb-2">Short Term</h5>
                                      <ul className="space-y-2">
                                        {analysisResult.recommendations.shortTerm.map((rec, i) => (
                                          <li key={i} className="flex items-start text-sm text-gray-400">
                                            <span className="mr-2 text-amber-500">•</span>
                                            {rec}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {analysisResult.recommendations.longTerm && (
                                    <div>
                                      <h5 className="text-xs font-semibold text-blue-400 uppercase mb-2">Long Term</h5>
                                      <ul className="space-y-2">
                                        {analysisResult.recommendations.longTerm.map((rec, i) => (
                                          <li key={i} className="flex items-start text-sm text-gray-400">
                                            <span className="mr-2 text-blue-500">•</span>
                                            {rec}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Environmental Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {environmentalStats.slice(0, 8).map((stat, index) => (
                    <Card key={index} className="bg-[#1a1f2e] border-gray-800 hover:bg-[#232937] transition-all duration-300">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                          <h3 className="text-xl font-bold text-white mt-1">{stat.value}</h3>
                        </div>
                        <div className={`p-2 rounded-full ${stat.bg} ${stat.border} border`}>
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Trends and Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Environmental Trends Chart */}
                  <Card className="lg:col-span-2 bg-[#1a1f2e] border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Environmental Trends</CardTitle>
                      <CardDescription className="text-gray-400">24-hour temperature and humidity monitoring</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={environmentalTrendsData}>
                            <defs>
                              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #374151', borderRadius: '8px' }}
                              itemStyle={{ color: '#f3f4f6' }}
                            />
                            <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Temperature (°C)" />
                            <Area type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" name="Humidity (%)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Alerts */}
                  <Card className="bg-[#1a1f2e] border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Alerts</CardTitle>
                      <CardDescription className="text-gray-400">System notifications and warnings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {notifications.slice(0, 5).map((notification) => (
                          <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-[#0f1419] border border-gray-800">
                            {notification.type === 'alert' || notification.type === 'error' ? (
                              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                            ) : notification.type === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-200">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Environment Tab */}
            {activeDashboard === 'environment' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Environmental Monitoring</h2>
                  <p className="text-gray-400">Real-time sensor data and environmental controls</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {environmentalStats.map((stat, index) => (
                    <Card key={index} className="bg-[#1a1f2e] border-gray-800">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                          <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bg} ${stat.border} border`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-[#1a1f2e] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">24-Hour Environmental Trends</CardTitle>
                    <CardDescription className="text-gray-400">Comprehensive monitoring of all environmental parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={environmentalTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #374151', borderRadius: '8px' }}
                            itemStyle={{ color: '#f3f4f6' }}
                          />
                          <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} name="Temperature (°C)" />
                          <Line type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" />
                          <Line type="monotone" dataKey="co2" stroke="#10b981" strokeWidth={2} name="CO2 (ppm/10)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Strains Tab */}
            {activeDashboard === 'strains' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Strain Database</h2>
                  <p className="text-gray-400">Comprehensive cannabis strain information and growing requirements</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {strains.map((strain) => (
                    <Card key={strain.id} className="bg-[#1a1f2e] border-gray-800 hover:bg-[#232937] transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white">{strain.name}</CardTitle>
                          {strain.isPurpleStrain && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                              Purple
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-gray-400">{strain.type}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {strain.lineage && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Lineage:</span>
                              <p className="text-sm text-gray-300">{strain.lineage}</p>
                            </div>
                          )}
                          {strain.description && (
                            <p className="text-sm text-gray-400">{strain.description}</p>
                          )}
                          {strain.optimalConditions && (
                            <div className="space-y-2">
                              <span className="text-xs font-medium text-gray-500">Optimal Conditions:</span>
                              <div className="text-xs text-gray-400 space-y-1">
                                <div>pH: {strain.optimalConditions.ph.range[0]}-{strain.optimalConditions.ph.range[1]}</div>
                                <div>Temp: {strain.optimalConditions.temperature.veg[0]}-{strain.optimalConditions.temperature.veg[1]}°C (veg)</div>
                                <div>Humidity: {strain.optimalConditions.humidity.veg[0]}-{strain.optimalConditions.humidity.veg[1]}% (veg)</div>
                              </div>
                            </div>
                          )}
                          {strain.commonDeficiencies && strain.commonDeficiencies.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">Common Deficiencies:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {strain.commonDeficiencies.map((deficiency, i) => (
                                  <Badge key={i} variant="outline" className="text-xs border-gray-700 text-gray-400">
                                    {deficiency}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis Tab */}
            {activeDashboard === 'analysis' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">AI Analysis Center</h2>
                  <p className="text-gray-400">Advanced plant health analysis and AI-powered recommendations</p>
                </div>

                {!analysisResult ? (
                  <Card className="bg-[#1a1f2e] border-gray-800">
                    <CardContent className="p-12 text-center">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Analysis Available</h3>
                      <p className="text-gray-400 mb-6">Start a new plant analysis from the Overview tab to see detailed results here.</p>
                      <Button
                        onClick={() => setActiveDashboard('overview')}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        Go to Overview
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Detailed Analysis Results */}
                    <Card className="bg-[#1a1f2e] border-emerald-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-emerald-400">
                          <Activity className="w-6 h-6 mr-2" />
                          Complete Analysis Report
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Analysis Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-700">
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Diagnosis</h4>
                            <p className="text-lg font-bold text-white">{analysisResult.diagnosis}</p>
                          </div>
                          <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-700">
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Health Score</h4>
                            <p className={`text-2xl font-bold ${
                              (analysisResult.healthScore || 0) > 70 ? "text-emerald-400" :
                              (analysisResult.healthScore || 0) > 40 ? "text-amber-400" :
                              "text-red-400"
                            }`}>
                              {analysisResult.healthScore}/100
                            </p>
                          </div>
                          <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-700">
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Confidence</h4>
                            <p className="text-2xl font-bold text-blue-400">{analysisResult.confidence}%</p>
                          </div>
                        </div>

                        {/* Full Analysis Details */}
                        {analysisResult.reasoning && (
                          <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-700">
                            <h4 className="text-sm font-medium text-gray-300 mb-4">Analysis Reasoning</h4>
                            <div className="space-y-3">
                              {analysisResult.reasoning.map((step, i) => (
                                <div key={i} className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                                    <span className="text-xs font-medium text-emerald-400">{i + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-200">{step.step}</span>
                                      <span className="text-xs text-gray-500">{step.weight}% weight</span>
                                    </div>
                                    <p className="text-xs text-gray-400">{step.explanation}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strain-Specific Advice */}
                        {analysisResult.strainSpecificAdvice && (
                          <div className="bg-purple-950/20 rounded-lg p-4 border border-purple-500/30">
                            <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                              <Sprout className="w-4 h-4 mr-2" />
                              Strain-Specific Advice
                            </h4>
                            <p className="text-sm text-gray-300 italic">"{analysisResult.strainSpecificAdvice}"</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComprehensiveDashboard;