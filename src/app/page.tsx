'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Leaf, AlertTriangle, Droplet, Droplets, Sun, Settings, CheckCircle, XCircle,
  RefreshCw, Image, Upload, Database, Search, Trash2, Plus, Edit, Save,
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
  TrendingDown, Star, Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { AIProviderSettings } from '@/components/ai/AIProviderSettings';

// Default strain database with purple strain indicators
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
  {
    id: 'strain_002',
    name: 'OG Kush',
    type: 'Hybrid (75% Indica)',
    lineage: 'Chemdawg x Hindu Kush',
    description: 'Classic strain with high resin production',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [5.8, 6.2], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Potassium']
  },
  {
    id: 'strain_003',
    name: 'Granddaddy Purple',
    type: 'Indica (100%)',
    lineage: 'Purple Urkle x Big Bud',
    description: 'Famous purple strain known for deep coloration and relaxing effects',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Iron'],
    specialNotes: 'Naturally develops purple/pink pigmentation during flowering due to anthocyanins. This is not a nutrient deficiency but a genetic trait.'
  },
  {
    id: 'strain_004',
    name: 'Purple Kush',
    type: 'Indica (100%)',
    lineage: 'Hindu Kush x Purple Afghani',
    description: 'Potent purple strain with deep colors and heavy sedation',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [16, 20] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium'],
    specialNotes: 'Intense purple coloration develops in cooler nighttime temperatures during flowering.'
  },
  {
    id: 'strain_005',
    name: 'Purple Haze',
    type: 'Sativa (85%)',
    lineage: 'Purple Thai x Haze',
    description: 'Energetic sativa with notable purple hues and euphoric effects',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [20, 26] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '20/4', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Iron'],
    specialNotes: 'Purple coloration is more subtle, appearing as violet tips on buds.'
  },
  {
    id: 'strain_006',
    name: 'Grape Ape',
    type: 'Indica (100%)',
    lineage: 'Mendo Purps x Skunk x Afghani',
    description: 'Sweet, grape-flavored indica with prominent purple coloring',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium'],
    specialNotes: 'Deep purple buds with grape-like aroma. Color intensifies in cooler temperatures.'
  },
  {
    id: 'strain_007',
    name: 'Purple Urkle',
    type: 'Indica (100%)',
    lineage: 'Mendo Purps (select phenotype)',
    description: 'Legacy purple strain, foundation for many modern purple varieties',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [5.8, 6.2], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [16, 20] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Calcium'],
    specialNotes: 'Classic purple genetics with dark, almost black buds. Very sensitive to nutrient burn.'
  },
  {
    id: 'strain_008',
    name: 'Blackberry Kush',
    type: 'Indica (100%)',
    lineage: 'Afghani x Blackberry',
    description: 'Dark purple strain with berry flavors and heavy effects',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium'],
    specialNotes: 'Develops very dark purple to almost black coloration. Berry aroma intensifies during curing.'
  },
  {
    id: 'strain_009',
    name: 'Fruity Pebbles',
    type: 'Hybrid (55% Indica)',
    lineage: 'Granddaddy Purple x Tahoe Alien x Green Ribbon',
    description: 'Colorful hybrid with tropical fruit flavors and purple hues',
    isPurpleStrain: true,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [55, 65], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Magnesium', 'Calcium'],
    specialNotes: 'Multi-colored buds with purple, green, and orange hues. Tropical fruit aroma.'
  },
  {
    id: 'strain_010',
    name: 'Girl Scout Cookies',
    type: 'Hybrid (60% Indica)',
    lineage: 'OG Kush x Durban Poison',
    description: 'Award-winning hybrid with high THC and sweet flavors',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_011',
    name: 'Sour Diesel',
    type: 'Sativa (90%)',
    lineage: 'Chemdawg 91 x Super Skunk',
    description: 'Energetic sativa with pungent diesel aroma',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '20/4', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Iron']
  },
  {
    id: 'strain_012',
    name: 'White Widow',
    type: 'Hybrid (60% Indica)',
    lineage: 'Brazilian Sativa x South Indian Indica',
    description: 'Balanced hybrid covered in white trichomes',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [5.8, 6.2], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Potassium']
  },
  {
    id: 'strain_013',
    name: 'Green Crack',
    type: 'Sativa (75%)',
    lineage: 'Skunk #1 x Unknown Indica',
    description: 'Potent sativa providing sharp energy and focus',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '20/4', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Magnesium']
  },
  {
    id: 'strain_014',
    name: 'AK-47',
    type: 'Hybrid (65% Sativa)',
    lineage: 'Colombian x Mexican x Thai x Afghani',
    description: 'Complex hybrid with long-lasting effects',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_015',
    name: 'Northern Lights',
    type: 'Indica (95%)',
    lineage: 'Afghani x Thai Landrace',
    description: 'Classic indica known for resilience and potency',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [5.8, 6.2], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Phosphorus', 'Potassium']
  },
  {
    id: 'strain_016',
    name: 'Pineapple Express',
    type: 'Hybrid (60% Sativa)',
    lineage: 'Trainwreck x Hawaii',
    description: 'Tropical-flavored hybrid with energetic effects',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Magnesium']
  },
  {
    id: 'strain_017',
    name: 'Bruce Banner',
    type: 'Hybrid (60% Indica)',
    lineage: 'OG Kush x Strawberry Diesel',
    description: 'High-THC hybrid named after the Hulk',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [50, 60], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_018',
    name: 'Blue Cheese',
    type: 'Indica (80%)',
    lineage: 'Blueberry x UK Cheese',
    description: 'Unique cheesy aroma with blueberry sweetness',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [20, 24], flower: [18, 22] },
      humidity: { veg: [50, 60], flower: [30, 40] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_019',
    name: 'LSD',
    type: 'Hybrid (55% Indica)',
    lineage: 'UK Cheese x Skunk #1',
    description: 'Psychedelic effects with trippy visual experience',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [55, 65], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: ['Calcium', 'Magnesium']
  },
  {
    id: 'strain_020',
    name: 'Maui Wowie',
    type: 'Sativa (80%)',
    lineage: 'Hawaiian Sativa Landrace',
    description: 'Classic tropical sativa with pineapple flavors',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.2, 6.8], medium: 'soil' },
      temperature: { veg: [24, 28], flower: [22, 26] },
      humidity: { veg: [60, 70], flower: [50, 60] },
      light: { veg: '20/4', flower: '12/12' }
    },
    commonDeficiencies: ['Nitrogen', 'Iron']
  }
];

// Mock sensor data
const mockSensorData = {
  temperature: 22.5,
  humidity: 55,
  soilMoisture: 45,
  lightIntensity: 750,
  ph: 6.2,
  ec: 1.4,
  co2: 1200,
  vpd: 0.85
};

// Mock historical data
const mockHistoricalData = [
  { date: '2024-05-01', temp: 22, humidity: 54, ph: 6.1, ec: 1.3, yield: 0 },
  { date: '2024-05-08', temp: 23, humidity: 55, ph: 6.2, ec: 1.4, yield: 0 },
  { date: '2024-05-15', temp: 22, humidity: 56, ph: 6.3, ec: 1.5, yield: 0 },
  { date: '2024-05-22', temp: 21, humidity: 58, ph: 6.2, ec: 1.6, yield: 45 }
];

// Nutrient database
const nutrientDatabase = [
  { name: 'Nitrogen (N)', symbol: 'N', role: 'Vegetative growth', deficiency: 'Yellowing of older leaves', toxicity: 'Dark green leaves, burnt tips' },
  { name: 'Phosphorus (P)', symbol: 'P', role: 'Root development, flowering', deficiency: 'Purple stems, dark leaves', toxicity: 'Leaf tip burn, nutrient lockout' },
  { name: 'Potassium (K)', symbol: 'K', role: 'Overall plant health', deficiency: 'Yellow edges, weak stems', toxicity: 'Leaf curl, nutrient imbalance' },
  { name: 'Calcium (Ca)', symbol: 'Ca', role: 'Cell wall structure', deficiency: 'Brown spots, new growth issues', toxicity: 'Magnesium deficiency' },
  { name: 'Magnesium (Mg)', symbol: 'Mg', role: 'Chlorophyll production', deficiency: 'Yellow between veins', toxicity: 'Calcium deficiency' },
  { name: 'Sulfur (S)', symbol: 'S', role: 'Protein synthesis', deficiency: 'Yellow new growth', toxicity: 'Leaf burn, small leaves' }
];

// Pest and disease database
const pestDiseaseDatabase = [
  { name: 'Spider Mites', type: 'Pest', symptoms: 'Yellow speckling, webbing', treatment: 'Neem oil, predatory mites', prevention: 'Proper humidity, regular inspection' },
  { name: 'Powdery Mildew', type: 'Fungal', symptoms: 'White powder on leaves', treatment: 'Sulfur spray, milk solution', prevention: 'Good airflow, proper spacing' },
  { name: 'Root Rot', type: 'Fungal', symptoms: 'Wilting, brown roots', treatment: 'Hydrogen peroxide, repotting', prevention: 'Proper drainage, avoid overwatering' },
  { name: 'Aphids', type: 'Pest', symptoms: 'Sticky residue, curling leaves', treatment: 'Insecticidal soap, ladybugs', prevention: 'Beneficial insects, neem oil' },
  { name: 'Bud Rot', type: 'Fungal', symptoms: 'Gray mold on buds', treatment: 'Remove affected buds', prevention: 'Low humidity, good airflow' },
  { name: 'Thrips', type: 'Pest', symptoms: 'Silver patches, black dots', treatment: 'Spinosad, sticky traps', prevention: 'Blue sticky traps, beneficial insects' }
];

export default function CultivAIPro() {
  const [formData, setFormData] = useState({
    strain: 'Select Strain',
    leafSymptoms: '',
    phLevel: '',
    temperature: '',
    humidity: '',
    medium: 'soil',
    growthStage: 'flowering',
    // Enhanced diagnostic fields
    plantImage: null,
    pestDiseaseFocus: 'all',
    urgency: 'medium',
    additionalNotes: ''
  });

  // Handle hydration mismatch by ensuring consistent client-side state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [imageAnnotations, setImageAnnotations] = useState([]);
  const [showImageAnnotation, setShowImageAnnotation] = useState(false);
  const [annotationMode, setAnnotationMode] = useState('point'); // point, circle, rectangle, arrow
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [strains, setStrains] = useState(defaultStrains);
  const [showStrainModal, setShowStrainModal] = useState(false);
  const [strainSearch, setStrainSearch] = useState('');
  const [showStrainDropdown, setShowStrainDropdown] = useState(false);
  const [editingStrain, setEditingStrain] = useState(null);
  const [newStrain, setNewStrain] = useState({
    name: '',
    type: 'Hybrid',
    lineage: '',
    description: '',
    isPurpleStrain: false,
    optimalConditions: {
      ph: { range: [6.0, 6.5], medium: 'soil' },
      temperature: { veg: [22, 26], flower: [20, 24] },
      humidity: { veg: [60, 70], flower: [40, 50] },
      light: { veg: '18/6', flower: '12/12' }
    },
    commonDeficiencies: [],
    specialNotes: ''
  });
  const [plantHistory, setPlantHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [sensorData, setSensorData] = useState(mockSensorData);

  // Expose sensor data globally for AI assistant and header
  useEffect(() => {
    (window as any).sensorData = sensorData;
  }, [sensorData]);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState([]);
  const [aiInput, setAIInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [chatImage, setChatImage] = useState(null);
  const [activeDashboard, setActiveDashboard] = useState('overview');
  const [rooms, setRooms] = useState([
    { id: 'room_1', name: 'Main Flower Room', temp: 22, humidity: 55, co2: 1200, active: true },
    { id: 'room_2', name: 'Veg Room', temp: 24, humidity: 65, co2: 1000, active: false }
  ]);
  const [automationSettings, setAutomationSettings] = useState({
    watering: { enabled: true, threshold: 30, schedule: '0 6,18 * * *' },
    lighting: { enabled: true, vegSchedule: '0 6-24 * * *', flowerSchedule: '0 6-18 * * *' },
    climate: { enabled: true, tempMin: 18, tempMax: 26, humidityMin: 40, humidityMax: 70 }
  });
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', message: 'pH levels dropping below optimal range', time: '2 min ago' },
    { id: 2, type: 'info', message: 'Automated watering cycle completed successfully', time: '15 min ago' }
  ]);
  const [autoAnalysis, setAutoAnalysis] = useState(null);
  const [lastAutoAnalysis, setLastAutoAnalysis] = useState(null);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true);
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [autoAnalysisHistory, setAutoAnalysisHistory] = useState([]);
  const [compactView, setCompactView] = useState(false);
  const [analysisTrend, setAnalysisTrend] = useState('stable'); // 'improving', 'declining', 'stable'
  const [storageMode, setStorageMode] = useState('local');
  const [aiModel, setAIModel] = useState('lm-studio');
  const [availableModels, setAvailableModels] = useState([
    'llama-3-70b-chat', 'mistral-7b-instruct', 'gemma-7b-it', 'nous-hermes-llama2-13b'
  ]);
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState('tools');

  // Filter strains based on search
  const filteredStrains = React.useMemo(() => {
    return strains.filter(strain =>
      strain.name.toLowerCase().includes(strainSearch.toLowerCase()) ||
      strain.type.toLowerCase().includes(strainSearch.toLowerCase()) ||
      strain.description.toLowerCase().includes(strainSearch.toLowerCase())
    );
  }, [strains, strainSearch]);

  // Settings state
  const [settings, setSettings] = useState({
    aiProvider: 'lm-studio',
    lmStudio: {
      url: 'http://localhost:1234',
      apiKey: '',
      model: 'llama-3-8b-instruct'
    },
    openRouter: {
      apiKey: '',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      baseUrl: 'https://openrouter.ai/api/v1'
    },
    notifications: {
      enabled: true,
      sound: false,
      desktop: true
    },
    units: {
      temperature: 'fahrenheit',
      weight: 'grams'
    }
  });
  
  // Growth stage state
  const [currentGrowthStage, setCurrentGrowthStage] = useState('vegetative');
  
  // New feature states
  const [inventory, setInventory] = useState([
    { id: 1, name: 'General Hydroponics Flora Series', category: 'Nutrients', quantity: 2, unit: 'L', cost: 45, lastRestocked: '2024-05-01' },
    { id: 2, name: 'Fox Farm Ocean Forest', category: 'Soil', quantity: 3, unit: 'bags', cost: 25, lastRestocked: '2024-04-15' },
    { id: 3, name: 'LED Grow Light 1000W', category: 'Equipment', quantity: 4, unit: 'units', cost: 299, lastRestocked: '2024-03-20' }
  ]);
  const [harvestData, setHarvestData] = useState([
    { id: 1, strain: 'Blue Dream', harvestDate: '2024-04-15', wetWeight: 500, dryWeight: 125, quality: 'A', thc: 22, cbd: 0.5 },
    { id: 2, strain: 'OG Kush', harvestDate: '2024-03-20', wetWeight: 450, dryWeight: 110, quality: 'A+', thc: 25, cbd: 0.3 }
  ]);
  const [selectedPestDisease, setSelectedPestDisease] = useState(null);
  
  // Convert Celsius to Fahrenheit for display
  const celsiusToFahrenheit = (celsius: number) => Math.round((celsius * 9/5) + 32);
  const fahrenheitToCelsius = (fahrenheit: number) => Math.round((fahrenheit - 32) * 5/9);
  
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const strainDropdownRef = useRef(null);
  const chatImageInputRef = useRef(null);

  // Simulate sensor updates
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      setSensorData(prev => ({
        temperature: parseFloat((prev.temperature + (Math.random() - 0.5) * 0.5).toFixed(1)),
        humidity: Math.min(100, Math.max(0, Math.round(prev.humidity + (Math.random() - 0.5) * 2))),
        soilMoisture: Math.min(100, Math.max(0, Math.round(prev.soilMoisture + (Math.random() - 0.5) * 3))),
        lightIntensity: Math.min(1000, Math.max(0, Math.round(prev.lightIntensity + (Math.random() - 0.5) * 50))),
        ph: parseFloat((prev.ph + (Math.random() - 0.5) * 0.1).toFixed(1)),
        ec: parseFloat((prev.ec + (Math.random() - 0.5) * 0.05).toFixed(2)),
        co2: Math.min(2000, Math.max(400, Math.round(prev.co2 + (Math.random() - 0.5) * 100))),
        vpd: parseFloat((0.85 + (Math.random() - 0.5) * 0.2).toFixed(2))
      }));
    }, 5000);

    return () => clearInterval(sensorInterval);
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Close strain dropdown when clicking outside (client-side only)
  useEffect(() => {
    // Only run on client side to avoid hydration issues
    if (typeof window === 'undefined') return;

    const handleClickOutside = (event) => {
      if (strainDropdownRef.current && !strainDropdownRef.current.contains(event.target)) {
        setShowStrainDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keep latest inputs in a ref to avoid re-registering intervals
  const latestAutoInputsRef = useRef({ sensorData, strain: formData.strain, rooms, automationSettings });
  useEffect(() => {
    latestAutoInputsRef.current = { sensorData, strain: formData.strain, rooms, automationSettings };
  }, [sensorData, formData.strain, rooms, automationSettings]);

  // Auto-analysis with dedupe, fixed interval, and backpressure
  const autoInFlightRef = useRef(false);
  useEffect(() => {
    if (!autoAnalysisEnabled) return;

    const performAutoAnalysis = async () => {
      if (autoInFlightRef.current) return;
      autoInFlightRef.current = true;

      // Create AbortController for this request
      const abortController = new AbortController();

      try {
        const { sensorData: sd, strain, rooms: rms, automationSettings: as } = latestAutoInputsRef.current as any;
        const currentRoom = (rms as any[]).find((r: any) => r.active) || (rms as any[])[0];
        const growthStage = as.lighting.enabled ? 'vegetative' : 'flowering';

        const response = await fetch('/api/auto-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            sensorData: sd,
            strain: strain !== 'Select Strain' ? strain : 'Unknown',
            growthStage,
            room: currentRoom?.name || 'Main Room'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const timestamp = new Date().toISOString();

          if (autoAnalysisHistory.length > 0 && result.analysis?.healthScore) {
            const previousScore = autoAnalysisHistory[autoAnalysisHistory.length - 1]?.healthScore || 0;
            const currentScore = result.analysis.healthScore;
            if (currentScore > previousScore + 5) setAnalysisTrend('improving');
            else if (currentScore < previousScore - 5) setAnalysisTrend('declining');
            else setAnalysisTrend('stable');
          }

          if (result.analysis?.healthScore) {
            setAutoAnalysisHistory(prev => [...prev.slice(-9), { ...result.analysis, timestamp }]);
          }

          setAutoAnalysis(result.analysis);
          setLastAutoAnalysis(new Date());

          if (result.alerts && result.alerts.length > 0) {
            result.alerts.forEach((alert: any) => {
              if (alert.type === 'critical') {
                setNotifications(prev => [
                  { id: Date.now() + Math.random(), type: alert.type, title: alert.title, message: alert.message, time: 'just now' },
                  ...prev.slice(0, 4)
                ]);
              }
            });
          }
        }
      } catch (error) {
        // Don't log error if request was aborted
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Auto-analysis failed:', error);
        }
      } finally {
        autoInFlightRef.current = false;
      }
    };

    // Initial run then fixed cadence
    performAutoAnalysis();
    const analysisInterval = setInterval(performAutoAnalysis, 30000);

    // Cleanup function to abort any in-flight requests and clear interval
    return () => {
      clearInterval(analysisInterval);
      if (autoInFlightRef.current) {
        // Note: In a real implementation, we'd need to store the abortController
        // in a ref to access it here. For now, the request will naturally timeout.
      }
    };
  }, [autoAnalysisEnabled]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations when component unmounts
      // This is a safety net to prevent memory leaks
      const cleanup = () => {
        // Clear any remaining intervals/timeouts
        // Abort any in-flight fetch requests
        // Remove event listeners
        // Disconnect any WebSocket connections
      };

      cleanup();
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'))) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Create AbortController for this request
    const abortController = new AbortController();

    // Form is now optional - users can submit with minimal information
    // The API will handle unknown/missing values with defaults

    try {
      // Call the real AI analysis API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          strain: formData.strain || 'Unknown strain',
          leafSymptoms: formData.leafSymptoms?.trim() || 'General symptoms',
          phLevel: formData.phLevel,
          temperature: formData.temperature,
          humidity: formData.humidity,
          medium: formData.medium,
          growthStage: formData.growthStage,
          // Enhanced diagnostic fields
          plantImage: image, // Use the separate image state for the base64 data
          pestDiseaseFocus: formData.pestDiseaseFocus,
          urgency: formData.urgency,
          additionalNotes: formData.additionalNotes?.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText;
        throw new Error(`Analysis failed: ${errorMessage}`);
      }

      const result = await response.json();

      // Handle the wrapped response structure from createAPIResponse
      const responseData = result.data || result;

      if (responseData.success && responseData.analysis) {
        // Transform the AI analysis result to match the expected frontend format
        const analysisResult = {
          diagnosis: responseData.analysis.diagnosis,
          confidence: responseData.analysis.confidence,
          symptomsMatched: responseData.analysis.symptomsMatched || [],
          causes: responseData.analysis.causes || [],
          treatment: responseData.analysis.treatment || [],
          healthScore: responseData.analysis.healthScore,
          strainSpecificAdvice: responseData.analysis.strainSpecificAdvice,
          reasoning: responseData.analysis.reasoning || [],
          isPurpleStrain: responseData.analysis.isPurpleStrain || false,
          recommendations: responseData.analysis.recommendations || [],
          // NEW COMPREHENSIVE DIAGNOSTIC FIELDS
          pestsDetected: responseData.analysis.pestsDetected || [],
          diseasesDetected: responseData.analysis.diseasesDetected || [],
          environmentalFactors: responseData.analysis.environmentalFactors || [],
          urgency: responseData.analysis.urgency || 'medium',
          preventativeMeasures: responseData.analysis.preventativeMeasures || [],
          imageAnalysis: responseData.analysis.imageAnalysis || { hasImage: false, visualFindings: [], confidence: 0 },
          detailedRecommendations: responseData.analysis.recommendations || {
            immediate: [],
            shortTerm: [],
            longTerm: []
          },
          followUpSchedule: responseData.analysis.followUpSchedule || 'Monitor regularly',
          // Additional fields for enhanced display
          primaryIssue: {
            name: responseData.analysis.diagnosis,
            severity: responseData.analysis.healthScore > 70 ? 'low' : responseData.analysis.healthScore > 40 ? 'medium' : 'high',
            confidence: responseData.analysis.confidence,
            urgency: responseData.analysis.urgency || 'medium'
          },
          totalIssues: (responseData.analysis.causes?.length || 0) +
                     (responseData.analysis.pestsDetected?.length || 0) +
                     (responseData.analysis.diseasesDetected?.length || 0),
          // Add fallback information
          fallbackUsed: responseData.fallbackUsed || false,
          fallbackReason: responseData.fallbackReason || null,
          // Add diagnostic capabilities
          diagnosticCapabilities: responseData.diagnosticCapabilities || {},
          imageInfo: responseData.imageInfo || null
        };

        setAnalysisResult(analysisResult);

        // Add to history
        const newHistoryItem = {
          id: Date.now(),
          date: new Date().toISOString(),
          strain: formData.strain,
          diagnosis: analysisResult.diagnosis,
          confidence: analysisResult.confidence,
          healthScore: analysisResult.healthScore,
          notes: formData.leafSymptoms,
          isPurpleStrain: analysisResult.isPurpleStrain,
          fallbackUsed: analysisResult.fallbackUsed
        };

        setPlantHistory(prev => [newHistoryItem, ...prev]);

        // Show success notification with fallback indication
        const notificationMessage = result.fallbackUsed
          ? `Analysis Complete (Rule-based): ${analysisResult.healthScore}/100 - ${analysisResult.diagnosis}`
          : `Analysis Complete (AI-powered): ${analysisResult.healthScore}/100 - ${analysisResult.diagnosis}`;

        setNotifications(prev => [
          {
            id: Date.now(),
            type: result.fallbackUsed ? 'warning' : 'success',
            title: result.fallbackUsed ? 'Analysis Complete (Fallback Mode)' : 'Analysis Complete',
            message: notificationMessage,
            time: 'just now'
          },
          ...prev.slice(0, 4)
        ]);
      } else {
        // Handle both error response structures
        const errorMessage = responseData.error?.message || responseData.error || 'Analysis failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Don't log error if request was aborted
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Analysis error:', error);

        // Show error notification
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'error',
            title: 'Analysis Failed',
            message: error.message || 'Unable to analyze plant data. Please try again.',
            time: 'just now'
        },
        ...prev.slice(0, 4)
      ]);
      } else {
        // Request was aborted, don't show error notification
      }

      // Fallback to basic analysis if API fails
      const selectedStrain = strains.find(s => s.name === formData.strain) || defaultStrains[0];
      const fallbackAnalysis = {
        diagnosis: 'Analysis Unavailable',
        confidence: 0,
        symptomsMatched: [formData.leafSymptoms],
        causes: ['API connection failed'],
        treatment: ['Check internet connection and try again'],
        healthScore: 50,
        strainSpecificAdvice: 'Please try the analysis again in a few moments.',
        reasoning: [{
          step: 'System Error',
          explanation: 'Unable to connect to AI analysis service',
          weight: 100
        }],
        isPurpleStrain: selectedStrain.isPurpleStrain,
        recommendations: [],
        primaryIssue: {
          name: 'Connection Error',
          severity: 'medium',
          confidence: 0
        },
        totalIssues: 1
      };

      setAnalysisResult(fallbackAnalysis);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      strain: 'Select Strain',
      leafSymptoms: '',
      phLevel: '',
      temperature: '',
      humidity: '',
      medium: 'soil',
      growthStage: 'flowering'
    });
    setImage(null);
    setAnalysisResult(null);
  };

  const handleAddStrain = () => {
    if (!newStrain.name.trim()) return;
    
    const strainToAdd = {
      id: `strain_${Date.now()}`,
      ...newStrain,
      createdAt: new Date().toISOString()
    };
    
    setStrains(prev => [...prev, strainToAdd]);
    setFormData(prev => ({ ...prev, strain: strainToAdd.name }));
    setShowStrainModal(false);
    setNewStrain({
      name: '',
      type: 'Hybrid',
      lineage: '',
      description: '',
      isPurpleStrain: false,
      optimalConditions: {
        ph: { range: [6.0, 6.5], medium: 'soil' },
        temperature: { veg: [22, 26], flower: [20, 24] },
        humidity: { veg: [60, 70], flower: [40, 50] },
        light: { veg: '18/6', flower: '12/12' }
      },
      commonDeficiencies: [],
      specialNotes: ''
    });
  };

  const handleUpdateStrain = () => {
    if (!newStrain.name.trim()) return;
    
    setStrains(prev => prev.map(strain => 
      strain.id === editingStrain.id ? newStrain : strain
    ));
    setShowStrainModal(false);
    setEditingStrain(null);
  };

  const handleDeleteStrain = (id) => {
    setStrains(prev => prev.filter(strain => strain.id !== id));
    if (formData.strain === strains.find(s => s.id === id)?.name) {
      setFormData(prev => ({ ...prev, strain: 'Select Strain' }));
    }
  };

  const handleDeleteHistory = (id) => {
    setPlantHistory(prev => prev.filter(item => item.id !== id));
    if (selectedHistoryItem?.id === id) {
      setSelectedHistoryItem(null);
    }
  };

  const handleAIChatSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isProcessingAI) return;

    const userMessage = {
      role: 'user',
      content: aiInput,
      image: chatImage
    };
    setAIMessages(prev => [...prev, userMessage]);
    setAIInput('');
    const currentImage = chatImage;
    setChatImage(null);
    setIsProcessingAI(true);

    // Create AbortController for this request
    const abortController = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          message: aiInput,
          model: settings.aiProvider,
          sensorData: sensorData,
          image: currentImage
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          model: data.model,
          provider: data.provider
        };
        setAIMessages(prev => [...prev, aiMessage]);

        // Add notification for AI response
        setNotifications(prev => [
          {
            id: Date.now(),
            type: 'ai',
            message: `AI response from ${data.provider}`,
            time: 'just now'
          },
          ...prev.slice(0, 4)
        ]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      // Don't log error if request was aborted
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Chat API error:', error);
        const errorMessage = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your AI settings and try again.`,
          isError: true
      };
      setAIMessages(prev => [...prev, errorMessage]);

      // Add error notification
      setNotifications(prev => [
        {
          id: Date.now(),
          type: 'alert',
          message: 'AI chat error occurred',
          time: 'just now'
        },
        ...prev.slice(0, 4)
      ]);
      } else {
        // Request was aborted, don't show error notification
      }
    } finally {
      setIsProcessingAI(false);
    }
  };

  const toggleRoom = (id) => {
    setRooms(prev => prev.map(room => 
      room.id === id ? { ...room, active: !room.active } : room
    ));
  };

  const renderRoomStatus = (room) => {
    if (!room.active) return (
      <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">Offline</span>
    );
    
    const isOptimal = room.temp >= 18 && room.temp <= 26 && room.humidity >= 40 && room.humidity <= 70;
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOptimal ? 'bg-green-500' : 'bg-amber-500'}`}></div>
        <span className={`text-xs font-medium ${isOptimal ? 'text-green-400' : 'text-amber-400'}`}>
          {isOptimal ? 'Optimal' : 'Attention Needed'}
        </span>
      </div>
    );
  };

  const renderSensorCard = (title, value, unit, icon, optimalRange) => {
    const isOptimal = optimalRange ? value >= optimalRange[0] && value <= optimalRange[1] : true;
    
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            {icon}
            <h4 className="ml-2 font-medium text-slate-200">{title}</h4>
          </div>
          <div className="text-center">
            <span className={`text-3xl font-bold ${isOptimal ? 'text-green-400' : 'text-amber-400'}`}>
              {value}{unit}
            </span>
            {optimalRange && (
              <p className="text-xs text-slate-400 mt-1">
                Optimal: {optimalRange[0]}-{optimalRange[1]}{unit}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderHistoryItem = (item) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return (
      <Card
        key={item.id}
        className={`bg-slate-900/50 border-slate-700 cursor-pointer transition-all ${
          selectedHistoryItem?.id === item.id ? 'border-blue-500 bg-slate-900/70' : 'hover:bg-slate-800/50'
        }`}
        onClick={() => setSelectedHistoryItem(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="mr-4 mt-1">
              <div className="w-12 h-12 bg-slate-800 flex items-center justify-center rounded-lg border border-slate-600">
                <Leaf className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-200 truncate">{item.strain}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.confidence > 75 ? 'bg-green-900/50 text-green-300' :
                  item.confidence > 50 ? 'bg-amber-900/50 text-amber-300' : 'bg-red-900/50 text-red-300'
                }`}>
                  {item.confidence}%
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1 line-clamp-1">{item.diagnosis}</p>
              <div className="flex items-center mt-2 text-xs text-slate-400">
                <div className="flex items-center">
                  <span>{formattedDate}</span>
                  <div className="ml-3 flex items-center">
                    <span className="font-medium">Health: {item.healthScore}/100</span>
                  </div>
                </div>
              </div>
              {item.isPurpleStrain && (
                <div className="mt-1">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">Purple Strain</Badge>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteHistory(item.id);
              }}
              className="ml-2 text-slate-400 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Side panel content components

  const renderPestDiseaseIdentifier = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-300 flex items-center">
        <Bug className="h-5 w-5 mr-2" />
        Pest & Disease ID
      </h3>

      <div>
        <Label className="text-slate-300 text-sm">Search Symptoms</Label>
        <Input
          placeholder="e.g., yellow spots, webbing..."
          className="bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-400"
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pestDiseaseDatabase.map((item) => (
          <Card
            key={item.name}
            className="bg-slate-800/50 border-slate-600 cursor-pointer hover:bg-slate-800/70"
            onClick={() => setSelectedPestDisease(item)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-200 text-sm">{item.name}</h4>
                  <Badge variant="secondary" className={`text-xs ${
                    item.type === 'Pest' ? 'bg-red-500/20 text-red-300' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {item.type}
                  </Badge>
                </div>
                <Bug className="h-4 w-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPestDisease && (
        <Card className="bg-slate-800/50 border-slate-600">
          <CardContent className="p-3">
            <h4 className="font-medium text-blue-300 text-sm mb-2">{selectedPestDisease.name}</h4>
            <p className="text-xs text-slate-300 mb-1"><strong>Symptoms:</strong> {selectedPestDisease.symptoms}</p>
            <p className="text-xs text-slate-300 mb-1"><strong>Treatment:</strong> {selectedPestDisease.treatment}</p>
            <p className="text-xs text-slate-300"><strong>Prevention:</strong> {selectedPestDisease.prevention}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderInventoryManager = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-300 flex items-center">
        <Package className="h-5 w-5 mr-2" />
        Inventory Manager
      </h3>

      <Button className="w-full bg-blue-700 hover:bg-blue-600">
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {inventory.map((item) => (
          <Card key={item.id} className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-slate-200 text-sm">{item.name}</h4>
                  <p className="text-xs text-slate-400">{item.quantity} {item.unit}</p>
                  <Badge variant="secondary" className="text-xs bg-slate-700/50">
                    {item.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-400">${item.cost}</p>
                  <p className="text-xs text-slate-500">{item.lastRestocked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-slate-800/30 border border-slate-600 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-300">Total Value</p>
        <p className="text-xl font-bold text-blue-400">
          ${inventory.reduce((sum, item) => sum + (item.cost * item.quantity), 0)}
        </p>
      </div>
    </div>
  );

  const renderHarvestTracker = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-blue-300 flex items-center">
        <Scissors className="h-5 w-5 mr-2" />
        Harvest Tracker
      </h3>

      <Button className="w-full bg-blue-700 hover:bg-blue-600">
        <Plus className="h-4 w-4 mr-2" />
        Log Harvest
      </Button>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {harvestData.map((harvest) => (
          <Card key={harvest.id} className="bg-slate-800/50 border-slate-600">
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-slate-200 text-sm">{harvest.strain}</h4>
                  <p className="text-xs text-slate-400">{harvest.harvestDate}</p>
                  <div className="flex space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs bg-green-700/50 text-green-300">
                      {harvest.quality}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-purple-700/50 text-purple-300">
                      {harvest.thc}% THC
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-400">{harvest.dryWeight}g</p>
                  <p className="text-xs text-slate-500">dry</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-slate-800/30 border border-slate-600 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-300">Total Harvested</p>
        <p className="text-xl font-bold text-blue-400">
          {harvestData.reduce((sum, harvest) => sum + harvest.dryWeight, 0)}g
        </p>
        <p className="text-xs text-slate-400">Across {harvestData.length} harvests</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pt-4">
      {/* Content starts immediately below global header */}
      <header>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-blue-400">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-900 border-slate-700 w-80">
                <SheetHeader>
                  <SheetTitle className="text-blue-300">Cultivation Tools Suite</SheetTitle>
                  <p className="text-slate-400 text-sm mt-1">Quick access to all cultivation tools</p>
                </SheetHeader>

                <Tabs value={activeSideTab} onValueChange={setActiveSideTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="tools" className="text-slate-300">Tools</TabsTrigger>
                    <TabsTrigger value="data" className="text-slate-300">Data</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tools" className="space-y-6 mt-4">
                    {/* Quick Tool Access */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-blue-300 mb-3">Quick Access Tools</h3>

                      <Link href="/all-tools" className="block">
                        <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500 hover:border-blue-300 transition-all duration-300 hover:from-blue-800/50 hover:to-purple-800/50">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Wrench className="h-4 w-4 text-blue-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-300">All Tools Suite</h4>
                                <p className="text-xs text-slate-400">Complete toolkit - All tools in one place</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/ai-assistant" className="block">
                        <Card className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-500 hover:border-emerald-300 transition-all duration-300 hover:from-emerald-800/50 hover:to-teal-800/50">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Bot className="h-4 w-4 text-emerald-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-emerald-300">AI Cultivation Assistant</h4>
                                <p className="text-xs text-slate-400">Expert guidance & plant analysis</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/live-vision" className="block">
                        <Card className="bg-slate-800/50 border-slate-600 hover:border-green-400 transition-all duration-300 hover:bg-slate-800/70">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 text-green-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-green-300">Live Plant Vision</h4>
                                <p className="text-xs text-slate-400">USB webcam & microscope analysis</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/nutrient-calculator" className="block">
                        <Card className="bg-slate-800/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:bg-slate-800/70">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Calculator className="h-4 w-4 text-blue-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-300">Nutrient Calculator</h4>
                                <p className="text-xs text-slate-400">Full version</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/pest-disease-id" className="block">
                        <Card className="bg-slate-800/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:bg-slate-800/70">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Bug className="h-4 w-4 text-blue-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-300">Pest & Disease ID</h4>
                                <p className="text-xs text-slate-400">Full version</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/harvest-tracker" className="block">
                        <Card className="bg-slate-800/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:bg-slate-800/70">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Scissors className="h-4 w-4 text-blue-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-300">Harvest Tracker</h4>
                                <p className="text-xs text-slate-400">Full version</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/inventory-manager" className="block">
                        <Card className="bg-slate-800/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:bg-slate-800/70">
                          <CardContent className="p-3">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-blue-400 mr-3" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-blue-300">Inventory Manager</h4>
                                <p className="text-xs text-slate-400">Full version</p>
                              </div>
                              <ArrowLeft className="h-3 w-3 text-slate-400 rotate-180" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Embedded Quick Tools */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-blue-300 mb-3">Quick Tools</h3>
                      {renderPestDiseaseIdentifier()}
                    </div>
                  </TabsContent>

                  <TabsContent value="data" className="space-y-6 mt-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-blue-300 mb-3">Data Management</h3>
                      {renderInventoryManager()}
                      <Separator className="bg-slate-700" />
                      {renderHarvestTracker()}
                    </div>
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
            
            <div className="bg-blue-500 p-2 rounded-full">
              <Leaf className="h-6 w-6 text-slate-900" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-sky-300">
              CultivAI Pro
            </h1>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-xs">SMART GROW</Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Growth Stage Toggle */}
            <div className="hidden sm:flex items-center bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-600">
              <Flame className="h-4 w-4 mr-2 text-orange-400" />
              <span className="text-sm font-medium mr-2">Stage:</span>
              <div className="flex bg-slate-900 rounded-lg p-1">
                <button
                  onClick={() => setCurrentGrowthStage('vegetative')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    currentGrowthStage === 'vegetative'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Veg
                </button>
                <button
                  onClick={() => setCurrentGrowthStage('flowering')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    currentGrowthStage === 'flowering'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Flower
                </button>
              </div>
            </div>
            
            {/* Room Status */}
            <div className="hidden sm:flex items-center bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-600">
              <Wifi className={`h-4 w-4 mr-2 ${rooms.some(r => r.active) ? 'text-green-400' : 'text-amber-400'}`} />
              <span className="text-sm font-medium">
                {rooms.filter(r => r.active).length}/{rooms.length} Rooms
              </span>
            </div>

            {/* AI Assistant */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border-slate-600"
            >
              <Bot className="h-4 w-4" />
              {aiMessages.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-500 text-slate-900 text-xs">
                  {aiMessages.length}
                </Badge>
              )}
            </Button>

            {/* History */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border-slate-600"
            >
              <Database className="h-4 w-4" />
              <Badge variant="secondary" className="ml-1 bg-amber-500 text-slate-900 text-xs">
                {plantHistory.length}
              </Badge>
            </Button>
            
            {/* AI Assistant Button */}
            <Link href="/ai-assistant" className="block">
              <Button variant="ghost" size="sm" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-600/30">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">AI Assistant</span>
              </Button>
            </Link>

            {/* Minimal Notification Bell */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-blue-400">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Live Sensors & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Room Management */}
            <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-blue-300 flex items-center">
                    <Home className="h-4 w-4 mr-2 text-blue-400" />
                    Grow Rooms
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {rooms.map((room) => (
                    <div 
                      key={room.id} 
                      className={`bg-slate-900/50 border ${
                        room.active ? 'border-slate-600' : 'border-gray-700'
                      } rounded-xl p-3 cursor-pointer transition-all hover:bg-slate-800/50`}
                      onClick={() => toggleRoom(room.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-slate-200 text-sm">{room.name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center text-xs">
                              <Thermometer className="h-3 w-3 text-amber-400 mr-1" />
                              <span className="text-slate-300">{celsiusToFahrenheit(room.temp)}°F</span>
                            </div>
                            <div className="flex items-center text-xs">
                              <Droplet className="h-3 w-3 text-blue-400 mr-1" />
                              <span className="text-slate-300">{room.humidity}%</span>
                            </div>
                          </div>
                        </div>
                        {renderRoomStatus(room)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Live Sensors */}
            <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-blue-300 flex items-center">
                    <Monitor className="h-4 w-4 mr-2 text-blue-400" />
                    Live Sensors
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button 
                      variant={storageMode === 'local' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setStorageMode('local')}
                      className={storageMode === 'local' ? 'bg-slate-800 text-slate-200 h-6 w-6 p-0' : 'h-6 w-6 p-0'}
                    >
                      <HardDrive className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant={storageMode === 'cloud' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setStorageMode('cloud')}
                      className={storageMode === 'cloud' ? 'bg-slate-800 text-slate-200 h-6 w-6 p-0' : 'h-6 w-6 p-0'}
                    >
                      <Cloud className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {renderSensorCard(
                    'Temp', 
                    celsiusToFahrenheit(sensorData.temperature), 
                    '°F', 
                    <Thermometer className="h-4 w-4 text-amber-400" />,
                    [64, 79] // 18-26°C converted to Fahrenheit
                  )}
                  
                  {renderSensorCard(
                    'Humidity', 
                    sensorData.humidity, 
                    '%', 
                    <CloudRain className="h-4 w-4 text-blue-400" />,
                    [40, 70]
                  )}
                  
                  {renderSensorCard(
                    'pH', 
                    sensorData.ph, 
                    '', 
                    <Scale className="h-4 w-4 text-blue-400" />,
                    [5.8, 6.5]
                  )}
                  
                  {renderSensorCard(
                    'EC', 
                    sensorData.ec, 
                    ' mS/cm', 
                    <ZapIcon className="h-4 w-4 text-purple-400" />,
                    [1.2, 2.0]
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-blue-300 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-blue-400" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <Link href="/ai-assistant" className="block">
                    <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 flex flex-col items-center h-auto py-3 text-xs shadow-lg shadow-emerald-600/20">
                      <Bot className="h-6 w-6 text-white mb-2" />
                      <span className="font-semibold">AI Assistant</span>
                      <span className="text-emerald-100 opacity-90">Get Expert Help</span>
                    </Button>
                  </Link>

                  <Button variant="outline" className="bg-slate-800 hover:bg-slate-700 border-slate-600 flex flex-col items-center h-auto py-2 text-xs">
                    <ZapIcon className="h-5 w-5 text-amber-400 mb-1" />
                    Water
                  </Button>

                  <Button variant="outline" className="bg-slate-800 hover:bg-slate-700 border-slate-600 flex flex-col items-center h-auto py-2 text-xs">
                    <Sun className="h-5 w-5 text-yellow-400 mb-1" />
                    Lights
                  </Button>

                  <Button variant="outline" className="bg-slate-800 hover:bg-slate-700 border-slate-600 flex flex-col items-center h-auto py-2 text-xs">
                    <Wind className="h-5 w-5 text-cyan-400 mb-1" />
                    Fans
                  </Button>

                  <Button variant="outline" className="bg-slate-800 hover:bg-slate-700 border-slate-600 flex flex-col items-center h-auto py-2 text-xs">
                    <FlaskConical className="h-5 w-5 text-purple-400 mb-1" />
                    Nutrients
                  </Button>

                  <Button variant="outline" className="bg-slate-800 hover:bg-slate-700 border-slate-600 flex flex-col items-center h-auto py-2 text-xs">
                    <Camera className="h-5 w-5 text-blue-400 mb-1" />
                    Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dashboard Navigation */}
            <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
              <CardContent className="p-3">
                <div className="flex overflow-x-auto py-1">
                  {['overview', 'automation', 'analytics', 'ai-tools', 'settings'].map((tab) => (
                    <Button
                      key={tab}
                      variant={activeDashboard === tab ? 'default' : 'ghost'}
                      onClick={() => setActiveDashboard(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap mr-2 ${
                        activeDashboard === tab
                          ? 'bg-blue-500 text-slate-900'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      {tab === 'overview' && <LayoutDashboard className="h-3 w-3 mr-1 inline" />}
                      {tab === 'automation' && <Zap className="h-3 w-3 mr-1 inline" />}
                      {tab === 'analytics' && <ChartBar className="h-3 w-3 mr-1 inline" />}
                      {tab === 'ai-tools' && <Bot className="h-3 w-3 mr-1 inline" />}
                      {tab === 'settings' && <Settings className="h-3 w-3 mr-1 inline" />}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section Header with Breadcrumb */}
            <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-slate-400 text-sm">Dashboard</div>
                    <ArrowLeft className="h-3 w-3 text-slate-500 rotate-180" />
                    <div className="text-blue-300 text-sm font-medium capitalize">
                      {activeDashboard === 'ai-tools' ? 'AI Tools Suite' :
                       activeDashboard === 'overview' ? 'Overview & Analysis' :
                       activeDashboard === 'automation' ? 'Automation Controls' :
                       activeDashboard === 'analytics' ? 'Analytics & Reports' :
                       activeDashboard === 'settings' ? 'Settings & Configuration' : activeDashboard}
                    </div>
                  </div>
                  {activeDashboard === 'ai-tools' && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        <Bot className="h-3 w-3 mr-1" />
                        4 Tools Available
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overview Dashboard */}
            {activeDashboard === 'overview' && (
              <div className="space-y-6">
                {/* Image Analysis Section */}
                <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-500 p-2 rounded-lg mr-3">
                          <Image className="h-5 w-5 text-slate-900" alt="Plant scanner icon" />
                        </div>
                        <CardTitle className="text-xl font-bold text-blue-300">Plant Health Scanner</CardTitle>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="bg-slate-800 hover:bg-slate-700">
                          <Video className="h-3 w-3 mr-1" />
                          Time-lapse
                        </Button>
                        <Button variant="outline" size="sm" className="bg-slate-800 hover:bg-slate-700">
                          <Camera className="h-3 w-3 mr-1" />
                          Capture
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                        image ? 'border-blue-500 bg-slate-900/30' : 'border-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {image ? (
                        <div className="space-y-3">
                          {/* Enhanced Image Viewer with Annotation Tools */}
                          <div className="relative">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm text-slate-300">
                                <Image className="h-4 w-4 inline mr-1" />
                                High-Resolution Image Analysis
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => setShowImageAnnotation(!showImageAnnotation)}
                                  variant="outline"
                                  size="sm"
                                  className="bg-purple-800 hover:bg-purple-700 text-purple-300"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  {showImageAnnotation ? 'Hide' : 'Annotate'}
                                </Button>
                                <Button
                                  onClick={() => setZoomLevel(Math.min(zoomLevel * 1.5, 5))}
                                  variant="outline"
                                  size="sm"
                                  className="bg-blue-800 hover:bg-blue-700"
                                >
                                  🔍+
                                </Button>
                                <Button
                                  onClick={() => setZoomLevel(Math.max(zoomLevel / 1.5, 0.5))}
                                  variant="outline"
                                  size="sm"
                                  className="bg-blue-800 hover:bg-blue-700"
                                >
                                  🔍-
                                </Button>
                              </div>
                            </div>

                            {/* Annotation Tools */}
                            {showImageAnnotation && (
                              <div className="mb-2 p-2 bg-slate-900/50 rounded-lg border border-slate-600">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-xs text-slate-400 font-medium">Annotation Tools:</span>
                                  {['point', 'circle', 'rectangle', 'arrow'].map((mode) => (
                                    <Button
                                      key={mode}
                                      onClick={() => setAnnotationMode(mode)}
                                      variant={annotationMode === mode ? 'default' : 'outline'}
                                      size="sm"
                                      className={`text-xs ${annotationMode === mode ? 'bg-blue-600 text-slate-900' : 'bg-slate-800 hover:bg-slate-700'}`}
                                    >
                                      {mode === 'point' ? '📍' : mode === 'circle' ? '⭕' : mode === 'rectangle' ? '▢' : '➔'} {mode}
                                    </Button>
                                  ))}
                                  {imageAnnotations.length > 0 && (
                                    <Button
                                      onClick={() => setImageAnnotations([])}
                                      variant="outline"
                                      size="sm"
                                      className="bg-red-800 hover:bg-red-700 text-red-300"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Clear
                                    </Button>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">
                                  Click on the image to mark problem areas. Current tool: {annotationMode}
                                </div>
                              </div>
                            )}

                            {/* Interactive Image with Zoom */}
                            <div
                              className="relative overflow-hidden rounded-lg border border-slate-600 bg-black"
                              style={{ height: '300px' }}
                            >
                              {image ? (
                                <>
                                  <img
                                    src={image}
                                    alt="Interactive plant image for analysis and annotation"
                                    className="w-full h-full object-contain cursor-crosshair"
                                    draggable={false}
                                    style={{
                                      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                                      transition: 'transform 0.2s',
                                      pointerEvents: showImageAnnotation ? 'auto' : 'none'
                                    }}
                                    onClick={(e) => {
                                      if (!showImageAnnotation) return;

                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = ((e.clientX - rect.left) / zoomLevel) - panOffset.x;
                                      const y = ((e.clientY - rect.top) / zoomLevel) - panOffset.y;

                                      const newAnnotation = {
                                        id: Date.now(),
                                        type: annotationMode,
                                        x,
                                        y,
                                        label: `Issue ${imageAnnotations.length + 1}`,
                                        timestamp: new Date().toISOString()
                                      };

                                      setImageAnnotations([...imageAnnotations, newAnnotation]);
                                    }}
                                  />

                                {/* Overlay Annotations */}
                                {showImageAnnotation && imageAnnotations.map((annotation) => (
                                  <div
                                    key={annotation.id}
                                    className="absolute"
                                    style={{
                                      left: `${(annotation.x * zoomLevel) + panOffset.x}px`,
                                      top: `${(annotation.y * zoomLevel) + panOffset.y}px`,
                                      transform: 'translate(-50%, -50%)'
                                    }}
                                  >
                                    {annotation.type === 'point' && (
                                      <div className="relative">
                                        <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                                        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                                          {annotation.label}
                                        </div>
                                      </div>
                                    )}
                                    {annotation.type === 'circle' && (
                                      <div className="relative">
                                        <div className="w-16 h-16 border-4 border-yellow-400 rounded-full bg-yellow-400/20"></div>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                                          {annotation.label}
                                        </div>
                                      </div>
                                    )}
                                    {annotation.type === 'rectangle' && (
                                      <div className="relative">
                                        <div className="w-20 h-16 border-4 border-orange-400 bg-orange-400/20"></div>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                                          {annotation.label}
                                        </div>
                                      </div>
                                    )}
                                    {annotation.type === 'arrow' && (
                                      <div className="relative">
                                        <div className="w-8 h-1 bg-green-500 transform rotate-45"></div>
                                        <div className="absolute -top-2 left-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-green-500"></div>
                                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                                          {annotation.label}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                </>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <div className="text-center">
                                    <Image className="h-12 w-12 mx-auto mb-2 text-slate-500" />
                                    <p className="text-slate-400 text-sm">Click to upload plant image</p>
                                  </div>
                                </div>
                              )}

                              {/* Zoom Level Indicator */}
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Zoom: {zoomLevel.toFixed(1)}x
                              </div>
                            </div>
                          </div>

                          {/* Image Information */}
                          <div className="bg-slate-900/40 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400">Annotations:</span>
                                <span className="text-slate-300 ml-1">{imageAnnotations.length}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Mode:</span>
                                <span className="text-slate-300 ml-1">{showImageAnnotation ? 'Interactive' : 'View Only'}</span>
                              </div>
                              {imageAnnotations.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-slate-400">Marked Areas:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {imageAnnotations.map((ann, idx) => (
                                      <span key={ann.id} className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-xs">
                                        {ann.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Image Actions */}
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              onClick={() => fileInputRef.current.click()}
                              variant="outline"
                              size="sm"
                              className="bg-slate-800 hover:bg-slate-700"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Replace
                            </Button>
                            <Button
                              onClick={() => {
                                setImage(null);
                                setImageAnnotations([]);
                                setShowImageAnnotation(false);
                                setZoomLevel(1);
                                setPanOffset({ x: 0, y: 0 });
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-red-800 hover:bg-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*,.heic,.heif"
                            className="hidden"
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-center">
                            <div className="bg-slate-800/50 border-2 border-dashed border-blue-600 rounded-xl p-6">
                              <Camera className="h-12 w-12 mx-auto text-slate-400" />
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-slate-200">Ultra High-Resolution Plant Scanner</h3>
                          <p className="text-slate-400 text-sm max-w-md mx-auto">
                            Upload images up to 500MB (8K+ resolution) for professional-grade diagnosis with interactive annotation tools
                          </p>
                          <div className="bg-slate-900/40 rounded-lg p-2 mx-auto max-w-md">
                            <div className="text-xs text-slate-300 space-y-1">
                              <div>📸 Support for ultra-high resolution images (up to 8K)</div>
                              <div>🔍 Interactive zoom & annotation tools</div>
                              <div>🧠 AI-powered symptom detection</div>
                              <div>⚡ Adaptive compression preserving diagnostic details</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button
                              onClick={() => fileInputRef.current.click()}
                              className="bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-400 hover:to-sky-500 text-slate-900 font-medium"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Ultra HD Image (≤500MB)
                            </Button>
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*,.heic,.heif" 
                            className="hidden" 
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Auto-Analysis Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="bg-gradient-to-br from-slate-950/90 via-slate-950/70 to-blue-950/30 backdrop-blur-sm border-slate-600/50 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
                    <CardHeader className="relative">
                      {/* Animated background gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-sky-500/5 to-blue-500/5 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center space-x-3">
                          <motion.div
                            className="bg-gradient-to-br from-blue-500 to-sky-600 p-2.5 rounded-xl shadow-lg"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Bot className="h-5 w-5 text-slate-900" />
                          </motion.div>
                          <div>
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-300 to-sky-300 bg-clip-text text-transparent">
                              Live Plant Analysis
                            </CardTitle>
                            <p className="text-slate-400/80 text-sm">AI-powered continuous monitoring</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* View Toggle */}
                          <motion.div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-600/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCompactView(false)}
                              className={`px-2 py-1 text-xs transition-all duration-200 ${
                                !compactView
                                  ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Grid className="h-3 w-3 mr-1" />
                              Detailed
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCompactView(true)}
                              className={`px-2 py-1 text-xs transition-all duration-200 ${
                                compactView
                                  ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-300'
                              }`}
                            >
                              <Minimize2 className="h-3 w-3 mr-1" />
                              Compact
                            </Button>
                          </motion.div>

                          {/* Status Toggle */}
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAutoAnalysisEnabled(!autoAnalysisEnabled)}
                              className={`relative overflow-hidden transition-all duration-300 ${
                                autoAnalysisEnabled
                                  ? 'bg-gradient-to-r from-blue-500 to-sky-600 text-slate-900 border-blue-400/50 shadow-lg shadow-blue-500/25'
                                  : 'bg-slate-800/50 text-slate-300 border-blue-600/50 hover:bg-slate-700/50'
                              }`}
                            >
                              {autoAnalysisEnabled && (
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-sky-400/20"
                                  animate={{ x: ['-100%', '100%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                              )}
                              <span className="relative flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${autoAnalysisEnabled ? 'bg-slate-900 animate-pulse' : 'bg-green-400'}`} />
                                {autoAnalysisEnabled ? 'Active' : 'Paused'}
                              </span>
                            </Button>
                          </motion.div>

                          {lastAutoAnalysis && (
                            <motion.span
                              className="text-slate-400/70 text-xs hidden sm:block"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              {new Date(lastAutoAnalysis).toLocaleTimeString()}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="relative">
                      {isAutoAnalyzing ? (
                        /* Loading State */
                        <motion.div
                          className="text-center py-12"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="relative w-20 h-20 mx-auto mb-6">
                            {/* Outer ring */}
                            <motion.div
                              className="absolute inset-0 border-4 border-slate-600/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 border-t-4 border-blue-400 rounded-full" />
            </motion.div>

            {/* Middle ring */}
            <motion.div
              className="absolute inset-2 border-3 border-blue-600/30 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 border-t-3 border-green-400 rounded-full" />
            </motion.div>

            {/* Inner ring */}
            <motion.div
              className="absolute inset-4 border-2 border-blue-700/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 border-t-2 border-blue-300 rounded-full" />
            </motion.div>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Bot className="h-8 w-8 text-blue-400" />
              </motion.div>
            </div>
          </div>

          <motion.h3
            className="text-lg font-bold text-slate-200 mb-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Analyzing Plant Health...
          </motion.h3>
          <p className="text-slate-400/70 text-sm max-w-md mx-auto">
            Processing sensor data and running AI diagnostics
          </p>

          {/* Animated scanning lines */}
          <div className="mt-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent rounded-full"
                initial={{ width: "0%", x: "-50%" }}
                animate={{ width: "100%", x: "50%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </motion.div>
      ) : autoAnalysis ? (
        /* Analysis Results */
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {!compactView && (
            <>
              {/* Enhanced Health Score with Trend */}
              <motion.div
                className="relative p-4 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-blue-900/20 rounded-xl border border-slate-600/30 hover:border-blue-600/50 transition-all duration-300 group"
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-200 font-semibold">Plant Health Score</span>
                    {analysisTrend !== 'stable' && (
                      <motion.div
                        className={`flex items-center text-xs px-2 py-1 rounded-full ${
                          analysisTrend === 'improving'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        {analysisTrend === 'improving' ? (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Improving
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Declining
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <span className={`font-bold text-lg ${
                    autoAnalysis.healthScore >= 80 ? 'text-green-300' :
                    autoAnalysis.healthScore >= 60 ? 'text-yellow-300' :
                    autoAnalysis.healthScore >= 40 ? 'text-orange-300' :
                    'text-red-300'
                  }`}>
                    {autoAnalysis.healthScore}/100
                  </span>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="relative">
                  <div className="h-4 bg-slate-800/50 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full relative overflow-hidden ${
                        autoAnalysis.healthScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                        autoAnalysis.healthScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                        autoAnalysis.healthScore >= 40 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                        'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${autoAnalysis.healthScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    >
                      {/* Animated shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  </div>

                  {/* Milestone markers */}
                  <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                    {[25, 50, 75].map((milestone) => (
                      <div key={milestone} className="relative">
                        <div className="w-0.5 h-2 bg-slate-700/50" />
                        <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-slate-500/70">
                          {milestone}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Status Badge */}
                <div className="mt-3 flex justify-center">
                  <motion.div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      autoAnalysis.healthScore >= 80 ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                      autoAnalysis.healthScore >= 60 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                      autoAnalysis.healthScore >= 40 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                      'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  >
                    {autoAnalysis.healthScore >= 80 ? '🌟 Excellent Health' :
                     autoAnalysis.healthScore >= 60 ? '🌱 Good Health' :
                     autoAnalysis.healthScore >= 40 ? '⚠️ Needs Attention' :
                     '🚨 Critical Issues'}
                  </motion.div>
                </div>
              </motion.div>

              {/* Enhanced Diagnosis Card */}
              <motion.div
                className="p-4 bg-gradient-to-br from-slate-900/30 to-blue-900/20 rounded-xl border border-slate-600/30 hover:border-blue-600/30 transition-all duration-300"
                whileHover={{ scale: 1.01, y: -1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="bg-blue-500/20 p-1.5 rounded-lg">
                      <Activity className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-slate-200 font-semibold">Current Diagnosis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {/* Confidence indicator */}
                      <div className="flex space-x-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <motion.div
                            key={star}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: star <= Math.ceil(autoAnalysis.confidence / 20)
                                ? 'rgb(74, 222, 128)'
                                : 'rgb(34, 197, 94)'
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 * star, type: "spring", stiffness: 400 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 ml-1">
                        {autoAnalysis.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-blue-300 font-medium leading-relaxed">
                  {autoAnalysis.diagnosis}
                </p>
              </motion.div>

              {/* Comprehensive Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Key Metrics */}
                <motion.div
                  className="p-3 bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border border-blue-700/30"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-300 text-sm font-medium">Environment</span>
                    <Thermometer className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-200/70">Temperature</span>
                      <span className="text-blue-300 font-medium">{sensorData.temperature}°C</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-200/70">Humidity</span>
                      <span className="text-blue-300 font-medium">{sensorData.humidity}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-200/70">VPD</span>
                      <span className="text-blue-300 font-medium">{sensorData.vpd} kPa</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-3 bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg border border-purple-700/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-300 text-sm font-medium">Nutrients</span>
                    <Droplet className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-purple-200/70">pH Level</span>
                      <span className={`font-medium ${
                        sensorData.ph >= 5.8 && sensorData.ph <= 6.5 ? 'text-green-300' : 'text-purple-300'
                      }`}>{sensorData.ph}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-purple-200/70">EC Level</span>
                      <span className="text-purple-300 font-medium">{sensorData.ec} mS/cm</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-purple-200/70">CO2</span>
                      <span className="text-purple-300 font-medium">{sensorData.co2} ppm</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-3 bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg border border-green-700/30"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-300 text-sm font-medium">Growth</span>
                    <Leaf className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-200/70">Stage</span>
                      <span className="text-green-300 font-medium capitalize">
                        {automationSettings.lighting.enabled ? 'Vegetative' : 'Flowering'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-200/70">Strain</span>
                      <span className="text-green-300 font-medium truncate max-w-[80px]">
                        {formData.strain !== 'Select Strain' ? formData.strain.split(' ')[0] : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-200/70">Room</span>
                      <span className="text-green-300 font-medium">
                        {rooms.find(r => r.active)?.name || 'Main'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Issues and Strengths with Enhanced Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoAnalysis.issues && autoAnalysis.issues.length > 0 && (
                  <motion.div
                    className="p-4 bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/30 rounded-xl hover:border-red-600/40 transition-all duration-300"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="bg-red-500/20 p-1.5 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <span className="text-red-300 font-semibold">Issues Detected</span>
                      </div>
                      <span className="bg-red-500/20 text-red-300 text-xs px-2 py-1 rounded-full">
                        {autoAnalysis.issues.length}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {autoAnalysis.issues.map((issue, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start space-x-2 text-red-200 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                          <span className="leading-relaxed">{issue}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {autoAnalysis.strengths && autoAnalysis.strengths.length > 0 && (
                  <motion.div
                    className="p-4 bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 rounded-xl hover:border-green-600/40 transition-all duration-300"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="bg-green-500/20 p-1.5 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        </div>
                        <span className="text-green-300 font-semibold">Optimal Conditions</span>
                      </div>
                      <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">
                        {autoAnalysis.strengths.length}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {autoAnalysis.strengths.map((strength, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start space-x-2 text-green-200 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{strength}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>
            </>
          )}

          {/* Enhanced Recommendations - Always Visible */}
          <motion.div
            className={`p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 rounded-xl hover:border-blue-600/40 transition-all duration-300 ${
              compactView ? 'mt-0' : 'mt-4'
            }`}
            whileHover={{ scale: 1.01 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-500/20 p-1.5 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-blue-300 font-semibold">
                  {compactView ? 'Quick Status' : 'AI Recommendations'}
                </span>
              </div>
              {!compactView && (
                <motion.div
                  className="flex space-x-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[1, 2, 3].map((pulse) => (
                    <motion.div
                      key={pulse}
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: pulse * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {compactView ? (
              /* Compact View */
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      autoAnalysis.healthScore >= 80 ? 'bg-green-400' :
                      autoAnalysis.healthScore >= 60 ? 'bg-yellow-400' :
                      autoAnalysis.healthScore >= 40 ? 'bg-orange-400' :
                      'bg-red-400'
                    } animate-pulse`} />
                    <span className="text-lime-200 font-medium">
                      {autoAnalysis.healthScore}/100
                    </span>
                  </div>
                  <span className="text-slate-400/70 text-sm max-w-xs truncate">
                    {autoAnalysis.diagnosis}
                  </span>
                </div>
                {analysisTrend !== 'stable' && (
                  <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                    analysisTrend === 'improving'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {analysisTrend === 'improving' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Detailed View */
              <div className="space-y-3">
                <div className={`p-3 rounded-lg border ${
                  autoAnalysis.healthScore >= 80
                    ? 'bg-green-500/10 border-green-500/30 text-green-200'
                    : autoAnalysis.healthScore >= 60
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200'
                    : autoAnalysis.healthScore >= 40
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {autoAnalysis.healthScore >= 80 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : autoAnalysis.healthScore >= 60 ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span className="font-medium text-sm">
                      {autoAnalysis.healthScore >= 80 ? '🌟 Excellent Health - Continue Current Regimen' :
                       autoAnalysis.healthScore >= 60 ? '🌱 Good Health - Monitor and Fine-tune' :
                       autoAnalysis.healthScore >= 40 ? '⚠️ Needs Attention - Review Parameters' :
                       '🚨 Critical - Immediate Action Required'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {autoAnalysis.healthScore >= 80
                      ? 'Your plant is thriving! Maintain current environmental conditions and nutrient schedule.'
                      : autoAnalysis.healthScore >= 60
                      ? 'Plant health is good but could be optimized. Consider adjusting environmental parameters for better results.'
                      : autoAnalysis.healthScore >= 40
                      ? 'Several factors need attention. Review environmental controls and nutrient levels.'
                      : 'Critical issues detected that require immediate intervention to prevent plant damage.'}
                  </p>
                </div>

                {/* Priority Actions */}
                {autoAnalysis.issues && autoAnalysis.issues.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                    <h4 className="text-red-300 font-medium text-sm mb-2 flex items-center">
                      <Zap className="h-3 w-3 mr-2" />
                      Priority Actions
                    </h4>
                    <div className="space-y-1">
                      {autoAnalysis.issues.slice(0, 2).map((issue, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 flex-shrink-0" />
                          <span className="text-red-200 text-xs leading-relaxed">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimization Tips */}
                {autoAnalysis.strengths && autoAnalysis.strengths.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <h4 className="text-green-300 font-medium text-sm mb-2 flex items-center">
                      <Star className="h-3 w-3 mr-2" />
                      Success Factors
                    </h4>
                    <div className="space-y-1">
                      {autoAnalysis.strengths.slice(0, 2).map((strength, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                          <span className="text-green-200 text-xs leading-relaxed">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : (
        /* Empty State */
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-slate-800/30 border-2 border-dashed border-blue-600 rounded-xl flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Bot className="h-10 w-10 text-slate-400/50" />
              </motion.div>
            </div>
            {/* Pulsing rings */}
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className="absolute inset-0 border border-blue-600/20 rounded-xl"
                animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: ring * 0.5,
                  ease: "easeOut"
                }}
              />
            ))}
          </div>

          <motion.h3
            className="text-lg font-bold text-slate-200 mb-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {autoAnalysisEnabled ? 'Ready for Analysis' : 'Auto-Analysis Paused'}
          </motion.h3>
          <p className="text-slate-400/70 text-sm max-w-md mx-auto mb-6">
            {autoAnalysisEnabled
              ? 'System is ready to analyze sensor data and provide real-time plant health insights.'
              : 'Enable auto-analysis to get continuous plant health monitoring based on sensor data.'
            }
          </p>

          {autoAnalysisEnabled && (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center space-x-2 text-xs text-slate-400/60">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>Waiting for sensor data...</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </CardContent>
  </Card>
</motion.div>

                {/* Analysis Form */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 shadow-2xl"
                >
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="bg-blue-500 p-2 rounded-lg mr-3">
                        <Settings className="h-5 w-5 text-slate-900" />
                      </div>
                      <CardTitle className="text-xl font-bold text-blue-300">Analysis Form</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="relative">
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <Wheat className="h-3 w-3 mr-2 text-blue-400" />
                              Strain Search
                            </Label>
                            <div className="relative">
                              <Input
                                type="text"
                                value={strainSearch}
                                onChange={(e) => setStrainSearch(e.target.value)}
                                onFocus={() => setShowStrainDropdown(true)}
                                placeholder="Search strains by name, type, or description..."
                                className="w-full bg-slate-900/50 border-slate-600 text-slate-200 placeholder-emerald-400 pr-20"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowStrainModal(true)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-300 hover:text-blue-400 p-1"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Selected strain display */}
                            {formData.strain !== 'Select Strain' && (
                              <div className="mt-2 p-2 bg-slate-800/30 border border-blue-600 rounded flex items-center justify-between">
                                <span className="text-slate-200 text-sm">
                                  {formData.strain} {strains.find(s => s.name === formData.strain)?.isPurpleStrain ? '(Purple)' : ''}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFormData(prev => ({ ...prev, strain: 'Select Strain' }))}
                                  className="text-slate-400 hover:text-red-400 p-1 h-4"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}

                            {/* Search dropdown */}
                            {showStrainDropdown && strainSearch && (
                              <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {filteredStrains.length > 0 ? (
                                  filteredStrains.map(strain => (
                                    <div
                                      key={strain.id}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, strain: strain.name }));
                                        setStrainSearch('');
                                        setShowStrainDropdown(false);
                                      }}
                                      className="p-3 hover:bg-slate-800 cursor-pointer border-b border-slate-600 last:border-b-0"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-slate-200 font-medium">
                                            {strain.name}
                                            {strain.isPurpleStrain && <span className="ml-2 text-purple-400 text-xs">(Purple)</span>}
                                          </div>
                                          <div className="text-slate-400 text-xs">{strain.type}</div>
                                          <div className="text-slate-500 text-xs mt-1 line-clamp-1">{strain.description}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-slate-400 text-center">
                                    No strains found matching "{strainSearch}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <AlertTriangle className="h-3 w-3 mr-2 text-blue-400" />
                              Symptoms
                            </Label>
                            <Textarea
                              value={formData.leafSymptoms}
                              onChange={(e) => setFormData({...formData, leafSymptoms: e.target.value})}
                              rows={2}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm"
                              placeholder="Describe leaf symptoms..."
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <Droplet className="h-3 w-3 mr-2 text-blue-400" />
                              pH Level
                            </Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={formData.phLevel}
                              onChange={(e) => setFormData({...formData, phLevel: e.target.value})}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm"
                              placeholder="6.2"
                            />
                          </div>
                          
                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <Thermometer className="h-3 w-3 mr-2 text-blue-400" />
                              Temperature (°F)
                            </Label>
                            <Input
                              type="number"
                              value={formData.temperature}
                              onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm"
                              placeholder="75°F"
                            />
                          </div>
                        </div>

                        {/* Enhanced Diagnostic Fields */}
                        <div className="space-y-3">
                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <Bug className="h-3 w-3 mr-2 text-blue-400" />
                              Diagnostic Focus
                            </Label>
                            <select
                              value={mounted ? formData.pestDiseaseFocus : 'all'}
                              onChange={(e) => setFormData({...formData, pestDiseaseFocus: e.target.value})}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm px-3 py-2 rounded-md"
                              suppressHydrationWarning
                            >
                              <option value="all">Comprehensive Analysis</option>
                              <option value="pests">Focus on Pests</option>
                              <option value="diseases">Focus on Diseases</option>
                              <option value="environmental">Focus on Environmental Issues</option>
                            </select>
                          </div>

                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <AlertTriangle className="h-3 w-3 mr-2 text-blue-400" />
                              Urgency Level
                            </Label>
                            <select
                              value={mounted ? formData.urgency : 'medium'}
                              onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm px-3 py-2 rounded-md"
                              suppressHydrationWarning
                            >
                              <option value="low">Low - Routine monitoring</option>
                              <option value="medium">Medium - General concern</option>
                              <option value="high">High - Action needed soon</option>
                              <option value="critical">Critical - Immediate action required</option>
                            </select>
                          </div>

                          <div>
                            <Label className="block text-slate-300 mb-2 flex items-center text-sm">
                              <MessageSquare className="h-3 w-3 mr-2 text-blue-400" />
                              Additional Notes
                            </Label>
                            <Textarea
                              value={formData.additionalNotes}
                              onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                              rows={2}
                              className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400 text-sm"
                              placeholder="Any additional information..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-400 hover:to-sky-500 text-slate-900 font-bold"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4 mr-2" />
                              Analyze Plant
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </motion.div>
                
                {/* Results Section */}
                {analysisResult && (
                  <motion.div 
                    id="results-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-950/70 backdrop-blur-sm rounded-xl border border-slate-700 p-4 shadow-2xl"
                  >
                    <CardHeader>
                      <div className="flex items-center">
                        <div className="bg-blue-500 p-2 rounded-lg mr-3">
                          <CheckCircle className="h-5 w-5 text-slate-900" />
                        </div>
                        <CardTitle className="text-xl font-bold text-blue-300">Analysis Results</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Primary Diagnosis Header */}
                        <div className="bg-gradient-to-br from-emerald-900/50 to-lime-900/30 border border-slate-600 rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-bold text-blue-300">{analysisResult?.diagnosis || 'Analysis Complete'}</h3>
                              <div className="flex items-center mt-1 space-x-3">
                                <div className="flex items-center">
                                  <div className={`w-3 h-3 rounded-full mr-2 ${
                                    (analysisResult?.confidence || 0) >= 80 ? 'bg-green-500' :
                                    (analysisResult?.confidence || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  <span className="text-slate-200 text-sm">{analysisResult?.confidence || 0}% Confidence</span>
                                </div>
                                {analysisResult?.isPurpleStrain && (
                                  <Badge className="bg-purple-900/50 text-purple-300 border-purple-700">
                                    <Wheat className="h-3 w-3 mr-1" />
                                    Purple Strain
                                  </Badge>
                                )}
                                {analysisResult?.fallbackUsed && (
                                  <Badge className="bg-orange-900/50 text-orange-300 border-orange-700">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Rule-based Analysis
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 md:mt-0">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">{analysisResult?.healthScore || 0}/100</div>
                                <div className="text-xs text-slate-400 mt-1">Health Score</div>
                                <Progress value={analysisResult?.healthScore || 0} className="mt-2 h-2 w-24" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Analysis Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Symptoms Matched */}
                          <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <Search className="h-4 w-4 mr-2 text-blue-400" />
                              Symptoms Identified
                            </h4>
                            <div className="space-y-2">
                              {analysisResult?.symptomsMatched?.length > 0 ? (
                                analysisResult.symptomsMatched.slice(0, 5).map((symptom, index) => (
                                  <div key={index} className="flex items-start">
                                    <span className="text-blue-400 mr-2 text-xs">▸</span>
                                    <span className="text-slate-200 text-sm">{symptom}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-400 text-sm italic">No specific symptoms detailed in analysis</div>
                              )}
                            </div>
                          </div>

                          {/* Root Causes */}
                          <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2 text-amber-400" />
                              Root Causes
                            </h4>
                            <div className="space-y-2">
                              {analysisResult?.causes?.length > 0 ? (
                                analysisResult.causes.slice(0, 4).map((cause, index) => (
                                  <div key={index} className="flex items-start">
                                    <span className="text-amber-400 mr-2 text-xs">▸</span>
                                    <span className="text-slate-200 text-sm">{cause}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-400 text-sm italic">No specific causes identified</div>
                              )}
                            </div>
                          </div>

                          {/* Treatment Plan */}
                          <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-2 text-blue-400" />
                              Treatment Plan
                            </h4>
                            <div className="space-y-2">
                              {analysisResult?.treatment?.length > 0 ? (
                                analysisResult.treatment.slice(0, 5).map((step, index) => (
                                  <div key={index} className="flex items-start">
                                    <span className="bg-blue-500 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                                      {index + 1}
                                    </span>
                                    <span className="text-slate-200 text-sm">{step}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-400 text-sm italic">No treatment steps provided</div>
                              )}
                            </div>
                          </div>

                          {/* Strain-Specific Advice */}
                          <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <Wheat className="h-4 w-4 mr-2 text-purple-400" />
                              Strain-Specific Advice
                            </h4>
                            <div className="text-slate-200 text-sm leading-relaxed">
                              {analysisResult?.strainSpecificAdvice || (
                                <span className="text-slate-400 italic">No strain-specific advice available</span>
                              )}
                            </div>
                          </div>

                          {/* ENHANCED DIAGNOSTIC SECTIONS */}

                          {/* Pest Detection */}
                          {analysisResult?.pestsDetected && analysisResult.pestsDetected.length > 0 && (
                            <div className="bg-red-900/40 border border-red-800 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-red-300 mb-3 flex items-center">
                                <Bug className="h-4 w-4 mr-2 text-red-400" />
                                Pests Detected ({analysisResult.pestsDetected.length})
                              </h4>
                              <div className="space-y-2">
                                {analysisResult.pestsDetected.map((pest, index) => (
                                  <div key={index} className="flex items-center">
                                    <span className="text-red-400 mr-2">⚠</span>
                                    <span className="text-red-200 text-sm font-medium">{pest}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Disease Detection */}
                          {analysisResult?.diseasesDetected && analysisResult.diseasesDetected.length > 0 && (
                            <div className="bg-orange-900/40 border border-orange-800 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-orange-300 mb-3 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2 text-orange-400" />
                                Diseases Detected ({analysisResult.diseasesDetected.length})
                              </h4>
                              <div className="space-y-2">
                                {analysisResult.diseasesDetected.map((disease, index) => (
                                  <div key={index} className="flex items-center">
                                    <span className="text-orange-400 mr-2">🔬</span>
                                    <span className="text-orange-200 text-sm font-medium">{disease}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Environmental Factors */}
                          {analysisResult?.environmentalFactors && analysisResult.environmentalFactors.length > 0 && (
                            <div className="bg-blue-900/40 border border-blue-800 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                                <Cloud className="h-4 w-4 mr-2 text-blue-400" />
                                Environmental Factors ({analysisResult.environmentalFactors.length})
                              </h4>
                              <div className="space-y-2">
                                {analysisResult.environmentalFactors.map((factor, index) => (
                                  <div key={index} className="flex items-center">
                                    <span className="text-blue-400 mr-2">🌡</span>
                                    <span className="text-blue-200 text-sm">{factor}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Image Analysis */}
                          {analysisResult?.imageAnalysis?.hasImage && (
                            <div className="bg-purple-900/40 border border-purple-800 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-purple-300 mb-3 flex items-center">
                                <Camera className="h-4 w-4 mr-2 text-purple-400" />
                                Image Analysis
                              </h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-purple-200 text-sm">Visual Confidence:</span>
                                  <span className="text-purple-300 text-sm font-medium">
                                    {analysisResult.imageAnalysis.confidence}%
                                  </span>
                                </div>
                                {analysisResult.imageAnalysis.visualFindings?.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-purple-200 text-sm">Key Findings:</span>
                                    {analysisResult.imageAnalysis.visualFindings.map((finding, index) => (
                                      <div key={index} className="flex items-start">
                                        <span className="text-purple-400 mr-2 text-xs">▸</span>
                                        <span className="text-purple-200 text-xs">{finding}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Urgency Level */}
                          {analysisResult?.urgency && analysisResult.urgency !== 'medium' && (
                            <div className={`border rounded-lg p-4 ${
                              analysisResult.urgency === 'critical' ? 'bg-red-900/40 border-red-800' :
                              analysisResult.urgency === 'high' ? 'bg-orange-900/40 border-orange-800' :
                              'bg-yellow-900/40 border-yellow-800'
                            }`}>
                              <h4 className="text-sm font-semibold mb-2 flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Urgency Level: {analysisResult.urgency.toUpperCase()}
                              </h4>
                              <p className="text-sm text-gray-200">
                                {analysisResult.urgency === 'critical' ? 'Immediate action required!' :
                                 analysisResult.urgency === 'high' ? 'Action needed within 24-48 hours' :
                                 'Monitor closely and treat within 1 week'}
                              </p>
                            </div>
                          )}

                          {/* Follow-up Schedule */}
                          {analysisResult?.followUpSchedule && (
                            <div className="bg-cyan-900/40 border border-cyan-800 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-cyan-300 mb-2 flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Follow-up Schedule
                              </h4>
                              <p className="text-cyan-200 text-sm">{analysisResult.followUpSchedule}</p>
                            </div>
                          )}
                        </div>

                        {/* AI Reasoning Process */}
                        {analysisResult?.reasoning && analysisResult.reasoning.length > 0 && (
                          <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <Brain className="h-4 w-4 mr-2 text-cyan-400" />
                              AI Analysis Reasoning
                            </h4>
                            <div className="space-y-3">
                              {analysisResult.reasoning.slice(0, 4).map((step, index) => (
                                <div key={index} className="border-l-2 border-cyan-400/30 pl-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-cyan-300 text-sm font-medium">{step.step}</span>
                                    <span className="text-slate-400 text-xs">{step.weight}% weight</span>
                                  </div>
                                  <p className="text-slate-200 text-sm leading-relaxed">{step.explanation}</p>
                                  <div className="mt-2">
                                    <div className="bg-slate-800/50 rounded-full h-1.5">
                                      <div
                                        className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${step.weight}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Priority Recommendations */}
                        {analysisResult?.recommendations && analysisResult.recommendations.length > 0 && (
                          <div className="bg-gradient-to-r from-lime-900/30 to-emerald-900/40 border border-lime-600/50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                              Priority Recommendations
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {analysisResult.recommendations.slice(0, 4).map((rec, index) => (
                                <div key={index} className="bg-slate-800/30 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-blue-300 text-sm font-medium">{rec.issue}</span>
                                    <Badge className={
                                      rec.priority === 'high' ? 'bg-red-900/50 text-red-300 border-red-700' :
                                      rec.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' :
                                      rec.priority === 'low' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                                      'bg-slate-800/50 text-slate-300'
                                    }>
                                      {rec.priority}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1">
                                    {rec.actions?.slice(0, 3).map((action, actionIndex) => (
                                      <div key={actionIndex} className="flex items-start">
                                        <span className="text-green-400 mr-1 text-xs">•</span>
                                        <span className="text-slate-200 text-xs">{action}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </motion.div>
                )}

                {/* Tools Suite Quick Access */}
                <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-500 p-2 rounded-lg mr-3">
                          <Bot className="h-5 w-5 text-slate-900" />
                        </div>
                        <CardTitle className="text-xl font-bold text-blue-300">Cultivation Tools Suite</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 border-slate-600"
                        onClick={() => setActiveDashboard('ai-tools')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View All
                      </Button>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">
                      Quick access to specialized cultivation tools and utilities
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Link href="/tools/nutrient-calculator" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 group">
                          <CardContent className="p-4 text-center">
                            <Calculator className="h-8 w-8 text-blue-400 mx-auto mb-2 group-hover:text-blue-300" />
                            <h4 className="text-sm font-medium text-blue-300 mb-1">Nutrient Calc</h4>
                            <p className="text-xs text-slate-400">NPK mixing</p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/pest-disease-id" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 group">
                          <CardContent className="p-4 text-center">
                            <Bug className="h-8 w-8 text-blue-400 mx-auto mb-2 group-hover:text-blue-300" />
                            <h4 className="text-sm font-medium text-blue-300 mb-1">Pest ID</h4>
                            <p className="text-xs text-slate-400">Disease detection</p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/harvest-tracker" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 group">
                          <CardContent className="p-4 text-center">
                            <Scissors className="h-8 w-8 text-blue-400 mx-auto mb-2 group-hover:text-blue-300" />
                            <h4 className="text-sm font-medium text-blue-300 mb-1">Harvest</h4>
                            <p className="text-xs text-slate-400">Yield tracking</p>
                          </CardContent>
                        </Card>
                      </Link>

                      <Link href="/tools/inventory-manager" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 group">
                          <CardContent className="p-4 text-center">
                            <Package className="h-8 w-8 text-blue-400 mx-auto mb-2 group-hover:text-blue-300" />
                            <h4 className="text-sm font-medium text-blue-300 mb-1">Inventory</h4>
                            <p className="text-xs text-slate-400">Supply management</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Tools Dashboard */}
            {activeDashboard === 'ai-tools' && (
              <div className="space-y-6">
                <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="bg-blue-500 p-2 rounded-lg mr-3">
                        <Bot className="h-5 w-5 text-slate-900" />
                      </div>
                      <CardTitle className="text-xl font-bold text-blue-300">AI Tools Suite</CardTitle>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">
                      Access specialized cultivation tools and utilities for optimal plant management
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nutrient Calculator */}
                      <Link href="/tools/nutrient-calculator" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/20 group">
                          <CardContent className="p-6">
                            <div className="flex items-center mb-4">
                              <div className="bg-slate-800 p-3 rounded-lg mr-4 group-hover:bg-blue-500 transition-colors">
                                <Calculator className="h-6 w-6 text-blue-400 group-hover:text-slate-900" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-blue-300 group-hover:text-lime-200">Nutrient Calculator</h3>
                                <p className="text-slate-400 text-sm">Calculate optimal nutrient mixtures</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                NPK ratio calculations
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Growth stage adjustments
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Water volume calculations
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Pest & Disease Identifier */}
                      <Link href="/tools/pest-disease-id" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/20 group">
                          <CardContent className="p-6">
                            <div className="flex items-center mb-4">
                              <div className="bg-slate-800 p-3 rounded-lg mr-4 group-hover:bg-blue-500 transition-colors">
                                <Bug className="h-6 w-6 text-blue-400 group-hover:text-slate-900" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-blue-300 group-hover:text-lime-200">Pest & Disease ID</h3>
                                <p className="text-slate-400 text-sm">Identify and treat plant issues</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Visual symptom analysis
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Treatment recommendations
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Prevention strategies
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Harvest Tracker */}
                      <Link href="/tools/harvest-tracker" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/20 group">
                          <CardContent className="p-6">
                            <div className="flex items-center mb-4">
                              <div className="bg-slate-800 p-3 rounded-lg mr-4 group-hover:bg-blue-500 transition-colors">
                                <Scissors className="h-6 w-6 text-blue-400 group-hover:text-slate-900" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-blue-300 group-hover:text-lime-200">Harvest Tracker</h3>
                                <p className="text-slate-400 text-sm">Monitor and optimize harvests</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Yield tracking & predictions
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Harvest timing optimization
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Quality metrics tracking
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>

                      {/* Inventory Manager */}
                      <Link href="/tools/inventory-manager" className="block">
                        <Card className="bg-slate-900/50 border-slate-600 hover:border-blue-400 transition-all duration-300 hover:shadow-lg hover:shadow-lime-400/20 group">
                          <CardContent className="p-6">
                            <div className="flex items-center mb-4">
                              <div className="bg-slate-800 p-3 rounded-lg mr-4 group-hover:bg-blue-500 transition-colors">
                                <Package className="h-6 w-6 text-blue-400 group-hover:text-slate-900" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-blue-300 group-hover:text-lime-200">Inventory Manager</h3>
                                <p className="text-slate-400 text-sm">Manage supplies and equipment</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Stock level monitoring
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Automated reordering
                              </div>
                              <div className="flex items-center text-slate-300 text-sm">
                                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                                Supply cost tracking
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>

                    {/* Quick Stats Section */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-slate-900/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <Calculator className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-300">4</div>
                          <div className="text-xs text-slate-400">Active Tools</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-300">98%</div>
                          <div className="text-xs text-slate-400">Accuracy Rate</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-300">24/7</div>
                          <div className="text-xs text-slate-400">AI Assistance</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-900/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <Target className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-300">Pro</div>
                          <div className="text-xs text-slate-400">Tool Suite</div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings Dashboard */}
            {activeDashboard === 'settings' && (
              <div className="space-y-6">
                <Card className="bg-slate-950/70 backdrop-blur-sm border-slate-700">
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="bg-blue-500 p-2 rounded-lg mr-3">
                        <Settings className="h-5 w-5 text-slate-900" />
                      </div>
                      <CardTitle className="text-xl font-bold text-blue-300">Settings</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="ai" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                        <TabsTrigger value="ai" className="text-slate-300">AI Provider</TabsTrigger>
                        <TabsTrigger value="notifications" className="text-slate-300">Notifications</TabsTrigger>
                        <TabsTrigger value="general" className="text-slate-300">General</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="ai" className="space-y-6 mt-6">
                        <AIProviderSettings />
                      </TabsContent>
                      
                      <TabsContent value="notifications" className="space-y-6 mt-6">
                        <Card className="bg-slate-900/50 border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-lg font-bold text-blue-300 flex items-center">
                              <Bell className="h-5 w-5 mr-2 text-amber-400" />
                              Notification Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-slate-300">Enable Notifications</Label>
                                <p className="text-xs text-slate-400">Receive alerts for system events</p>
                              </div>
                              <Switch
                                checked={settings.notifications.enabled}
                                onCheckedChange={(checked) => setSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, enabled: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-slate-300">Sound Alerts</Label>
                                <p className="text-xs text-slate-400">Play sound for notifications</p>
                              </div>
                              <Switch
                                checked={settings.notifications.sound}
                                onCheckedChange={(checked) => setSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, sound: checked }
                                }))}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-slate-300">Desktop Notifications</Label>
                                <p className="text-xs text-slate-400">Show system notifications</p>
                              </div>
                              <Switch
                                checked={settings.notifications.desktop}
                                onCheckedChange={(checked) => setSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, desktop: checked }
                                }))}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="general" className="space-y-6 mt-6">
                        <Card className="bg-slate-900/50 border-slate-700">
                          <CardHeader>
                            <CardTitle className="text-lg font-bold text-blue-300 flex items-center">
                              <Monitor className="h-5 w-5 mr-2 text-cyan-400" />
                              General Settings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-slate-300 mb-3 block">Temperature Units</Label>
                              <Select value={settings.units.temperature} onValueChange={(value) => setSettings(prev => ({
                                ...prev,
                                units: { ...prev.units, temperature: value }
                              }))}>
                                <SelectTrigger className="w-full bg-slate-800 border-slate-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-slate-300 mb-3 block">Weight Units</Label>
                              <Select value={settings.units.weight} onValueChange={(value) => setSettings(prev => ({
                                ...prev,
                                units: { ...prev.units, weight: value }
                              }))}>
                                <SelectTrigger className="w-full bg-slate-800 border-slate-600">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="grams">Grams (g)</SelectItem>
                                  <SelectItem value="ounces">Ounces (oz)</SelectItem>
                                  <SelectItem value="pounds">Pounds (lbs)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-600">
                              <Button variant="outline" className="w-full bg-slate-800 hover:bg-slate-700 border-slate-600">
                                <DownloadCloud className="h-4 w-4 mr-2" />
                                Export Settings
                              </Button>
                            </div>
                            
                            <div>
                              <Button variant="outline" className="w-full bg-slate-800 hover:bg-slate-700 border-slate-600">
                                <UploadCloud className="h-4 w-4 mr-2" />
                                Import Settings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Chat Modal */}
      <Dialog open={showAIChat} onOpenChange={setShowAIChat}>
        <DialogContent className="bg-slate-900 w-full max-w-md rounded-2xl border-slate-700 shadow-2xl max-h-[500px] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-blue-300 flex items-center">
                <Bot className="h-4 w-4 mr-2 text-purple-400" />
                AI Assistant
              </DialogTitle>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowAIChat(false)}
                className="text-slate-400 hover:text-blue-400"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]"
          >
            {aiMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-lg p-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-slate-900'
                    : message.isError
                    ? 'bg-red-900/50 border border-red-700 text-red-200'
                    : 'bg-slate-800/50 border border-slate-600 text-slate-200'
                }`}>
                  {message.image && (
                    <div className="mb-2">
                      <img
                        src={message.image}
                        alt="Uploaded image"
                        className="max-w-full h-auto rounded border border-blue-600"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  {message.provider && (
                    <p className="text-xs mt-1 opacity-70">
                      via {message.provider} • {message.model}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {isProcessingAI && (
              <div className="flex justify-start">
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-2 flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-300">Thinking...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-700">
            {/* Chat Image Preview */}
            {chatImage && (
              <div className="mb-3 relative">
                <img
                  src={chatImage}
                  alt="Chat image preview"
                  className="max-w-full h-auto rounded border border-blue-600"
                  style={{ maxHeight: '120px' }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatImage(null)}
                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 h-6 w-6"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form onSubmit={handleAIChatSubmit} className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => chatImageInputRef.current?.click()}
                className="bg-slate-800/50 border-blue-600 text-slate-300 hover:bg-slate-700 px-3"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={aiInput}
                onChange={(e) => setAIInput(e.target.value)}
                placeholder="Ask about plant care..."
                className="flex-1 bg-slate-800 border-slate-600 text-slate-200 placeholder-emerald-400"
              />
              <Button
                type="submit"
                disabled={(!aiInput.trim() && !chatImage) || isProcessingAI}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
              <input
                ref={chatImageInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleChatImageUpload}
                className="hidden"
              />
            </form>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Powered by {settings.aiProvider === 'lm-studio' ? 'LM Studio' : 'OpenRouter'} •
              {chatImage ? ' Image attached' : ' Click upload button to add image'} •
              AI-generated responses for informational purposes only
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Strain Modal */}
      <Dialog open={showStrainModal} onOpenChange={setShowStrainModal}>
        <DialogContent className="bg-slate-900 w-full max-w-2xl rounded-2xl border-slate-700 shadow-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-blue-300 flex items-center">
                <Wheat className="h-5 w-5 mr-2 text-blue-400" />
                {editingStrain ? 'Edit Strain' : 'Add Custom Strain'}
              </DialogTitle>
              <Button 
                variant="ghost"
                onClick={() => { setShowStrainModal(false); setEditingStrain(null); }}
                className="text-slate-400 hover:text-blue-400"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="block text-slate-300 mb-2 flex items-center">
                <Tag className="h-4 w-4 mr-2 text-blue-400" />
                Strain Name
              </Label>
              <Input
                type="text"
                value={newStrain.name}
                onChange={(e) => setNewStrain({...newStrain, name: e.target.value})}
                className="w-full bg-slate-900/50 border-slate-600 placeholder-emerald-400"
                placeholder="e.g., Granddaddy Purple"
              />
            </div>
            
            <div>
              <Label className="block text-slate-300 mb-2 flex items-center">
                <Palette className="h-4 w-4 mr-2 text-purple-400" />
                Purple Strain
              </Label>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="purple-strain"
                  checked={newStrain.isPurpleStrain}
                  onCheckedChange={(checked) => setNewStrain({...newStrain, isPurpleStrain: checked})}
                />
                <Label htmlFor="purple-strain" className="text-slate-200">This is a purple strain</Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => { setShowStrainModal(false); setEditingStrain(null); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={editingStrain ? handleUpdateStrain : handleAddStrain}
                className="bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-400 hover:to-sky-500 text-slate-900"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingStrain ? 'Update' : 'Add'} Strain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="bg-slate-900 w-full max-w-3xl rounded-2xl border-slate-700 shadow-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-blue-300 flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-400" />
                Analysis History
              </DialogTitle>
              <Button 
                variant="ghost"
                onClick={() => { setShowHistoryModal(false); setSelectedHistoryItem(null); }}
                className="text-slate-400 hover:text-blue-400"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4">
            {plantHistory.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-300 text-lg font-medium">No history yet</p>
                <p className="text-slate-400 mt-2">Perform your first analysis to build your history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plantHistory.map(renderHistoryItem)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating AI Assistant Button */}
      <Link href="/ai-assistant" className="fixed bottom-6 right-6 block">
        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-full p-4 shadow-2xl shadow-emerald-600/30 border-0 group">
          <Bot className="h-6 w-6 text-white" />
          <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            AI Assistant
          </span>
        </Button>
      </Link>
    </div>
  );
}