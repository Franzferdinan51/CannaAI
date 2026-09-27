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
import { useNavigate } from 'react-router-dom';
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
import OverviewTab from './OverviewTab';

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

interface ComprehensiveDashboardProps {
  initialDashboard?: 'overview' | 'analysis' | 'environment' | 'strains';
}

const ComprehensiveDashboard: React.FC<ComprehensiveDashboardProps> = ({ initialDashboard = 'overview' }) => {
  const navigate = useNavigate();
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
  const [activeDashboard, setActiveDashboard] = useState(initialDashboard);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setActiveDashboard(initialDashboard);
  }, [initialDashboard]);

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
    e.target.value = '';
    if (file && (file.type.startsWith('image/'))) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setFormError(null);
        setFormData(prev => ({ ...prev, plantImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasStrain = formData.strain.trim() !== '' && formData.strain !== 'Select Strain';
    const hasSymptoms = formData.leafSymptoms.trim() !== '';
    if (!hasStrain || (!hasSymptoms && !image)) {
      setFormError(!hasStrain
        ? 'Select a plant strain before starting the analysis.'
        : 'Describe the symptoms or upload a plant image before starting the analysis.');
      return;
    }
    setFormError(null);
    setIsLoading(true);
    setAnalysisResult(null);
    setAnalysisMetadata(null);
    setAnalysisError(null);

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
      const message = error instanceof Error ? error.message : 'Unable to analyze the plant.';
      setAnalysisError(message);
      setNotifications(prev => [{
        id: Date.now(),
        type: 'error',
        message: `Analysis failed: ${message}`,
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
    <div className="relative flex flex-1 flex-col text-gray-100">
      {/* Tab bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 sm:px-2 pt-1 pb-4">
        <div className="glass inline-flex items-center gap-1 rounded-2xl p-1.5 self-start" role="tablist" aria-label="Dashboard sections">
          {dashboardItems.map((item) => {
            const active = activeDashboard === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveDashboard(item.id as 'overview' | 'analysis' | 'environment' | 'strains');
                  setShowMobileMenu(false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  active ? 'text-white' : 'text-white/45 hover:text-white/85'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dash-tab-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/25 to-lime-400/10 border border-emerald-400/30 shadow-[0_0_20px_-6px_rgba(52,211,153,0.7)]"
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                  />
                )}
                <item.icon className={`relative z-10 w-4 h-4 ${active ? 'text-emerald-300' : ''}`} />
                <span className="relative z-10 hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/plants')} aria-label="Start a new grow" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1.5" />
            New Grow
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowNotifications(!showNotifications)} aria-label="Show dashboard notifications" aria-expanded={showNotifications} aria-controls="dashboard-notifications" className="relative rounded-xl !px-3">
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
            )}
          </Button>
        </div>
      </div>

      {showNotifications && (
        <div id="dashboard-notifications" className="glass-deep absolute right-2 sm:right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-80 rounded-2xl p-4" role="region" aria-label="Dashboard notifications panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-semibold text-white">Notifications</h2><button type="button" aria-label="Close dashboard notifications" onClick={() => setShowNotifications(false)} className="text-xs font-semibold text-white/40 hover:text-white">Close</button></div>
          {notifications.length === 0 ? <p className="text-sm text-white/40">No notifications.</p> : <div className="space-y-2 max-h-80 overflow-y-auto">{notifications.map((notification) => <div key={notification.id} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-sm text-white/70"><p>{notification.message}</p><p className="mt-1 text-xs text-white/30">{notification.time}</p></div>)}</div>}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="px-1 sm:px-2 pb-2">
            {/* Overview Dashboard */}
            {activeDashboard === 'overview' && (
              <OverviewTab
                sensorData={sensorData}
                isConnected={isConnected}
                strains={strains}
                notifications={notifications}
                formData={formData}
                setFormData={setFormData}
                image={image}
                handleImageUpload={handleImageUpload}
                handleFormSubmit={handleFormSubmit}
                isLoading={isLoading}
                formError={formError}
                setFormError={setFormError}
                analysisResult={analysisResult}
                analysisMetadata={analysisMetadata}
                analysisError={analysisError}
                onOpenScanner={() => navigate('/scanner')}
              />
            )}

            {/* Environment Tab */}
            {activeDashboard === 'environment' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Environmental Monitoring</h2>
                  <p className="text-white/45">Real-time sensor data and environmental controls</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {environmentalStats.map((stat, index) => (
                    <Card key={index} className="">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold text-white/40">{stat.label}</p>
                          <h3 className="font-display text-2xl font-bold text-white mt-1">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-full ${stat.bg} ${stat.border} border`}>
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="">
                  <CardHeader>
                    <CardTitle className="text-white font-display">24-Hour Environmental Trends</CardTitle>
                    <CardDescription className="text-white/45">Comprehensive monitoring of all environmental parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={320} initialDimension={{ width: 1, height: 320 }}>
                        <LineChart data={environmentalTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.07)" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(10,15,13,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: 12 }}
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
                  <h2 className="font-display text-2xl font-bold text-white mb-2">Strain Database</h2>
                  <p className="text-white/45">Comprehensive cannabis strain information and growing requirements</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {strains.map((strain) => (
                    <Card key={strain.id} className="card-hover">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white">{strain.name}</CardTitle>
                          {strain.isPurpleStrain && (
                            <Badge className="!bg-purple-400/10 !text-purple-300 !border-purple-400/30">
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
                              <span className="text-xs font-semibold text-white/40">Lineage:</span>
                              <p className="text-sm text-white/70">{strain.lineage}</p>
                            </div>
                          )}
                          {strain.description && (
                            <p className="text-sm text-white/50">{strain.description}</p>
                          )}
                          {strain.optimalConditions && (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-white/40">Optimal Conditions:</span>
                              <div className="text-xs text-white/45 space-y-1">
                                <div>pH: {strain.optimalConditions.ph.range[0]}-{strain.optimalConditions.ph.range[1]}</div>
                                <div>Temp: {strain.optimalConditions.temperature.veg[0]}-{strain.optimalConditions.temperature.veg[1]}°C (veg)</div>
                                <div>Humidity: {strain.optimalConditions.humidity.veg[0]}-{strain.optimalConditions.humidity.veg[1]}% (veg)</div>
                              </div>
                            </div>
                          )}
                          {strain.commonDeficiencies && strain.commonDeficiencies.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-white/40">Common Deficiencies:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {strain.commonDeficiencies.map((deficiency, i) => (
                                  <Badge key={i} variant="outline" className="!text-[11px]">
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
                  <h2 className="font-display text-2xl font-bold text-white mb-2">AI Analysis Center</h2>
                  <p className="text-white/45">Advanced plant health analysis and AI-powered recommendations</p>
                </div>

                {!analysisResult ? (
                  <Card className="">
                    <CardContent className="p-12 text-center">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-xl font-semibold text-white mb-2">No Analysis Available</h3>
                      <p className="text-white/45 mb-6">Start a new plant analysis from the Overview tab to see detailed results here.</p>
                      <Button
                        type="button"
                        onClick={() => setActiveDashboard('overview')}
                        className="btn-primary-glow"
                      >
                        Go to Overview
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Detailed Analysis Results */}
                    <Card className="!border-emerald-400/25 glow-leaf">
                      <CardHeader>
                        <CardTitle className="flex items-center text-emerald-300 font-display">
                          <Activity className="w-6 h-6 mr-2" />
                          Complete Analysis Report
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Analysis Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Diagnosis</h4>
                            <p className="font-display text-lg font-bold text-white">{analysisResult.diagnosis}</p>
                          </div>
                          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Health Score</h4>
                            <p className={`text-2xl font-bold ${
                              (analysisResult.healthScore || 0) > 70 ? "text-emerald-400" :
                              (analysisResult.healthScore || 0) > 40 ? "text-amber-400" :
                              "text-red-400"
                            }`}>
                              {analysisResult.healthScore}/100
                            </p>
                          </div>
                          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Confidence</h4>
                            <p className="text-2xl font-bold text-blue-400">{analysisResult.confidence}%</p>
                          </div>
                        </div>

                        {/* Full Analysis Details */}
                        {analysisResult.reasoning && (
                          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.07]">
                            <h4 className="text-sm font-semibold text-white/70 mb-4">Analysis Reasoning</h4>
                            <div className="space-y-3">
                              {analysisResult.reasoning.map((step, i) => (
                                <div key={i} className="flex items-start space-x-3">
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                                    <span className="text-xs font-medium text-emerald-400">{i + 1}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-white/80">{step.step}</span>
                                      <span className="text-xs text-white/35">{step.weight}% weight</span>
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
