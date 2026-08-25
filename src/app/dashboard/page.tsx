'use client';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    TrendingDown, Star, Wrench, LogOut, Sprout, ChevronDown, ClipboardList, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { io } from 'socket.io-client';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CannaAIAssistantSidebar } from '@/components/ai/cannai-assistant-sidebar';

// Default strain database with purple strain indicators (Fallback)
const defaultStrains = [
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
    // ... (Keep a few defaults for immediate render)
];

type DashboardSensorData = {
    temperature: number | null;
    humidity: number | null;
    soilMoisture: number | null;
    lightIntensity: number | null;
    ph: number | null;
    ec: number | null;
    co2: number | null;
    vpd: number | null;
};

const initialSensorData: DashboardSensorData = {
    temperature: null,
    humidity: null,
    soilMoisture: null,
    lightIntensity: null,
    ph: null,
    ec: null,
    co2: null,
    vpd: null
};

// Dashboard Navigation Items
const dashboardItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis', label: 'AI Analysis', icon: Brain },
    { id: 'environment', label: 'Environment', icon: Thermometer },
    { id: 'strains', label: 'Strain Database', icon: Sprout },
];

// Dashboard component that uses searchParams
function DashboardContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

    // Form & Analysis State
    const [formData, setFormData] = useState({
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

    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [analysisMetadata, setAnalysisMetadata] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);

    // Data State
    const [strains, setStrains] = useState(defaultStrains);
    const [sensorData, setSensorData] = useState<DashboardSensorData>(initialSensorData);
    const [notifications, setNotifications] = useState<Array<{ id: string | number; type: string; message: string; time: string }>>([]);

    // UI State
  const [activeDashboard, setActiveDashboard] = useState('overview');
    const [sidePanelOpen, setSidePanelOpen] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);

    // Hydration fix & Query Param Handling
    useEffect(() => {
    setMounted(true);
  }, []);

  // Apply view from search params after mount to avoid hydration drift
  useEffect(() => {
    if (!mounted) return;
    const view = searchParams.get('view');
    if (view) {
      setActiveDashboard(view);
    }
  }, [searchParams, mounted]);

    // Fetch Strains from API
    useEffect(() => {
        const fetchStrains = async () => {
            try {
                const response = await fetch('/api/strains');
                if (response.ok) {
                    const data = await response.json();
                    if (data.strains && data.strains.length > 0) {
                        setStrains(data.strains);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch strains:', error);
            }
        };
        fetchStrains();
    }, []);

    // Load persisted readings and notifications. Until the APIs respond, keep
    // values unavailable rather than presenting sample conditions as live data.
    useEffect(() => {
        const loadDashboardData = async () => {
            const [sensorResponse, notificationResponse] = await Promise.allSettled([
                fetch('/api/sensors/data/latest'),
                fetch('/api/notifications?limit=10'),
            ]);

            if (sensorResponse.status === 'fulfilled' && sensorResponse.value.ok) {
                const payload = await sensorResponse.value.json().catch(() => ({}));
                const readings = payload.data || {};
                const reading = (id: string) => typeof readings[id]?.reading === 'number' ? readings[id].reading : null;
                setSensorData({
                    temperature: reading('sensor_temp'),
                    humidity: reading('sensor_humidity'),
                    soilMoisture: reading('sensor_soil'),
                    lightIntensity: reading('sensor_light'),
                    ph: reading('sensor_ph'),
                    ec: reading('sensor_ec'),
                    co2: reading('sensor_co2'),
                    vpd: reading('sensor_vpd'),
                });
            }

            if (notificationResponse.status === 'fulfilled' && notificationResponse.value.ok) {
                const payload = await notificationResponse.value.json().catch(() => ({}));
                const data = Array.isArray(payload.data) ? payload.data : [];
                setNotifications(data.map((item: any) => ({
                    id: String(item.id),
                    type: item.type || item.severity || 'info',
                    message: item.message || item.title || 'Notification',
                    time: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown time',
                })));
            }
        };

        void loadDashboardData();
    }, []);

    // Real-time Sensor Data (Socket.IO)
    useEffect(() => {
        let socket: any;
        try {
            // Determine the correct server URL based on environment
            const serverUrl = process.env.NODE_ENV === 'production'
                ? window.location.origin
                : `http://${window.location.hostname}:3000`;

            console.log(`🔌 Connecting to Socket.IO server at: ${serverUrl}`);

            socket = io(serverUrl, {
                path: '/api/socketio',
                transports: ['websocket', 'polling'],
                withCredentials: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 20000
            });

            socket.on('connect', () => {
                console.log('✅ Connected to Socket.IO server:', socket.id);
            });

            socket.on('connect_error', (error: any) => {
                console.error('❌ Socket.IO connection error:', error);
                console.log('⚠️ This is expected if the server is not running or if there are network issues');
            });

            socket.on('disconnect', (reason: string) => {
                console.log('❌ Socket.IO disconnected:', reason);
            });

            socket.on('sensor-data', (data: any) => {
                setSensorData(prev => ({ ...prev, ...data }));
            });
        } catch (e) {
            console.warn('❌ WebSocket initialization failed:', e);
        }

        return () => {
            if (socket) {
                console.log('🔌 Disconnecting Socket.IO...');
                socket.disconnect();
            }
        };
    }, []);

    // Expose sensor data globally
    useEffect(() => {
        (window as any).sensorData = sensorData;
    }, [sensorData]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type.startsWith('image/'))) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
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
            const payload: any = { ...formData };
            if (image) {
                payload.plantImage = image;
            }

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            setAnalysisResult(data.analysis);
            if (data.metadata) {
                setAnalysisMetadata(data.metadata);

                // Show notification about provider usage
                if (data.metadata.fallbackUsed) {
                    setNotifications(prev => [{
                        id: Date.now(),
                        type: 'alert',
                        message: `Analysis completed using fallback provider (${data.metadata.provider}). Reason: ${data.metadata.fallbackReason}`,
                        time: 'Just now'
                    }, ...prev]);
                } else {
                    setNotifications(prev => [{
                        id: Date.now(),
                        type: 'info',
                        message: `Analysis completed successfully using ${data.metadata.provider}`,
                        time: 'Just now'
                    }, ...prev]);
                }
            }

        } catch (error: any) {
            console.error('Analysis error:', error);
            setNotifications(prev => [{
                id: Date.now(),
                type: 'alert',
                message: `Analysis failed: ${error.message}`,
                time: 'Just now'
            }, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

  if (!mounted) return <div className="flex items-center justify-center h-screen bg-slate-950"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans selection:bg-emerald-500/30">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Leaf className="w-6 h-6 text-emerald-500" />
                        </div>
                        <span className="text-lg font-bold text-slate-100">CannaAI</span>
                    </div>
                    <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setShowMobileMenu(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {dashboardItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveDashboard(item.id);
                                setShowMobileMenu(false);
                            }}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${activeDashboard === item.id
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 hover:translate-x-1'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 mr-3 ${activeDashboard === item.id ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400/70 transition-colors'}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900/30">
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-medium">System Online</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            < main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" >
                {/* Header */}
                < header className="flex items-center justify-between h-16 px-6 bg-slate-900/30 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40" >
                    <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setShowMobileMenu(true)}>
                        <Menu className="w-6 h-6" />
                    </Button>

                    <div className="flex items-center space-x-4 ml-auto">
                        <Button variant="outline" size="sm" className="hidden md:flex border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            New Grow
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`relative text-slate-400 hover:text-white hover:bg-slate-800 ${aiSidebarOpen ? 'text-emerald-400 bg-emerald-500/10' : ''}`}
                            onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
                            title={aiSidebarOpen ? 'Hide AI Assistant' : 'Show AI Assistant'}
                        >
                            <Bot className="w-5 h-5" />
                            {aiSidebarOpen && (
                                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-slate-800">
                            <Bell className="w-5 h-5" />
                            {notifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                            )}
                        </Button>
                    </div>
                </header >

                {/* Dashboard Content */}
                < ScrollArea className="flex-1 p-6" >
                    <div className="max-w-7xl mx-auto space-y-6 pb-20">

                        {/* Overview Dashboard */}
                        {activeDashboard === 'overview' && (
                            <>
                                {/* Photo Analysis Hero Card */}
                                <Link href="/photo-analysis" className="block">
                                    <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 to-cyan-950/30 backdrop-blur-sm shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group cursor-pointer">
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                                                    <Camera className="w-8 h-8 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">Photo Analysis</h2>
                                                    <p className="text-sm text-slate-400">Upload a plant photo for instant AI-powered health diagnosis</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="text-sm font-medium hidden md:block">Open Scanner</span>
                                                <Camera className="w-5 h-5" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                    {/* New Analysis Card */}
                                    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-lg">
                                        <CardHeader>
                                            <CardTitle className="text-slate-100 flex items-center">
                                                <Brain className="w-5 h-5 mr-2 text-emerald-400" />
                                                New Analysis
                                            </CardTitle>
                                            <CardDescription className="text-slate-400">Upload a photo or enter details for AI diagnosis</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Strain</Label>
                                                    <Select
                                                        value={formData.strain}
                                                        onValueChange={(val) => setFormData(prev => ({ ...prev, strain: val }))}
                                                    >
                                                        <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
                                                            <SelectValue placeholder="Select Strain" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                            {strains.map(s => (
                                                                <SelectItem key={s.id} value={s.name} className="focus:bg-slate-800 focus:text-emerald-400">{s.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Plant Image</Label>
                                                    <div className="flex items-center justify-center w-full">
                                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-950/30 hover:bg-slate-900/50 hover:border-emerald-500/50 transition-colors">
                                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                {image ? (
                                                                    <img src={image as string} alt="Preview" className="h-24 object-contain rounded-md" />
                                                                ) : (
                                                                    <>
                                                                        <Upload className="w-8 h-8 mb-3 text-slate-500" />
                                                                        <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-slate-300">Symptoms / Notes</Label>
                                                    <Textarea
                                                        placeholder="Describe what you see..."
                                                        value={formData.leafSymptoms}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, leafSymptoms: e.target.value }))}
                                                        className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50 min-h-[100px]"
                                                    />
                                                </div>

                                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all duration-300" disabled={isLoading}>
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

                                    {/* Analysis Results Card (Overview) */}
                                    {analysisResult && (
                                        <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm shadow-lg">
                                            <CardHeader>
                                                <CardTitle className="flex items-center text-emerald-400">
                                                    <Activity className="w-5 h-5 mr-2" />
                                                    Analysis Results
                                                    {analysisMetadata?.provider && (
                                                        <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400">
                                                            {analysisMetadata.provider === 'fallback' ? 'Rule-Based' : 'AI Analysis'}
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
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${analysisResult.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                                                    analysisResult.urgency === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                                                        analysisResult.urgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                                    }`}>
                                                                    {analysisResult.urgency || 'NORMAL'}
                                                                </span>
                                                                <span className="text-xs text-slate-400">
                                                                    Confidence: {analysisResult.confidence || 0}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-4xl font-bold ${analysisResult.healthScore > 70 ? "text-emerald-400" : analysisResult.healthScore > 40 ? "text-amber-400" : "text-red-400"}`}>
                                                                {analysisResult.healthScore || '?'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 uppercase font-medium tracking-wider">Health Score</div>
                                                        </div>
                                                    </div>

                                                    {/* Root Causes */}
                                                    {analysisResult.causes && analysisResult.causes.length > 0 && (
                                                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                                            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                                                                <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
                                                                Identified Causes
                                                            </h4>
                                                            <ul className="list-disc list-inside space-y-1">
                                                                {analysisResult.causes.map((cause: string, i: number) => (
                                                                    <li key={i} className="text-sm text-slate-400">{cause}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Strain Specific Advice */}
                                                    {analysisResult.strainSpecificAdvice && (
                                                        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                                                            <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center">
                                                                <Sprout className="w-4 h-4 mr-2" />
                                                                Strain Advice: {formData.strain}
                                                            </h4>
                                                            <p className="text-sm text-slate-300 italic">"{analysisResult.strainSpecificAdvice}"</p>
                                                        </div>
                                                    )}

                                                    {/* Detailed Reasoning Accordion */}
                                                    {analysisResult.reasoning && (
                                                        <details className="group bg-slate-900/50 rounded-lg border border-slate-800 open:bg-slate-900/80 transition-all">
                                                            <summary className="flex items-center justify-between p-3 cursor-pointer list-none text-sm font-medium text-slate-400 group-hover:text-slate-300">
                                                                <span>View Analysis Reasoning</span>
                                                                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                                                            </summary>
                                                            <div className="p-4 pt-0 space-y-3 border-t border-slate-800/50 mt-2">
                                                                {analysisResult.reasoning.map((step: any, i: number) => (
                                                                    <div key={i}>
                                                                        <div className="flex justify-between text-xs mb-1">
                                                                            <span className="text-slate-300 font-medium">{step.step}</span>
                                                                            <span className="text-slate-500">{step.weight}% weight</span>
                                                                        </div>
                                                                        <p className="text-xs text-slate-400">{step.explanation}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    )}

                                                    {/* Recommendations */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
                                                            <ClipboardList className="w-4 h-4 mr-2 text-emerald-400" />
                                                            Recommended Actions
                                                        </h4>
                                                        {analysisResult.recommendations && Array.isArray(analysisResult.recommendations) ? (
                                                            <ul className="space-y-2">
                                                                {analysisResult.recommendations.map((rec: string, i: number) => (
                                                                    <li key={i} className="flex items-start text-sm text-slate-400">
                                                                        <span className="mr-2 text-emerald-500">•</span>
                                                                        {rec}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : analysisResult.recommendations && typeof analysisResult.recommendations === 'object' ? (
                                                            <div className="space-y-4">
                                                                {analysisResult.recommendations.immediate && Array.isArray(analysisResult.recommendations.immediate) && (
                                                                    <div>
                                                                        <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">Immediate Action</h5>
                                                                        <ul className="space-y-2">
                                                                            {analysisResult.recommendations.immediate.map((rec: string, i: number) => (
                                                                                <li key={i} className="flex items-start text-sm text-slate-400">
                                                                                    <span className="mr-2 text-red-500">•</span>
                                                                                    {rec}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {analysisResult.recommendations.shortTerm && Array.isArray(analysisResult.recommendations.shortTerm) && (
                                                                    <div>
                                                                        <h5 className="text-xs font-semibold text-amber-400 uppercase mb-2">Short Term</h5>
                                                                        <ul className="space-y-2">
                                                                            {analysisResult.recommendations.shortTerm.map((rec: string, i: number) => (
                                                                                <li key={i} className="flex items-start text-sm text-slate-400">
                                                                                    <span className="mr-2 text-amber-500">•</span>
                                                                                    {rec}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {analysisResult.recommendations.longTerm && Array.isArray(analysisResult.recommendations.longTerm) && (
                                                                    <div>
                                                                        <h5 className="text-xs font-semibold text-blue-400 uppercase mb-2">Long Term</h5>
                                                                        <ul className="space-y-2">
                                                                            {analysisResult.recommendations.longTerm.map((rec: string, i: number) => (
                                                                                <li key={i} className="flex items-start text-sm text-slate-400">
                                                                                    <span className="mr-2 text-blue-500">•</span>
                                                                                    {rec}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-500 italic">No recommendations available</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Environmental Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    {[
                                        { label: 'Humidity', value: `${sensorData.humidity}%`, icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                                        { label: 'VPD', value: `${sensorData.vpd} kPa`, icon: Cloud, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                                        { label: 'CO2', value: `${sensorData.co2} ppm`, icon: Wind, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                    ].map((stat, index) => (
                                        <Card key={index} className={`border-slate-800 bg-slate-900/40 backdrop-blur-sm hover:bg-slate-800/60 transition-all duration-300 group`}>
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">{stat.label}</p>
                                                    <h3 className="text-2xl font-bold text-slate-100 mt-1">{stat.value}</h3>
                                                </div>
                                                <div className={`p-3 rounded-full ${stat.bg} ${stat.border} border`}>
                                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Settings Redirect Card */}
                                <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="text-slate-100 flex items-center">
                                            <Settings className="w-5 h-5 mr-2 text-emerald-400" />
                                            Settings
                                        </CardTitle>
                                        <CardDescription className="text-slate-400">Configure AI providers, models, and system settings</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-300">
                                                Access the unified settings page to manage AI providers, configure models, adjust system preferences, and customize your cultivation experience.
                                            </p>
                                            <Link href="/settings">
                                                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all duration-300">
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Open Settings
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Trends and Alerts */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                    <Card className="lg:col-span-2 border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="text-slate-100">Environmental Trends</CardTitle>
                                            <CardDescription className="text-slate-400">24-hour temperature and humidity monitoring</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="h-[300px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={[
                                                        { time: '00:00', temp: 22, hum: 50 },
                                                        { time: '04:00', temp: 21, hum: 52 },
                                                        { time: '08:00', temp: 23, hum: 55 },
                                                        { time: '12:00', temp: 25, hum: 48 },
                                                        { time: '16:00', temp: 24, hum: 50 },
                                                        { time: '20:00', temp: 22, hum: 53 },
                                                        { time: '24:00', temp: 21, hum: 55 },
                                                    ]}>
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
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }}
                                                            itemStyle={{ color: '#f8fafc' }}
                                                        />
                                                        <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                                                        <Area type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                                        <CardHeader>
                                            <CardTitle className="text-slate-100">Recent Alerts</CardTitle>
                                            <CardDescription className="text-slate-400">System notifications and warnings</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {notifications.map((notification) => (
                                                    <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                                        {notification.type === 'alert' || notification.type === 'error' ? (
                                                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                                                        ) : (
                                                            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-200">{notification.message}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* AI Analysis Tab */}
                        {activeDashboard === 'analysis' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                            <Brain className="w-7 h-7 text-emerald-400" />
                                            AI Plant Analysis
                                        </h2>
                                        <p className="text-slate-400 mt-1">Upload photos and get instant AI-powered plant health diagnosis</p>
                                    </div>
                                    <Link href="/photo-analysis">
                                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(5,150,105,0.3)]">
                                            <Camera className="w-4 h-4 mr-2" />
                                            Open Photo Analysis
                                        </Button>
                                    </Link>
                                </div>

                                {analysisResult ? (
                                    <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm shadow-lg">
                                        <CardHeader>
                                            <CardTitle className="flex items-center text-emerald-400">
                                                <Activity className="w-5 h-5 mr-2" />
                                                Latest Analysis Results
                                                {analysisMetadata?.provider && (
                                                    <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400">
                                                        {analysisMetadata.provider === 'fallback' ? 'Rule-Based' : 'AI Analysis'}
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">{analysisResult.diagnosis || 'Analysis Complete'}</h3>
                                                    <div className="flex items-center space-x-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${analysisResult.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                                                            analysisResult.urgency === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                                                analysisResult.urgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                            }`}>
                                                            {analysisResult.urgency || 'NORMAL'}
                                                        </span>
                                                        <span className="text-xs text-slate-400">Confidence: {analysisResult.confidence || 0}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-4xl font-bold ${analysisResult.healthScore > 70 ? "text-emerald-400" : analysisResult.healthScore > 40 ? "text-amber-400" : "text-red-400"}`}>
                                                        {analysisResult.healthScore || '?'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 uppercase font-medium tracking-wider">Health Score</div>
                                                </div>
                                            </div>
                                            {analysisResult.recommendations && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-slate-300 mb-3">Recommendations</h4>
                                                    {Array.isArray(analysisResult.recommendations) ? (
                                                        <ul className="space-y-2">
                                                            {analysisResult.recommendations.map((rec: string, i: number) => (
                                                                <li key={i} className="flex items-start text-sm text-slate-400">
                                                                    <span className="mr-2 text-emerald-500">*</span>{rec}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {analysisResult.recommendations.immediate && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-red-400 uppercase mb-1">Immediate</h5>
                                                                    <ul className="space-y-1">
                                                                        {analysisResult.recommendations.immediate.map((rec: string, i: number) => (
                                                                            <li key={i} className="text-sm text-slate-400">* {rec}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {analysisResult.recommendations.shortTerm && (
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-amber-400 uppercase mb-1">Short Term</h5>
                                                                    <ul className="space-y-1">
                                                                        {analysisResult.recommendations.shortTerm.map((rec: string, i: number) => (
                                                                            <li key={i} className="text-sm text-slate-400">* {rec}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                                        <CardContent className="p-12 text-center">
                                            <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                            <h3 className="text-lg font-semibold text-slate-300 mb-2">No Analysis Yet</h3>
                                            <p className="text-slate-500 mb-6">Upload a plant photo to get AI-powered health diagnosis</p>
                                            <Link href="/photo-analysis">
                                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                                    <Camera className="w-4 h-4 mr-2" />
                                                    Start Photo Analysis
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Analysis capabilities */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { icon: Leaf, title: 'Nutrient Deficiencies', desc: 'Detect N, P, K, Ca, Mg, Fe deficiencies from leaf color and patterns', color: 'emerald' },
                                        { icon: Bug, title: 'Pest & Disease', desc: 'Identify spider mites, aphids, powdery mildew, bud rot and more', color: 'amber' },
                                        { icon: Activity, title: 'Stress Analysis', desc: 'Light burn, heat stress, overwatering, root issues detection', color: 'blue' },
                                    ].map((item, i) => (
                                        <Card key={i} className={`border-slate-800 bg-slate-900/40 hover:border-${item.color}-500/30 transition-colors`}>
                                            <CardContent className="p-5">
                                                <item.icon className={`w-8 h-8 mb-3 text-${item.color}-400`} />
                                                <h3 className="font-semibold text-slate-200 mb-1">{item.title}</h3>
                                                <p className="text-xs text-slate-400">{item.desc}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Environment Tab */}
                        {activeDashboard === 'environment' && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                    <Thermometer className="w-7 h-7 text-emerald-400" />
                                    Environment Monitoring
                                </h2>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Temperature', value: `${sensorData.temperature}C`, icon: Thermometer, color: 'orange', optimal: '22-26C' },
                                        { label: 'Humidity', value: `${sensorData.humidity}%`, icon: Droplets, color: 'blue', optimal: '50-70%' },
                                        { label: 'VPD', value: `${sensorData.vpd} kPa`, icon: Cloud, color: 'purple', optimal: '0.8-1.2' },
                                        { label: 'CO2', value: `${sensorData.co2} ppm`, icon: Wind, color: 'emerald', optimal: '800-1200' },
                                        { label: 'pH', value: `${sensorData.ph}`, icon: Droplet, color: 'cyan', optimal: '6.0-6.5' },
                                        { label: 'EC', value: `${sensorData.ec} mS/cm`, icon: Zap, color: 'yellow', optimal: '1.2-1.8' },
                                        { label: 'Soil Moisture', value: `${sensorData.soilMoisture}%`, icon: Droplets, color: 'blue', optimal: '40-60%' },
                                        { label: 'Light', value: `${sensorData.lightIntensity} PPFD`, icon: Sun, color: 'amber', optimal: '600-900' },
                                    ].map((stat, i) => (
                                        <Card key={i} className="border-slate-800 bg-slate-900/40">
                                            <CardContent className="p-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                                                    <span className="text-xs text-slate-500">Optimal: {stat.optimal}</span>
                                                </div>
                                                <p className="text-sm text-slate-400">{stat.label}</p>
                                                <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Environmental chart */}
                                <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-slate-100">24-Hour Trends</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[
                                                    { time: '00:00', temp: 22, hum: 50 },
                                                    { time: '04:00', temp: 21, hum: 52 },
                                                    { time: '08:00', temp: 23, hum: 55 },
                                                    { time: '12:00', temp: 25, hum: 48 },
                                                    { time: '16:00', temp: 24, hum: 50 },
                                                    { time: '20:00', temp: 22, hum: 53 },
                                                    { time: '24:00', temp: 21, hum: 55 },
                                                ]}>
                                                    <defs>
                                                        <linearGradient id="envColorTemp" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="envColorHum" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
                                                    <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#envColorTemp)" name="Temp (C)" />
                                                    <Area type="monotone" dataKey="hum" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#envColorHum)" name="Humidity (%)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Strains Tab */}
                        {activeDashboard === 'strains' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                                        <Sprout className="w-7 h-7 text-emerald-400" />
                                        Strain Database
                                    </h2>
                                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                                        {strains.length} strains
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {strains.map((strain) => (
                                        <Card key={strain.id} className="border-slate-800 bg-slate-900/40 hover:border-emerald-500/30 transition-all duration-200 group">
                                            <CardContent className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">{strain.name}</h3>
                                                        <p className="text-xs text-slate-500">{strain.type}</p>
                                                    </div>
                                                    {strain.isPurpleStrain && (
                                                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">Purple</Badge>
                                                    )}
                                                </div>
                                                {strain.lineage && (
                                                    <p className="text-xs text-slate-400 mb-2">
                                                        <span className="text-slate-500">Lineage:</span> {strain.lineage}
                                                    </p>
                                                )}
                                                {strain.description && (
                                                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{strain.description}</p>
                                                )}
                                                {strain.optimalConditions && (
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-slate-800/50 rounded px-2 py-1">
                                                            <span className="text-slate-500">pH:</span>{' '}
                                                            <span className="text-slate-300">{strain.optimalConditions.ph?.range?.join(' - ')}</span>
                                                        </div>
                                                        <div className="bg-slate-800/50 rounded px-2 py-1">
                                                            <span className="text-slate-500">Veg Temp:</span>{' '}
                                                            <span className="text-slate-300">{strain.optimalConditions.temperature?.veg?.join('-')}C</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <Link href={`/photo-analysis?strain=${encodeURIComponent(strain.name)}`}>
                                                    <Button variant="outline" size="sm" className="w-full mt-3 border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/10">
                                                        <Camera className="w-3 h-3 mr-2" />
                                                        Analyze with this strain
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Analytics Dashboard (Placeholder/Alternative) */}
                        {activeDashboard === 'analytics' && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* Re-use the same analysis result card logic if needed, or just show a placeholder */}
                                {analysisResult ? (
                                    <Card className="border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm shadow-lg">
                                        <CardHeader>
                                            <CardTitle className="flex items-center text-emerald-400">
                                                <Activity className="w-5 h-5 mr-2" />
                                                Detailed Analysis
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {/* Same recommendations logic */}
                                            <div className="mt-6">
                                                <h4 className="text-sm font-medium text-slate-300 mb-3">Recommendations</h4>
                                                {analysisResult.recommendations && Array.isArray(analysisResult.recommendations) ? (
                                                    <ul className="space-y-2">
                                                        {analysisResult.recommendations.map((rec: string, i: number) => (
                                                            <li key={i} className="flex items-start text-sm text-slate-400">
                                                                <span className="mr-2 text-emerald-500">•</span>
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : analysisResult.recommendations && typeof analysisResult.recommendations === 'object' ? (
                                                    <div className="space-y-4">
                                                        {analysisResult.recommendations.immediate && Array.isArray(analysisResult.recommendations.immediate) && (
                                                            <div>
                                                                <h5 className="text-xs font-semibold text-red-400 uppercase mb-2">Immediate Action</h5>
                                                                <ul className="space-y-2">
                                                                    {analysisResult.recommendations.immediate.map((rec: string, i: number) => (
                                                                        <li key={i} className="flex items-start text-sm text-slate-400">
                                                                            <span className="mr-2 text-red-500">•</span>
                                                                            {rec}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {analysisResult.recommendations.shortTerm && Array.isArray(analysisResult.recommendations.shortTerm) && (
                                                            <div>
                                                                <h5 className="text-xs font-semibold text-amber-400 uppercase mb-2">Short Term</h5>
                                                                <ul className="space-y-2">
                                                                    {analysisResult.recommendations.shortTerm.map((rec: string, i: number) => (
                                                                        <li key={i} className="flex items-start text-sm text-slate-400">
                                                                            <span className="mr-2 text-amber-500">•</span>
                                                                            {rec}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {analysisResult.recommendations.longTerm && Array.isArray(analysisResult.recommendations.longTerm) && (
                                                            <div>
                                                                <h5 className="text-xs font-semibold text-blue-400 uppercase mb-2">Long Term</h5>
                                                                <ul className="space-y-2">
                                                                    {analysisResult.recommendations.longTerm.map((rec: string, i: number) => (
                                                                        <li key={i} className="flex items-start text-sm text-slate-400">
                                                                            <span className="mr-2 text-blue-500">•</span>
                                                                            {rec}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No recommendations available</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No analysis data available. Start a new analysis in the Overview tab.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea >
            </main >

            {/* AI Assistant Sidebar */}
            <AnimatePresence>
                {aiSidebarOpen && (
                    <CannaAIAssistantSidebar
                        sensorData={sensorData}
                        currentModel={{
                            name: 'CannaAI Assistant',
                            provider: 'auto',
                            hasVision: true,
                            isAvailable: true
                        }}
                        initialContext={{
                            page: 'dashboard',
                            title: 'CannaAI Pro Dashboard',
                            data: {
                                activeTab: activeDashboard,
                                analysisResult: analysisResult
                            }
                        }}
                        onToggleCollapse={setAiSidebarOpen}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}

// Loading fallback for Suspense
function DashboardLoading() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-slate-400">Loading dashboard...</p>
            </div>
        </div>
    );
}

// Main export with Suspense boundary
export default function CultivAIPro() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContent />
        </Suspense>
    );
}
