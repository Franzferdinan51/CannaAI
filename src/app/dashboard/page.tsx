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
import { AIProviderSettings } from '@/components/ai/AIProviderSettings';
import { AgentDashboard } from '@/components/agent/AgentDashboard';
import UnifiedAIAssistant from '@/components/ai/unified-assistant';

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

// Mock sensor data (Initial state)
const initialSensorData = {
    temperature: 22.5,
    humidity: 55,
    soilMoisture: 45,
    lightIntensity: 750,
    ph: 6.2,
    ec: 1.4,
    co2: 1200,
    vpd: 0.85
};

// Dashboard Navigation Items
const dashboardItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analysis', label: 'AI Analysis', icon: Brain },
    { id: 'agent', label: 'Agent Evolution', icon: Bot },
    { id: 'environment', label: 'Environment', icon: Thermometer },
    { id: 'strains', label: 'Strain Database', icon: Sprout },
    { id: 'settings', label: 'Settings', icon: Settings },
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
    const [sensorData, setSensorData] = useState(initialSensorData);
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'alert', message: 'pH levels dropping below optimal range', time: '2 min ago' },
        { id: 2, type: 'info', message: 'Automated watering cycle completed successfully', time: '15 min ago' }
    ]);

    // UI State
  const [activeDashboard, setActiveDashboard] = useState('overview');
    const [sidePanelOpen, setSidePanelOpen] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

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

    // Real-time Sensor Data (Socket.IO)
    useEffect(() => {
        let socket: any;
        try {
            socket = io(undefined, { path: '/api/socketio', transports: ['websocket', 'polling'] });

            socket.on('connect', () => {
                console.log('Connected to WebSocket');
            });

            socket.on('sensor-data', (data: any) => {
                setSensorData(prev => ({ ...prev, ...data }));
            });
        } catch (e) {
            console.warn('WebSocket connection failed (expected on serverless environments):', e);
        }

        return () => {
            if (socket) socket.disconnect();
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
                                                        {Array.isArray(analysisResult.recommendations) ? (
                                                            <ul className="space-y-2">
                                                                {analysisResult.recommendations.map((rec: string, i: number) => (
                                                                    <li key={i} className="flex items-start text-sm text-slate-400">
                                                                        <span className="mr-2 text-emerald-500">•</span>
                                                                        {rec}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                {analysisResult.recommendations.immediate && (
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
                                                                {analysisResult.recommendations.shortTerm && (
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
                                                                {analysisResult.recommendations.longTerm && (
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

                        {/* Agent Dashboard */}
                        {activeDashboard === 'agent' && (
                            <div className="max-w-4xl mx-auto">
                                <AgentDashboard sensorData={sensorData} />
                            </div>
                        )}

                        {/* Settings Dashboard */}
                        {activeDashboard === 'settings' && (
                            <div className="max-w-2xl mx-auto">
                                <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-slate-100">Settings</CardTitle>
                                        <CardDescription className="text-slate-400">Manage your preferences and AI configuration</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <AIProviderSettings />
                                    </CardContent>
                                </Card>
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
                                                {Array.isArray(analysisResult.recommendations) ? (
                                                    <ul className="space-y-2">
                                                        {analysisResult.recommendations.map((rec: string, i: number) => (
                                                            <li key={i} className="flex items-start text-sm text-slate-400">
                                                                <span className="mr-2 text-emerald-500">•</span>
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {analysisResult.recommendations.immediate && (
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
                                                        {analysisResult.recommendations.shortTerm && (
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
                                                        {analysisResult.recommendations.longTerm && (
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

            {/* Unified AI Assistant */}
            <UnifiedAIAssistant
                initialContext={{
                    page: 'dashboard',
                    title: 'CannaAI Pro Dashboard',
                    section: activeDashboard,
                    sensorData: sensorData,
                    currentAnalysis: analysisResult
                }}
            />
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
