import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Clipboard, Filter, Download, UploadCloud, BarChart3, ActivityIcon,
    Flame, Snowflake, AirVent, LightbulbOff, Volume2, VolumeX, X, Grid,
    TrendingDown, Star, Wrench, LogOut, Sprout, ChevronDown, ClipboardList,
    LeafIcon, ScanLine, ArrowRight, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Types
interface SensorData {
    temperature: number;
    humidity: number;
    soilMoisture: number;
    lightIntensity: number;
    ph: number;
    ec: number;
    co2: number;
    vpd: number;
}

interface AnalysisResult {
    diagnosis?: string;
    urgency?: string;
    confidence?: number;
    healthScore?: number;
    causes?: string[];
    recommendations?: string[];
}

// Environmental stat card component
const EnvStatCard: React.FC<{
    label: string;
    value: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    trend?: 'up' | 'down' | 'stable';
}> = ({ label, value, icon: Icon, color, bg, trend }) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className="bg-[#181b21] rounded-xl border border-gray-800 p-4 hover:border-emerald-500/30 transition-all duration-300"
    >
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {trend && (
                <span className={`text-xs font-medium ${
                    trend === 'up' ? 'text-emerald-400' :
                    trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                </span>
            )}
        </div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <h3 className="text-xl font-bold text-white">{value}</h3>
    </motion.div>
);

// Quick action card component
const QuickAction: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    onClick: () => void;
}> = ({ icon: Icon, title, description, color, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-[#181b21] rounded-xl border border-gray-800 p-5 text-left hover:border-emerald-500/30 transition-all group"
    >
        <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
    </motion.button>
);

// Health score gauge component
const HealthScoreGauge: React.FC<{ score: number; size?: 'sm' | 'lg' }> = ({ score, size = 'sm' }) => {
    const radius = size === 'lg' ? 50 : 30;
    const stroke = size === 'lg' ? 8 : 5;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg className="transform -rotate-90" width={radius * 2 + stroke * 2} height={radius * 2 + stroke * 2}>
                <circle
                    cx={radius + stroke}
                    cy={radius + stroke}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className="text-gray-800"
                />
                <motion.circle
                    cx={radius + stroke}
                    cy={radius + stroke}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-sm'}`} style={{ color }}>
                    {score}
                </span>
            </div>
        </div>
    );
};

const ComprehensiveDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Mock sensor data
    const [sensorData] = useState<SensorData>({
        temperature: 23.5,
        humidity: 58,
        soilMoisture: 42,
        lightIntensity: 680,
        ph: 6.3,
        ec: 1.5,
        co2: 1150,
        vpd: 0.92
    });

    // Mock recent analyses
    const [recentAnalyses] = useState([
        { id: 1, strain: 'Blue Dream', healthScore: 85, status: 'Healthy', time: '2h ago' },
        { id: 2, strain: 'Purple Kush', healthScore: 62, status: 'Warning', time: '5h ago' },
        { id: 3, strain: 'GSC', healthScore: 91, status: 'Healthy', time: '1d ago' }
    ]);

    // Environmental stats
    const environmentalStats = [
        { label: 'Temperature', value: `${sensorData.temperature}°C`, icon: Thermometer, color: 'text-orange-400', bg: 'bg-orange-500/20', trend: 'stable' as const },
        { label: 'Humidity', value: `${sensorData.humidity}%`, icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/20', trend: 'up' as const },
        { label: 'Soil Moisture', value: `${sensorData.soilMoisture}%`, icon: Droplet, color: 'text-cyan-400', bg: 'bg-cyan-500/20', trend: 'down' as const },
        { label: 'Light', value: `${sensorData.lightIntensity} µmol`, icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-500/20', trend: 'stable' as const }
    ];

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-emerald-900/20 via-[#181b21] to-emerald-950/10 border-b border-emerald-500/20 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <LeafIcon className="w-6 h-6 text-black" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">Plant Health Dashboard</h1>
                                    <p className="text-emerald-400/70 text-sm">AI-Powered Cultivation Intelligence</p>
                                </div>
                            </div>
                            <p className="text-gray-400 max-w-xl">
                                Monitor your grow room, analyze plant health, and get AI-powered recommendations
                                for optimal cultivation.
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-3">
                            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                                <div className="text-2xl font-bold text-white">{recentAnalyses.length}</div>
                                <div className="text-xs text-gray-400">Recent Scans</div>
                            </div>
                            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-500/20">
                                <div className="text-2xl font-bold text-emerald-400">
                                    {recentAnalyses.filter(a => a.status === 'Healthy').length}
                                </div>
                                <div className="text-xs text-gray-400">Healthy</div>
                            </div>
                            <div className="bg-black/30 backdrop-blur-sm rounded-xl px-4 py-3 border border-orange-500/20">
                                <div className="text-2xl font-bold text-orange-400">
                                    {recentAnalyses.filter(a => a.status !== 'Healthy').length}
                                </div>
                                <div className="text-xs text-gray-400">Need Care</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Quick Actions */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-emerald-400" />
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <QuickAction
                            icon={ScanLine}
                            title="Analyze Plant"
                            description="Upload a photo for instant AI-powered health diagnosis"
                            color="bg-gradient-to-br from-emerald-600 to-emerald-500"
                            onClick={() => navigate('/scanner')}
                        />
                        <QuickAction
                            icon={Activity}
                            title="View Live Vision"
                            description="Real-time monitoring with camera and microscope support"
                            color="bg-gradient-to-br from-blue-600 to-blue-500"
                            onClick={() => navigate('/live-vision')}
                        />
                        <QuickAction
                            icon={Sprout}
                            title="Manage Plants"
                            description="Browse and track your plant collection"
                            color="bg-gradient-to-br from-purple-600 to-purple-500"
                            onClick={() => navigate('/plants')}
                        />
                    </div>
                </section>

                {/* Environmental Stats */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Thermometer className="w-5 h-5 mr-2 text-emerald-400" />
                        Environment Overview
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {environmentalStats.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <EnvStatCard {...stat} />
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Recent Analyses */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-emerald-400" />
                        Recent Plant Analyses
                    </h2>
                    <div className="bg-[#181b21] rounded-2xl border border-gray-800 overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div>Plant</div>
                            <div>Health Score</div>
                            <div>Status</div>
                            <div>Time</div>
                        </div>
                        <div className="divide-y divide-gray-800">
                            {recentAnalyses.map((analysis, index) => (
                                <motion.div
                                    key={analysis.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                                    onClick={() => navigate('/scanner')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <LeafIcon className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <span className="font-medium text-white">{analysis.strain}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <HealthScoreGauge score={analysis.healthScore} />
                                    </div>
                                    <div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                            analysis.status === 'Healthy'
                                                ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                                                : 'bg-orange-900/50 text-orange-300 border border-orange-700/50'
                                        }`}>
                                            {analysis.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">{analysis.time}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Full Environment Stats */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4">All Environmental Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[
                            { label: 'pH Level', value: sensorData.ph.toFixed(1), icon: FlaskConical, color: 'text-purple-400', bg: 'bg-purple-500/20' },
                            { label: 'EC Level', value: `${sensorData.ec} mS`, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
                            { label: 'VPD', value: `${sensorData.vpd} kPa`, icon: Cloud, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
                            { label: 'CO2', value: `${sensorData.co2} ppm`, icon: Wind, color: 'text-green-400', bg: 'bg-green-500/20' },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-[#181b21] rounded-xl border border-gray-800 p-4 text-center hover:border-gray-700 transition-colors"
                            >
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-3`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                                <p className="text-lg font-bold text-white">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ComprehensiveDashboard;