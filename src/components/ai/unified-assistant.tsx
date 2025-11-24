'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  SendHorizontal,
  Minimize2,
  Maximize2,
  X,
  MessageSquare,
  Sparkles,
  Leaf,
  Droplets,
  Thermometer,
  Sun,
  Eye,
  Camera,
  AlertCircle,
  CheckCircle,
  Brain,
  Calendar,
  BookOpen,
  Target,
  Lightbulb,
  Search,
  Settings,
  TrendingUp,
  Bug,
  Beaker,
  Package,
  ChevronDown,
  Grid3x3,
  Star,
  Clock,
  Zap,
  Shield,
  Activity,
  Heart,
  Timer,
  CameraOff,
  Image,
  History,
  Pin,
  PinOff,
  Hash,
  Info,
  AlertTriangle,
  ChevronRight,
  Play,
  ThumbsDown,
  ThumbsUp
} from 'lucide-react';
import { enhancedAgentEvolver } from '@/lib/agent-evolver-enhanced';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'agentic';
  content: string;
  timestamp: Date;
  context?: any;
  thinking?: string;
  studyPlan?: StudyPlan;
  multiQuiz?: MultiQuiz;
  isSuggestion?: boolean;
  messageType?: 'analysis' | 'recommendation' | 'alert' | 'diagnosis' | 'general' | 'proactive' | 'prediction' | 'autonomous';
  confidence?: number;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  image?: string;
  actionPlan?: ActionPlan;
  autonomousAction?: AutonomousAction;
  patternAnalysis?: PatternAnalysis;
}

interface StudyPlan {
  title: string;
  duration: string;
  objectives: string[];
  dailyTopics: { day: number; topic: string; activities: string[] }[];
}

interface MultiQuiz {
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    userAnswerIndex?: number;
  }[];
}

interface PageContext {
  page: string;
  title: string;
  data?: any;
  sensorData?: any;
}

interface PageSnapshot {
  url: string;
  title: string;
  scrollY: number;
  viewport: { width: number; height: number };
  activeElement?: string;
  lastClickText?: string;
  lastClickTag?: string;
  lastClickId?: string;
  recentEvents?: string[];
  timestamp: number;
}

interface PlantContext {
  strain: string;
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'harvest';
  age: number; // days
  environment: {
    temperature: number;
    humidity: number;
    ph: number;
    ec: number;
    lightHours: number;
    co2?: number;
  };
  lastAnalysis?: {
    healthScore: number;
    issues: string[];
    recommendations: string[];
    timestamp: Date;
  };
}

interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  mode: ChatMode;
  color: string;
}

// Agentic interfaces
interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  steps: ActionStep[];
  estimatedTime: string;
  resources: string[];
  contingencies: string[];
}

interface ActionStep {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'adjustment' | 'monitoring' | 'intervention' | 'observation';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimatedDuration: string;
  dependencies?: string[];
}

interface AutonomousAction {
  id: string;
  type: 'environment_adjustment' | 'monitoring' | 'alert' | 'recommendation' | 'automation';
  title: string;
  description: string;
  executed: boolean;
  scheduledTime?: Date;
  result?: any;
  impact: 'low' | 'medium' | 'high';
}

interface PatternAnalysis {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  implications: string[];
  recommendations: string[];
  data: any;
}

interface AgenticContext {
  plantData: PlantContext;
  environmentalHistory: EnvironmentalData[];
  userPreferences: UserPreferences;
  systemCapabilities: SystemCapabilities;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

interface EnvironmentalData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  co2?: number;
  lightIntensity?: number;
  vpd?: number;
}

interface UserPreferences {
  automationLevel: 'manual' | 'semi' | 'full';
  notificationFrequency: 'minimal' | 'normal' | 'frequent';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredStrains: string[];
  goals: string[];
}

interface SystemCapabilities {
  environmentalControls: boolean;
  irrigationSystem: boolean;
  lightingControl: boolean;
  monitoringSensors: string[];
  automationEnabled: boolean;
}

interface AgenticTrigger {
  id: string;
  type: 'threshold' | 'pattern' | 'schedule' | 'anomaly' | 'prediction';
  condition: any;
  action: string;
  enabled: boolean;
  lastTriggered?: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  category: 'Harvest' | 'Nutrients' | 'Health' | 'Genetics' | 'General';
  messages: Message[];
  timestamp: Date;
  isPinned: boolean;
  plantContext?: PlantContext;
}

type ChatMode =
  | 'chat'
  | 'thinking'
  | 'study-plan'
  | 'quiz'
  | 'research'
  | 'troubleshoot'
  | 'analysis'
  | 'diagnosis'
  | 'recommendation'
  | 'trichome'
  | 'harvest'
  | 'autonomous'
  | 'proactive'
  | 'predictive'
  | 'planner'
  | 'monitor';

interface UnifiedAIAssistantProps {
  initialContext?: PageContext;
  className?: string;
}

const modeCategories = {
  'General': {
    modes: ['chat', 'thinking'],
    icon: <MessageSquare className="h-4 w-4" />
  },
  'Planning': {
    modes: ['study-plan', 'quiz', 'research', 'planner'],
    icon: <Calendar className="h-4 w-4" />
  },
  'Analysis': {
    modes: ['analysis', 'diagnosis', 'troubleshoot'],
    icon: <Search className="h-4 w-4" />
  },
  'Specialized': {
    modes: ['recommendation', 'trichome', 'harvest'],
    icon: <Target className="h-4 w-4" />
  },
  'Agentic': {
    modes: ['autonomous', 'proactive', 'predictive', 'monitor'],
    icon: <Brain className="h-4 w-4" />
  }
};

const allModes: Record<ChatMode, { name: string; icon: React.ReactNode; description: string; color: string }> = {
  chat: { name: 'Chat', icon: <MessageSquare className="h-4 w-4" />, description: 'General conversation', color: 'from-blue-600 to-cyan-600' },
  thinking: { name: 'Deep Analysis', icon: <Brain className="h-4 w-4" />, description: 'Thorough reasoning', color: 'from-purple-600 to-pink-600' },
  'study-plan': { name: 'Growth Plan', icon: <Calendar className="h-4 w-4" />, description: 'Create cultivation schedule', color: 'from-green-600 to-emerald-600' },
  quiz: { name: 'Quiz', icon: <Target className="h-4 w-4" />, description: 'Test your knowledge', color: 'from-orange-600 to-red-600' },
  research: { name: 'Research', icon: <Search className="h-4 w-4" />, description: 'Scientific analysis', color: 'from-indigo-600 to-blue-600' },
  troubleshoot: { name: 'Troubleshoot', icon: <Settings className="h-4 w-4" />, description: 'Problem solving', color: 'from-slate-600 to-gray-600' },
  analysis: { name: 'Plant Analysis', icon: <Bug className="h-4 w-4" />, description: 'Analyze plant health', color: 'from-emerald-600 to-teal-600' },
  diagnosis: { name: 'Diagnosis', icon: <AlertCircle className="h-4 w-4" />, description: 'Diagnose problems', color: 'from-red-600 to-orange-600' },
  recommendation: { name: 'Growing Advice', icon: <TrendingUp className="h-4 w-4" />, description: 'Get recommendations', color: 'from-blue-600 to-purple-600' },
  trichome: { name: 'Trichome', icon: <Beaker className="h-4 w-4" />, description: 'Trichome analysis', color: 'from-amber-600 to-yellow-600' },
  harvest: { name: 'Harvest', icon: <Package className="h-4 w-4" />, description: 'Harvest planning', color: 'from-green-600 to-lime-600' },
  autonomous: { name: 'Autonomous', icon: <Zap className="h-4 w-4" />, description: 'AI-powered automation', color: 'from-violet-600 to-purple-600' },
  proactive: { name: 'Proactive', icon: <Activity className="h-4 w-4" />, description: 'Proactive monitoring', color: 'from-cyan-600 to-blue-600' },
  predictive: { name: 'Predictive', icon: <TrendingUp className="h-4 w-4" />, description: 'Predictive analysis', color: 'from-orange-600 to-red-600' },
  planner: { name: 'Planner', icon: <Calendar className="h-4 w-4" />, description: 'Strategic planning', color: 'from-green-600 to-emerald-600' },
  monitor: { name: 'Monitor', icon: <Eye className="h-4 w-4" />, description: 'Continuous monitoring', color: 'from-blue-600 to-indigo-600' }
};

const quickActions: QuickAction[] = [
  {
    id: 'analyze-plant',
    name: 'Analyze Plant',
    description: 'Check plant health and identify issues',
    icon: <Bug className="h-4 w-4" />,
    mode: 'analysis',
    color: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'check-issues',
    name: 'Check Issues',
    description: 'Identify problems and solutions',
    icon: <AlertTriangle className="h-4 w-4" />,
    mode: 'diagnosis',
    color: 'from-red-600 to-orange-600'
  },
  {
    id: 'nutrient-advice',
    name: 'Nutrient Advice',
    description: 'Get feeding recommendations',
    icon: <Beaker className="h-4 w-4" />,
    mode: 'recommendation',
    color: 'from-blue-600 to-purple-600'
  },
  {
    id: 'growth-tips',
    name: 'Growth Tips',
    description: 'Optimize growing conditions',
    icon: <TrendingUp className="h-4 w-4" />,
    mode: 'recommendation',
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'harvest-ready',
    name: 'Harvest Ready?',
    description: 'Check harvest readiness',
    icon: <Package className="h-4 w-4" />,
    mode: 'harvest',
    color: 'from-green-600 to-lime-600'
  },
  {
    id: 'autonomous-check',
    name: 'Autonomous Check',
    description: 'Run comprehensive autonomous analysis',
    icon: <Zap className="h-4 w-4" />,
    mode: 'autonomous',
    color: 'from-violet-600 to-purple-600'
  },
  {
    id: 'proactive-scan',
    name: 'Proactive Scan',
    description: 'Scan for potential issues and improvements',
    icon: <Activity className="h-4 w-4" />,
    mode: 'proactive',
    color: 'from-cyan-600 to-blue-600'
  },
  {
    id: 'predict-health',
    name: 'Predict Health',
    description: 'Analyze trends and predict future outcomes',
    icon: <TrendingUp className="h-4 w-4" />,
    mode: 'predictive',
    color: 'from-orange-600 to-red-600'
  }
];

export default function UnifiedAIAssistant({
  initialContext,
  className = ""
}: UnifiedAIAssistantProps) {
  const createPageSnapshot = useCallback((extras: Partial<PageSnapshot> = {}): PageSnapshot => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        url: '',
        title: '',
        scrollY: 0,
        viewport: { width: 0, height: 0 },
        timestamp: Date.now(),
        ...extras
      };
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const baseSnapshot: PageSnapshot = {
      url: window.location.href,
      title: document.title,
      scrollY: window.scrollY,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      activeElement: activeElement?.tagName?.toLowerCase(),
      timestamp: Date.now(),
      ...extras
    };

    return baseSnapshot;
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<PageContext>(initialContext || {
    page: 'unknown',
    title: 'CannaAI Pro'
  });
  const [pageSnapshot, setPageSnapshot] = useState<PageSnapshot>(() => createPageSnapshot());
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [showModeSelector, setShowModeSelector] = useState(false);

  // New feature states
  const [plantContext, setPlantContext] = useState<PlantContext>({
    strain: 'Unknown',
    growthStage: 'vegetative',
    age: 0,
    environment: {
      temperature: 25,
      humidity: 60,
      ph: 6.2,
      ec: 1.2,
      lightHours: 18
    }
  });
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Agentic states
  const [agenticContext, setAgenticContext] = useState<AgenticContext>({
    plantData: {
      strain: 'Unknown',
      growthStage: 'vegetative',
      age: 0,
      environment: {
        temperature: 25,
        humidity: 60,
        ph: 6.2,
        ec: 1.2,
        lightHours: 18
      }
    },
    environmentalHistory: [],
    userPreferences: {
      automationLevel: 'semi',
      notificationFrequency: 'normal',
      riskTolerance: 'moderate',
      preferredStrains: [],
      goals: []
    },
    systemCapabilities: {
      environmentalControls: true,
      irrigationSystem: true,
      lightingControl: true,
      monitoringSensors: ['temperature', 'humidity', 'ph', 'ec'],
      automationEnabled: true
    },
    riskTolerance: 'moderate'
  });
  const [agenticTriggers, setAgenticTriggers] = useState<AgenticTrigger[]>([]);
  const [autonomousActions, setAutonomousActions] = useState<AutonomousAction[]>([]);
  const [proactiveAlerts, setProactiveAlerts] = useState<Message[]>([]);
  const [agenticEnabled, setAgenticEnabled] = useState(true);
  const [environmentalHistory, setEnvironmentalHistory] = useState<EnvironmentalData[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Update context based on current page
  const updateContext = (newContext: PageContext) => {
    setContext(newContext);
  };

  // Make this function available globally
  useEffect(() => {
    (window as any).updateAIContext = updateContext;
    return () => {
      delete (window as any).updateAIContext;
    };
  }, []);

  // Page snapshot and event tracking
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const updateSnapshot = (extrasBuilder?: (prev: PageSnapshot) => Partial<PageSnapshot>) => {
      setPageSnapshot(prev => {
        const extras = extrasBuilder ? extrasBuilder(prev) : {};
        const recentEvents = extras.recentEvents ?? prev.recentEvents ?? [];
        return createPageSnapshot({ ...extras, recentEvents });
      });
    };

    const handleScroll = () => updateSnapshot();
    const handleVisibilityChange = () => updateSnapshot();
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      updateSnapshot(prev => {
        const newEvent = `click:${target.tagName.toLowerCase()}#${target.id || ''}:${target.innerText?.trim().slice(0, 60) || ''}`;
        const nextEvents = [
          newEvent,
          ...(prev.recentEvents || []).slice(0, 4)
        ];
        return {
          lastClickText: target.innerText?.trim().slice(0, 120),
          lastClickTag: target.tagName.toLowerCase(),
          lastClickId: target.id || undefined,
          recentEvents: nextEvents
        };
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleClick);
    };
  }, [createPageSnapshot]);

  // ===== AGENTIC FUNCTIONALITY =====

  // Autonomous monitoring and analysis
  useEffect(() => {
    if (!agenticEnabled || !isOpen) return;

    const interval = setInterval(() => {
      performAutonomousAnalysis();
      checkAgenticTriggers();
      updateEnvironmentalHistory();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [agenticEnabled, isOpen, agenticContext, plantContext, environmentalHistory, agenticTriggers]);

  // Update plant context from sensor data
  useEffect(() => {
    if (context?.sensorData) {
      const updatedPlantContext = {
        ...plantContext,
        environment: {
          ...plantContext.environment,
          temperature: context.sensorData.temperature || plantContext.environment.temperature,
          humidity: context.sensorData.humidity || plantContext.environment.humidity,
          ph: context.sensorData.ph || plantContext.environment.ph,
          ec: context.sensorData.ec || plantContext.environment.ec,
          co2: context.sensorData.co2 || plantContext.environment.co2
        }
      };
      setPlantContext(updatedPlantContext);
      setAgenticContext(prev => ({
        ...prev,
        plantData: updatedPlantContext
      }));
    }
  }, [context?.sensorData]);

  // Perform autonomous analysis
  const performAutonomousAnalysis = () => {
    const currentEnv = plantContext.environment;
    const issues = analyzeEnvironmentalConditions(currentEnv);

    if (issues.length > 0) {
      generateProactiveAlerts(issues);
    }

    // Check for patterns
    detectPatterns();

    // Update last analysis time
    setLastAnalysis(new Date());
  };

  // Analyze environmental conditions for issues
  const analyzeEnvironmentalConditions = (env: PlantContext['environment']) => {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      recommendation: string;
    }> = [];

    // Temperature analysis
    if (env.temperature < 18) {
      issues.push({
        type: 'temperature_low',
        severity: 'high',
        message: `Temperature too low: ${env.temperature}°C`,
        recommendation: 'Increase temperature to 22-26°C for optimal growth'
      });
    } else if (env.temperature > 30) {
      issues.push({
        type: 'temperature_high',
        severity: 'critical',
        message: `Temperature too high: ${env.temperature}°C`,
        recommendation: 'Reduce temperature immediately to prevent heat stress'
      });
    }

    // Humidity analysis
    if (env.humidity < 40) {
      issues.push({
        type: 'humidity_low',
        severity: 'medium',
        message: `Humidity too low: ${env.humidity}%`,
        recommendation: 'Increase humidity to 50-60% for optimal transpiration'
      });
    } else if (env.humidity > 70) {
      issues.push({
        type: 'humidity_high',
        severity: 'high',
        message: `Humidity too high: ${env.humidity}%`,
        recommendation: 'Reduce humidity to prevent mold and mildew'
      });
    }

    // pH analysis
    if (env.ph < 5.5) {
      issues.push({
        type: 'ph_low',
        severity: 'high',
        message: `pH too low: ${env.ph}`,
        recommendation: 'Adjust pH to 6.0-6.5 for optimal nutrient uptake'
      });
    } else if (env.ph > 7.0) {
      issues.push({
        type: 'ph_high',
        severity: 'medium',
        message: `pH too high: ${env.ph}`,
        recommendation: 'Lower pH to 6.0-6.5 range'
      });
    }

    // EC analysis
    if (env.ec > 2.0) {
      issues.push({
        type: 'ec_high',
        severity: 'high',
        message: `EC too high: ${env.ec}`,
        recommendation: 'Reduce nutrient concentration to prevent burn'
      });
    } else if (env.ec < 0.8 && plantContext.growthStage !== 'seedling') {
      issues.push({
        type: 'ec_low',
        severity: 'medium',
        message: `EC too low: ${env.ec}`,
        recommendation: 'Increase nutrient concentration for healthy growth'
      });
    }

    return issues;
  };

  // Generate proactive alerts
  const generateProactiveAlerts = (issues: Array<any>) => {
    const alertMessage: Message = {
      id: Date.now().toString(),
      type: 'agentic',
      content: `🤖 **Autonomous Analysis Complete**\n\nDetected ${issues.length} issue(s):\\n\\n${issues.map(issue =>
        `**${issue.severity.toUpperCase()}**: ${issue.message}\\n*Recommendation*: ${issue.recommendation}`
      ).join('\\n\\n')}\\n\\nWould you like me to create an action plan to address these issues?`,
      timestamp: new Date(),
      messageType: 'proactive',
      urgency: issues.some(i => i.severity === 'critical') ? 'critical' :
        issues.some(i => i.severity === 'high') ? 'high' : 'medium',
      confidence: 0.92
    };

    setProactiveAlerts(prev => [...prev, alertMessage]);

    // Auto-add to messages if critical issues
    if (issues.some(i => i.severity === 'critical')) {
      setMessages(prev => [...prev, alertMessage]);
    }
  };

  // Detect patterns in environmental data
  const detectPatterns = () => {
    if (environmentalHistory.length < 5) return;

    const recent = environmentalHistory.slice(-5);

    // Detect temperature trends
    const tempTrend = recent.map(d => d.temperature);
    const isTempRising = tempTrend.every((temp, i) => i === 0 || temp >= tempTrend[i - 1]);
    const isTempFalling = tempTrend.every((temp, i) => i === 0 || temp <= tempTrend[i - 1]);

    if (isTempRising && tempTrend[tempTrend.length - 1] > 28) {
      generatePatternAlert('temperature_rising', 'Temperature trending upward', 'Consider cooling measures');
    } else if (isTempFalling && tempTrend[tempTrend.length - 1] < 20) {
      generatePatternAlert('temperature_falling', 'Temperature trending downward', 'Consider heating measures');
    }

    // Detect humidity trends
    const humidityTrend = recent.map(d => d.humidity);
    const isHumidityRising = humidityTrend.every((hum, i) => i === 0 || hum >= humidityTrend[i - 1]);

    if (isHumidityRising && humidityTrend[humidityTrend.length - 1] > 65) {
      generatePatternAlert('humidity_rising', 'Humidity increasing steadily', 'Increase ventilation to prevent mold');
    }
  };

  // Generate pattern-based alerts
  const generatePatternAlert = (type: string, title: string, recommendation: string) => {
    const patternAnalysis: PatternAnalysis = {
      id: Date.now().toString(),
      type: 'trend',
      title,
      description: `Detected ${type.replace('_', ' ')} pattern in recent data`,
      confidence: 0.85,
      timeframe: 'Last 2.5 minutes',
      implications: ['May affect plant health if trend continues'],
      recommendations: [recommendation],
      data: { trend: type }
    };

    const alertMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'agentic',
      content: `📊 **Pattern Detection**\\n\\n${title}\\n\\n${recommendation}\\n\\nConfidence: ${Math.round(patternAnalysis.confidence * 100)}%`,
      timestamp: new Date(),
      messageType: 'prediction',
      urgency: 'medium',
      confidence: patternAnalysis.confidence,
      patternAnalysis
    };

    setMessages(prev => [...prev, alertMessage]);
  };

  // Update environmental history
  const updateEnvironmentalHistory = () => {
    const newData: EnvironmentalData = {
      timestamp: new Date(),
      temperature: plantContext.environment.temperature,
      humidity: plantContext.environment.humidity,
      ph: plantContext.environment.ph,
      ec: plantContext.environment.ec,
      co2: plantContext.environment.co2
    };

    setEnvironmentalHistory(prev => {
      const updated = [...prev, newData];
      // Keep only last 50 entries
      return updated.slice(-50);
    });
  };

  // Check agentic triggers
  const checkAgenticTriggers = () => {
    // Check if any predefined triggers are met
    agenticTriggers.forEach(trigger => {
      if (trigger.enabled && shouldTriggerAction(trigger)) {
        executeAgenticAction(trigger);
      }
    });
  };

  // Determine if trigger condition is met
  const shouldTriggerAction = (trigger: AgenticTrigger): boolean => {
    const { condition } = trigger;
    const env = plantContext.environment;

    switch (trigger.type) {
      case 'threshold':
        if (condition.parameter === 'temperature' && env[condition.parameter] > condition.value) {
          return true;
        }
        if (condition.parameter === 'humidity' && env[condition.parameter] > condition.value) {
          return true;
        }
        break;
      case 'anomaly':
        // Check for sudden changes
        return false; // Implementation needed
    }
    return false;
  };

  // Execute agentic action
  const executeAgenticAction = (trigger: AgenticTrigger) => {
    const action: AutonomousAction = {
      id: Date.now().toString(),
      type: 'automation',
      title: `Auto: ${trigger.action}`,
      description: `Triggered by ${trigger.type} condition`,
      executed: true,
      result: { success: true, message: 'Action completed successfully' },
      impact: 'medium'
    };

    setAutonomousActions(prev => [...prev, action]);

    // Update trigger last triggered time
    setAgenticTriggers(prev => prev.map(t =>
      t.id === trigger.id ? { ...t, lastTriggered: new Date() } : t
    ));

    // Add notification message
    const notification: Message = {
      id: (Date.now() + 1).toString(),
      type: 'agentic',
      content: `🤖 **Autonomous Action Executed**\\n\\n${action.title}\\n\\n${action.description}\\n\\nResult: ${action.result.message}`,
      timestamp: new Date(),
      messageType: 'autonomous',
      urgency: 'low',
      autonomousAction: action
    };

    setMessages(prev => [...prev, notification]);
  };

  // Create action plan for issues
  const createActionPlan = (issues: Array<any>) => {
    const actionPlan: ActionPlan = {
      id: Date.now().toString(),
      title: 'Autonomous Action Plan',
      description: `AI-generated plan to address ${issues.length} detected issues`,
      priority: issues.some(i => i.severity === 'critical') ? 'urgent' :
        issues.some(i => i.severity === 'high') ? 'high' : 'medium',
      steps: issues.map((issue, index) => ({
        id: `step-${index}`,
        title: `Address ${issue.type}`,
        description: issue.recommendation,
        type: 'adjustment' as const,
        status: 'pending' as const,
        estimatedDuration: '15-30 minutes'
      })),
      estimatedTime: `${issues.length * 15}-${issues.length * 30} minutes`,
      resources: ['pH adjustment kit', 'Nutrient solution', 'Thermometer/Hygrometer'],
      contingencies: ['If conditions don\'t improve, repeat adjustments in 2 hours', 'Contact support if issues persist']
    };

    return actionPlan;
  };

  // Initialize agentic triggers
  useEffect(() => {
    const defaultTriggers: AgenticTrigger[] = [
      {
        id: 'temp-high',
        type: 'threshold',
        condition: { parameter: 'temperature', value: 30, operator: '>' },
        action: 'Increase ventilation and cooling',
        enabled: true
      },
      {
        id: 'humidity-high',
        type: 'threshold',
        condition: { parameter: 'humidity', value: 75, operator: '>' },
        action: 'Increase dehumidification',
        enabled: true
      },
      {
        id: 'ph-out-of-range',
        type: 'threshold',
        condition: { parameter: 'ph', value: 7.0, operator: '>' },
        action: 'Adjust pH to optimal range',
        enabled: true
      }
    ];

    setAgenticTriggers(defaultTriggers);
  }, []);

  // Handle mouse and touch events for dragging
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        const maxX = window.innerWidth - (window.innerWidth < 640 ? window.innerWidth - 32 : 450);
        const maxY = window.innerHeight - 200;
        setPosition({
          x: Math.max(0, Math.min(maxX, clientX - dragStart.x)),
          y: Math.max(0, Math.min(maxY, clientY - dragStart.y))
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      document.addEventListener('touchcancel', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
      };
    }
  }, [isDragging, dragStart]);

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
      image: capturedImage || undefined
    };

    let latestMessages: Message[] = [];

    setMessages(prev => {
      const next = [...prev, userMessage];
      latestMessages = next;
      return next;
    });
    setInput('');
    setIsLoading(true);
    setCapturedImage(null); // Clear captured image after sending

    try {
      // Check if this is an agentic mode that might need local processing first
      if (['autonomous', 'proactive', 'predictive', 'monitor'].includes(chatMode)) {
        // Run local agentic analysis first
        await runAutonomousAnalysis();
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context: {
            ...context,
            plantContext,
            agenticContext,
            environmentalHistory,
            autonomousActions: autonomousActions.slice(-5) // Last 5 actions
          },
          mode: chatMode,
          sensorData: context.sensorData,
          image: capturedImage,
          pageSnapshot,
          agenticData: {
            triggers: agenticTriggers,
            userPreferences: agenticContext.userPreferences,
            systemCapabilities: agenticContext.systemCapabilities
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: ['autonomous', 'proactive', 'predictive', 'monitor'].includes(chatMode) ? 'agentic' : 'assistant',
          content: data.response,
          timestamp: new Date(),
          context: {
            model: data.model,
            provider: data.provider,
            processingTime: data.processingTime
          },
          thinking: data.thinking,
          messageType: data.messageType || 'general',
          confidence: data.confidence,
          urgency: data.urgency
        };

        // Handle special modes
        if (chatMode === 'study-plan' && data.studyPlan) {
          assistantMessage.studyPlan = data.studyPlan;
          assistantMessage.content = '';
        } else if (chatMode === 'quiz' && data.quiz) {
          assistantMessage.multiQuiz = data.quiz;
          assistantMessage.content = '';
        } else if (data.actionPlan) {
          assistantMessage.actionPlan = data.actionPlan;
          assistantMessage.content = data.response || '';
        } else if (data.patternAnalysis) {
          assistantMessage.patternAnalysis = data.patternAnalysis;
          assistantMessage.content = data.response || '';
        } else if (data.autonomousAction) {
          assistantMessage.autonomousAction = data.autonomousAction;
          setAutonomousActions(prev => [...prev, data.autonomousAction]);
        }

        setMessages(prev => {
          const next = [...prev, assistantMessage];
          latestMessages = next;
          return next;
        });

        // If autonomous action was suggested, execute it if enabled
        if (data.autonomousAction && agenticEnabled && agenticContext.userPreferences.automationLevel !== 'manual') {
          // Here you would integrate with actual control systems
          console.log('Executing autonomous action:', data.autonomousAction);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        messageType: 'alert',
        urgency: 'medium'
      };

      setMessages(prev => {
        const next = [...prev, errorMessage];
        latestMessages = next;
        return next;
      });
    } finally {
      setIsLoading(false);
      // Auto-save chat after each interaction using the latest buffered messages
      if (latestMessages.length > 0) {
        const snapshot = [...latestMessages];
        setTimeout(() => saveChatHistory(snapshot), 1000);
      }
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Generate contextual greeting based on mode
  const getContextualGreeting = () => {
    const modeInfo = allModes[chatMode];
    return `${modeInfo.name} Mode: ${modeInfo.description}`;
  };

  // Render contextual indicator
  const renderContextIndicator = () => {
    const contextIcons = {
      dashboard: <Leaf className="h-3 w-3" />,
      'live-vision': <Camera className="h-3 w-3" />,
      'all-tools': <Bot className="h-3 w-3" />,
      settings: <Sparkles className="h-3 w-3" />
    };

    const contextColors = {
      dashboard: 'bg-green-600',
      'live-vision': 'bg-blue-600',
      'all-tools': 'bg-purple-600',
      settings: 'bg-orange-600'
    };

    const modeInfo = allModes[chatMode];

    return (
      <div className="flex items-center justify-between">
        <Badge className={`${contextColors[context.page as keyof typeof contextColors] || 'bg-slate-600'} text-white text-xs`}>
          {contextIcons[context.page as keyof typeof contextIcons] || <Leaf className="h-3 w-3" />}
          <span className="ml-1">{context.title}</span>
        </Badge>
        <Badge className={`${modeInfo.color} text-white text-xs`}>
          {modeInfo.icon}
          <span className="ml-1">{modeInfo.name}</span>
        </Badge>
      </div>
    );
  };

  // Handle quiz answers
  const handleQuizAnswer = (messageId: string, questionIndex: number, answerIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.multiQuiz) {
        const newQuestions = [...msg.multiQuiz.questions];
        newQuestions[questionIndex] = { ...newQuestions[questionIndex], userAnswerIndex: answerIndex };
        return { ...msg, multiQuiz: { ...msg.multiQuiz, questions: newQuestions } };
      }
      return msg;
    }));
  };

  // New feature handlers
  const handleQuickAction = (action: QuickAction) => {
    setChatMode(action.mode);
    setShowModeSelector(false);

    // Auto-generate prompt based on action
    const prompts: Record<string, string> = {
      'analyze-plant': `Analyze my ${plantContext.strain} plant currently in ${plantContext.growthStage} stage. Environment: ${plantContext.environment.temperature}°C, ${plantContext.environment.humidity}% humidity, pH ${plantContext.environment.ph}, EC ${plantContext.environment.ec}.`,
      'check-issues': `Check my plant for issues. Strain: ${plantContext.strain}, Stage: ${plantContext.growthStage}, Age: ${plantContext.age} days.`,
      'nutrient-advice': `Give me nutrient advice for my ${plantContext.strain} in ${plantContext.growthStage} stage. Current pH: ${plantContext.environment.ph}, EC: ${plantContext.environment.ec}.`,
      'growth-tips': `Provide growth optimization tips for ${plantContext.strain} in ${plantContext.growthStage} stage.`,
      'harvest-ready': `Is my ${plantContext.strain} ready for harvest? Current stage: ${plantContext.growthStage}, Age: ${plantContext.age} days.`,
      'autonomous-check': `Run a comprehensive autonomous analysis of my cultivation setup. Analyze environmental trends, detect potential issues, create optimization strategies, and suggest automated actions. Current environment: ${plantContext.environment.temperature}°C, ${plantContext.environment.humidity}% humidity, pH ${plantContext.environment.ph}.`,
      'proactive-scan': `Perform a proactive scan of my grow operation. Identify potential problems before they occur, suggest preventive measures, and recommend optimizations for ${plantContext.strain} in ${plantContext.growthStage} stage.`,
      'predict-health': `Analyze historical data and predict future plant health outcomes. Identify trends, forecast potential issues, and suggest preventive strategies for optimal growth.`
    };

    setInput(prompts[action.id] || action.description);
  };

  const handleCameraCapture = () => {
    // Simulate camera capture - in real implementation, would access device camera
    const simulatedImage = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
    setCapturedImage(simulatedImage);
    setCameraActive(false);

    // Auto-trigger analysis when image is captured
    setChatMode('analysis');
    setInput('Analyze this plant image for health issues and recommendations.');
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImage(result);
      setChatMode('analysis');
      setInput('Analyze this plant image for health issues and recommendations.');
    };
    reader.readAsDataURL(file);
    // reset input to allow same file re-upload
    event.target.value = '';
  };

  const saveChatHistory = (messageList: Message[] = messages) => {
    if (messageList.length === 0) return;

    const firstUserMessage = messageList.find(m => m.type === 'user' && m.content);
    const title = firstUserMessage ? `${firstUserMessage.content.slice(0, 50)}...` : 'New Chat';
    const category = categorizeChat(messageList);

    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title,
      category,
      messages: [...messageList],
      timestamp: new Date(),
      isPinned: false,
      plantContext: { ...plantContext }
    };

    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const categorizeChat = (msgs: Message[]): ChatHistory['category'] => {
    const content = msgs
      .map(m => (m.content || '').toLowerCase())
      .join(' ');
    if (content.includes('harvest') || content.includes('ready') || content.includes('trichome')) return 'Harvest';
    if (content.includes('nutrient') || content.includes('feeding') || content.includes('ph') || content.includes('ec')) return 'Nutrients';
    if (content.includes('health') || content.includes('sick') || content.includes('problem') || content.includes('issue')) return 'Health';
    if (content.includes('strain') || content.includes('genetic') || content.includes('breed')) return 'Genetics';
    return 'General';
  };

  const handleFeedback = (message: Message, sentiment: 'up' | 'down') => {
    setFeedbackMap(prev => ({ ...prev, [message.id]: sentiment }));

    const templateByType: Record<string, string> = {
      analysis: 'plant-analysis',
      recommendation: 'nutrient-optimization',
      troubleshoot: 'pest-disease',
      diagnosis: 'plant-analysis',
      autonomous: 'plant-analysis',
      proactive: 'plant-analysis'
    };

    const templateId = templateByType[message.messageType || ''] || 'plant-analysis';

    try {
      enhancedAgentEvolver.evolvePromptFromFeedback(
        templateId,
        message.content || '',
        {
          accuracy: sentiment === 'up' ? 0.9 : 0.4,
          helpfulness: sentiment === 'up' ? 0.9 : 0.4,
          userSatisfaction: sentiment === 'up' ? 0.9 : 0.35
        }
      );
    } catch (error) {
      console.error('Failed to send feedback to evolver', error);
    }

    // Also notify server-side evolver
    fetch('/api/agent-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: message.id,
        sentiment,
        mode: message.messageType || chatMode,
        content: message.content,
        provider: message.context?.provider
      })
    }).catch(err => console.error('Failed to submit feedback server-side', err));
  };

  const loadChatHistory = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setPlantContext(chat.plantContext || plantContext);
      setCurrentChatId(chatId);
      setShowHistory(false);
    }
  };

  const togglePinChat = (chatId: string) => {
    setChatHistory(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    ));
  };

  const deleteChatHistory = (chatId: string) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  };

  // Update plant context from sensor data
  useEffect(() => {
    if (context.sensorData) {
      const newEnvironmentalData: EnvironmentalData = {
        timestamp: new Date(),
        temperature: context.sensorData.temperature || 25,
        humidity: context.sensorData.humidity || 60,
        ph: context.sensorData.ph || 6.2,
        ec: context.sensorData.ec || 1.2,
        co2: context.sensorData.co2,
        lightIntensity: context.sensorData.lightIntensity,
        vpd: context.sensorData.vpd
      };

      setPlantContext(prev => ({
        ...prev,
        environment: {
          ...prev.environment,
          temperature: context.sensorData.temperature || prev.environment.temperature,
          humidity: context.sensorData.humidity || prev.environment.humidity,
          ph: context.sensorData.ph || prev.environment.ph,
          ec: context.sensorData.ec || prev.environment.ec,
          co2: context.sensorData.co2 || prev.environment.co2
        }
      }));

      // Update environmental history
      setEnvironmentalHistory(prev => [...prev.slice(-100), newEnvironmentalData]);

      // Update agentic context
      setAgenticContext(prev => ({
        ...prev,
        plantData: {
          ...prev.plantData,
          environment: {
            ...prev.plantData.environment,
            temperature: context.sensorData.temperature || prev.plantData.environment.temperature,
            humidity: context.sensorData.humidity || prev.plantData.environment.humidity,
            ph: context.sensorData.ph || prev.plantData.environment.ph,
            ec: context.sensorData.ec || prev.plantData.environment.ec,
            co2: context.sensorData.co2 || prev.plantData.environment.co2
          }
        },
        environmentalHistory: [...prev.environmentalHistory.slice(-100), newEnvironmentalData]
      }));
    }
  }, [context.sensorData]);

  // Agentic Core Functions
  const analyzeEnvironmentalPatterns = (): PatternAnalysis | null => {
    if (environmentalHistory.length < 10) return null;

    const recent = environmentalHistory.slice(-24); // Last 24 data points
    const avgTemp = recent.reduce((sum, d) => sum + d.temperature, 0) / recent.length;
    const avgHumidity = recent.reduce((sum, d) => sum + d.humidity, 0) / recent.length;
    const avgPh = recent.reduce((sum, d) => sum + d.ph, 0) / recent.length;

    // Detect trends
    const tempTrend = recent[recent.length - 1].temperature > recent[0].temperature ? 'increasing' : 'decreasing';
    const humidityTrend = recent[recent.length - 1].humidity > recent[0].humidity ? 'increasing' : 'decreasing';

    // Check for anomalies
    const anomalies = recent.filter(d =>
      Math.abs(d.temperature - avgTemp) > 3 ||
      Math.abs(d.humidity - avgHumidity) > 10 ||
      Math.abs(d.ph - avgPh) > 0.5
    );

    if (anomalies.length > 2) {
      return {
        id: Date.now().toString(),
        type: 'anomaly',
        title: 'Environmental Anomalies Detected',
        description: `Detected ${anomalies.length} environmental readings outside normal ranges`,
        confidence: Math.min(90, 50 + anomalies.length * 10),
        timeframe: 'Last 24 readings',
        implications: [
          'Potential equipment malfunction',
          'Environmental instability affecting plant health',
          'May require immediate attention'
        ],
        recommendations: [
          'Check environmental control systems',
          'Verify sensor calibration',
          'Consider manual override if needed'
        ],
        data: { anomalies, averages: { avgTemp, avgHumidity, avgPh } }
      };
    }

    return null;
  };

  const generateProactiveSuggestions = (): Message[] => {
    const suggestions: Message[] = [];
    const currentEnv = plantContext.environment;
    const stage = plantContext.growthStage;

    // Temperature suggestions
    if (currentEnv.temperature > 28 && stage === 'flowering') {
      suggestions.push({
        id: Date.now().toString() + '_temp',
        type: 'agentic',
        content: `Temperature is high (${currentEnv.temperature}°C) for flowering stage. Consider reducing to 20-26°C to prevent heat stress and improve terpene development.`,
        timestamp: new Date(),
        messageType: 'proactive',
        urgency: 'medium',
        confidence: 85
      });
    }

    // Humidity suggestions
    if (currentEnv.humidity > 60 && stage === 'flowering') {
      suggestions.push({
        id: Date.now().toString() + '_humidity',
        type: 'agentic',
        content: `High humidity (${currentEnv.humidity}%) during flowering increases risk of mold. Consider reducing to 40-50% and improving air circulation.`,
        timestamp: new Date(),
        messageType: 'proactive',
        urgency: 'high',
        confidence: 90
      });
    }

    // pH suggestions
    if (currentEnv.ph < 5.8 || currentEnv.ph > 6.5) {
      suggestions.push({
        id: Date.now().toString() + '_ph',
        type: 'agentic',
        content: `pH level (${currentEnv.ph}) is outside optimal range (5.8-6.5). Adjust nutrients to improve nutrient uptake and prevent deficiencies.`,
        timestamp: new Date(),
        messageType: 'proactive',
        urgency: 'high',
        confidence: 95
      });
    }

    return suggestions;
  };

  const createAutonomousActionPlan = (analysis: any): ActionPlan | null => {
    if (!agenticEnabled || agenticContext.userPreferences.automationLevel === 'manual') return null;

    const steps: ActionStep[] = [];

    if (analysis.temperatureIssue) {
      steps.push({
        id: 'temp-adjust',
        title: 'Adjust Temperature',
        description: `Modify temperature settings from ${analysis.currentTemp}°C to ${analysis.targetTemp}°C`,
        type: 'adjustment',
        status: 'pending',
        estimatedDuration: '15-30 minutes'
      });
    }

    if (analysis.humidityIssue) {
      steps.push({
        id: 'humidity-adjust',
        title: 'Adjust Humidity',
        description: `Modify humidity from ${analysis.currentHumidity}% to ${analysis.targetHumidity}%`,
        type: 'adjustment',
        status: 'pending',
        estimatedDuration: '10-20 minutes'
      });
    }

    if (analysis.nutrientIssue) {
      steps.push({
        id: 'nutrient-check',
        title: 'Check Nutrient Solution',
        description: 'Verify nutrient concentration and pH levels',
        type: 'analysis',
        status: 'pending',
        estimatedDuration: '5-10 minutes'
      });
    }

    if (steps.length === 0) return null;

    return {
      id: Date.now().toString(),
      title: 'Autonomous Environment Optimization',
      description: 'Automated adjustments based on current environmental analysis',
      priority: analysis.urgency || 'medium',
      steps,
      estimatedTime: steps.reduce((total, step) => {
        const duration = parseInt(step.estimatedDuration.split('-')[1] || '30');
        return total + duration;
      }, 0) + ' minutes',
      resources: ['Environmental controls', 'Nutrient mixing system', 'Monitoring sensors'],
      contingencies: [
        'Manual override if conditions worsen',
        'Emergency shutdown if critical thresholds exceeded',
        'Notify user immediately of major changes'
      ]
    };
  };

  const executeAgenticTriggers = async () => {
    const currentEnv = plantContext.environment;
    const currentTime = new Date();

    agenticTriggers.forEach(trigger => {
      if (!trigger.enabled) return;

      // Prevent too frequent triggers
      if (trigger.lastTriggered &&
        (currentTime.getTime() - trigger.lastTriggered.getTime()) < 300000) { // 5 minutes
        return;
      }

      let shouldTrigger = false;

      switch (trigger.type) {
        case 'threshold':
          if (trigger.condition.parameter === 'temperature' &&
            currentEnv.temperature > trigger.condition.value) {
            shouldTrigger = true;
          }
          if (trigger.condition.parameter === 'humidity' &&
            currentEnv.humidity > trigger.condition.value) {
            shouldTrigger = true;
          }
          if (trigger.condition.parameter === 'ph' &&
            (currentEnv.ph < trigger.condition.min || currentEnv.ph > trigger.condition.max)) {
            shouldTrigger = true;
          }
          break;
      }

      if (shouldTrigger) {
        // Execute the trigger action
        const action: AutonomousAction = {
          id: Date.now().toString(),
          type: 'alert',
          title: `Trigger Activated: ${trigger.condition.parameter}`,
          description: `Threshold exceeded: ${trigger.condition.parameter} = ${currentEnv[trigger.condition.parameter as keyof typeof currentEnv]
            }`,
          executed: true,
          impact: trigger.condition.impact || 'medium'
        };

        setAutonomousActions(prev => [...prev, action]);
        setAgenticTriggers(prev =>
          prev.map(t => t.id === trigger.id ? { ...t, lastTriggered: currentTime } : t)
        );

        // Add alert message
        const alertMessage: Message = {
          id: Date.now().toString() + '_alert',
          type: 'agentic',
          content: `🚨 ${action.title}: ${action.description}`,
          timestamp: new Date(),
          messageType: 'alert',
          urgency: action.impact === 'high' ? 'high' : 'medium',
          confidence: 100
        };

        setProactiveAlerts(prev => [...prev, alertMessage]);
        setMessages(prev => [...prev, alertMessage]);
      }
    });
  };

  const runAutonomousAnalysis = async () => {
    if (!agenticEnabled) return;

    const currentTime = new Date();

    // Run analysis every 5 minutes
    if (lastAnalysis && (currentTime.getTime() - lastAnalysis.getTime()) < 300000) {
      return;
    }

    setLastAnalysis(currentTime);

    // Analyze patterns
    const patternAnalysis = analyzeEnvironmentalPatterns();
    if (patternAnalysis) {
      const patternMessage: Message = {
        id: Date.now().toString() + '_pattern',
        type: 'agentic',
        content: `🔍 ${patternAnalysis.title}: ${patternAnalysis.description}`,
        timestamp: new Date(),
        messageType: 'prediction',
        urgency: patternAnalysis.confidence > 80 ? 'high' : 'medium',
        confidence: patternAnalysis.confidence,
        patternAnalysis
      };

      setMessages(prev => [...prev, patternMessage]);
    }

    // Generate proactive suggestions
    const suggestions = generateProactiveSuggestions();
    if (suggestions.length > 0) {
      setMessages(prev => [...prev, ...suggestions]);
    }

    // Execute triggers
    await executeAgenticTriggers();

    // Create action plan if needed
    const analysisData = {
      temperatureIssue: plantContext.environment.temperature > 28 || plantContext.environment.temperature < 18,
      humidityIssue: plantContext.environment.humidity > 70 || plantContext.environment.humidity < 40,
      nutrientIssue: plantContext.environment.ph < 5.8 || plantContext.environment.ph > 6.5,
      currentTemp: plantContext.environment.temperature,
      targetTemp: plantContext.growthStage === 'flowering' ? 23 : 25,
      currentHumidity: plantContext.environment.humidity,
      targetHumidity: plantContext.growthStage === 'flowering' ? 45 : 60,
      urgency: 'medium'
    };

    const actionPlan = createAutonomousActionPlan(analysisData);
    if (actionPlan) {
      const planMessage: Message = {
        id: Date.now().toString() + '_plan',
        type: 'agentic',
        content: `📋 Created automated action plan: ${actionPlan.title}`,
        timestamp: new Date(),
        messageType: 'autonomous',
        urgency: actionPlan.priority,
        actionPlan
      };

      setMessages(prev => [...prev, planMessage]);
    }
  };

  // Initialize agentic triggers
  useEffect(() => {
    const defaultTriggers: AgenticTrigger[] = [
      {
        id: 'temp-high',
        type: 'threshold',
        condition: {
          parameter: 'temperature',
          value: 30,
          operator: '>',
          impact: 'high'
        },
        action: 'alert_user_and_reduce_temp',
        enabled: true
      },
      {
        id: 'humidity-high',
        type: 'threshold',
        condition: {
          parameter: 'humidity',
          value: 70,
          operator: '>',
          impact: 'medium'
        },
        action: 'alert_user_and_increase_ventilation',
        enabled: true
      },
      {
        id: 'ph-out-range',
        type: 'threshold',
        condition: {
          parameter: 'ph',
          min: 5.5,
          max: 6.8,
          impact: 'high'
        },
        action: 'alert_user_and_adjust_nutrients',
        enabled: true
      }
    ];

    if (agenticTriggers.length === 0) {
      setAgenticTriggers(defaultTriggers);
    }
  }, []);

  // Run autonomous analysis periodically
  useEffect(() => {
    if (!agenticEnabled) return;

    const interval = setInterval(() => {
      runAutonomousAnalysis();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [agenticEnabled, environmentalHistory, plantContext, agenticTriggers]);

  // Run initial analysis when component mounts
  useEffect(() => {
    if (agenticEnabled && environmentalHistory.length > 5) {
      setTimeout(() => runAutonomousAnalysis(), 2000);
    }
  }, [agenticEnabled]);

  // Render study plan
  const renderStudyPlan = (plan: StudyPlan) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-green-400 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {plan.title}
        </CardTitle>
        <p className="text-xs text-slate-400">Duration: {plan.duration}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Objectives:</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {plan.objectives.map((obj, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className="h-3 w-3 mr-1 mt-0.5 text-green-400 flex-shrink-0" />
                {obj}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Daily Schedule:</h4>
          <div className="space-y-2">
            {plan.dailyTopics.map((day, idx) => (
              <div key={idx} className="bg-slate-700 p-2 rounded">
                <p className="text-xs font-medium text-slate-200">Day {day.day}: {day.topic}</p>
                <ul className="text-xs text-slate-400 mt-1 space-y-1">
                  {day.activities.map((activity, actIdx) => (
                    <li key={actIdx} className="flex items-start">
                      <TrendingUp className="h-3 w-3 mr-1 mt-0.5 text-blue-400 flex-shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render quiz
  const renderQuiz = (quiz: MultiQuiz, messageId: string) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-orange-400 flex items-center">
          <Target className="h-4 w-4 mr-2" />
          {quiz.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quiz.questions.map((question, qIdx) => (
          <div key={qIdx} className="bg-slate-700 p-3 rounded">
            <p className="text-sm font-medium text-slate-200 mb-2">{question.question}</p>
            <div className="space-y-2">
              {question.options.map((option, oIdx) => {
                const isCorrect = oIdx === question.correctAnswer;
                const isSelected = oIdx === question.userAnswerIndex;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleQuizAnswer(messageId, qIdx, oIdx)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors ${isSelected && isCorrect
                        ? 'bg-green-600 text-white'
                        : isSelected && !isCorrect
                          ? 'bg-red-600 text-white'
                          : isCorrect && question.userAnswerIndex !== undefined
                            ? 'bg-green-800 text-green-200'
                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    disabled={question.userAnswerIndex !== undefined}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {question.userAnswerIndex !== undefined && (
              <p className="text-xs text-slate-400 mt-2 italic">{question.explanation}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  // Agentic render functions
  const renderActionPlan = (plan: ActionPlan) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-violet-400 flex items-center">
          <Zap className="h-4 w-4 mr-2" />
          {plan.title}
        </CardTitle>
        <p className="text-xs text-slate-400">{plan.description}</p>
        <div className="flex items-center space-x-2">
          <Badge className={`text-xs ${plan.priority === 'urgent' ? 'bg-red-600' :
              plan.priority === 'high' ? 'bg-orange-600' :
                plan.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
            } text-white`}>
            {plan.priority.toUpperCase()}
          </Badge>
          <span className="text-xs text-slate-400">⏱ {plan.estimatedTime}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Action Steps:</h4>
          <div className="space-y-2">
            {plan.steps.map((step, idx) => (
              <div key={step.id} className="bg-slate-700 p-2 rounded flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full border-2 ${step.status === 'completed' ? 'bg-green-500 border-green-500' :
                    step.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                      'border-slate-500'
                  }`}>
                  {step.status === 'completed' && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-200">{step.title}</p>
                  <p className="text-xs text-slate-400">{step.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className="text-xs bg-slate-600 text-slate-200">
                      {step.type}
                    </Badge>
                    <span className="text-xs text-slate-500">⏱ {step.estimatedDuration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Resources Needed:</h4>
          <div className="flex flex-wrap gap-1">
            {plan.resources.map((resource, idx) => (
              <Badge key={idx} className="text-xs bg-slate-600 text-slate-200">
                {resource}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Contingencies:</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {plan.contingencies.map((contingency, idx) => (
              <li key={idx} className="flex items-start">
                <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 text-yellow-400 flex-shrink-0" />
                {contingency}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderPatternAnalysis = (analysis: PatternAnalysis) => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-cyan-400 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          {analysis.title}
        </CardTitle>
        <p className="text-xs text-slate-400">{analysis.description}</p>
        <div className="flex items-center space-x-2">
          <Badge className="text-xs bg-cyan-600 text-white">
            {analysis.type.toUpperCase()}
          </Badge>
          <span className="text-xs text-slate-400">{analysis.timeframe}</span>
          <div className="flex items-center space-x-1">
            <div className="w-full bg-slate-600 rounded-full h-2 max-w-[60px]">
              <div
                className={`h-2 rounded-full ${analysis.confidence > 80 ? 'bg-green-500' :
                    analysis.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{analysis.confidence}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Implications:</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {analysis.implications.map((implication, idx) => (
              <li key={idx} className="flex items-start">
                <AlertCircle className="h-3 w-3 mr-1 mt-0.5 text-orange-400 flex-shrink-0" />
                {implication}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Recommendations:</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            {analysis.recommendations.map((recommendation, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className="h-3 w-3 mr-1 mt-0.5 text-green-400 flex-shrink-0" />
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderAgenticControls = () => (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-violet-400 flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            Agentic Controls
          </CardTitle>
          <Button
            size="sm"
            variant={agenticEnabled ? "default" : "outline"}
            className={`text-xs ${agenticEnabled ? 'bg-violet-600 text-white' : 'bg-slate-600 text-slate-300'}`}
            onClick={() => setAgenticEnabled(!agenticEnabled)}
          >
            {agenticEnabled ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Mode:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">{agenticContext.userPreferences.automationLevel}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Risk:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">{agenticContext.riskTolerance}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Triggers:</span>
            <span className="ml-1 text-slate-200 font-medium">{agenticTriggers.filter(t => t.enabled).length} active</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Actions:</span>
            <span className="ml-1 text-slate-200 font-medium">{autonomousActions.filter(a => a.executed).length} executed</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => runAutonomousAnalysis()}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            Run Analysis
          </Button>
          <Button
            size="sm"
            onClick={() => setChatMode('autonomous')}
            variant="outline"
            className="flex-1 bg-slate-600 text-slate-200 hover:bg-slate-500 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            Autonomous Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // New render functions
  const renderPlantContext = () => (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-400 flex items-center">
          <Leaf className="h-4 w-4 mr-2" />
          Plant Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Strain:</span>
            <span className="ml-1 text-slate-200 font-medium">{plantContext.strain}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Stage:</span>
            <span className="ml-1 text-slate-200 font-medium capitalize">{plantContext.growthStage}</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Age:</span>
            <span className="ml-1 text-slate-200 font-medium">{plantContext.age} days</span>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Health:</span>
            <span className={`ml-1 font-medium ${plantContext.lastAnalysis?.healthScore && plantContext.lastAnalysis.healthScore > 80
                ? 'text-green-400'
                : plantContext.lastAnalysis?.healthScore && plantContext.lastAnalysis.healthScore > 60
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
              {plantContext.lastAnalysis?.healthScore || 'N/A'}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-700 p-2 rounded text-center">
            <Thermometer className="h-3 w-3 mx-auto mb-1 text-orange-400" />
            <div className="text-slate-400">Temp</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.temperature}°C</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Droplets className="h-3 w-3 mx-auto mb-1 text-blue-400" />
            <div className="text-slate-400">Humidity</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.humidity}%</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Activity className="h-3 w-3 mx-auto mb-1 text-purple-400" />
            <div className="text-slate-400">pH</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.ph}</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Zap className="h-3 w-3 mx-auto mb-1 text-yellow-400" />
            <div className="text-slate-400">EC</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.ec}</div>
          </div>
          <div className="bg-slate-700 p-2 rounded text-center">
            <Sun className="h-3 w-3 mx-auto mb-1 text-amber-400" />
            <div className="text-slate-400">Light</div>
            <div className="text-slate-200 font-medium">{plantContext.environment.lightHours}h</div>
          </div>
          {plantContext.environment.co2 && (
            <div className="bg-slate-700 p-2 rounded text-center">
              <Shield className="h-3 w-3 mx-auto mb-1 text-green-400" />
              <div className="text-slate-400">CO₂</div>
              <div className="text-slate-200 font-medium">{plantContext.environment.co2}ppm</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderQuickActions = () => (
    <Card className="bg-slate-800 border-slate-600 mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-blue-400 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
            onClick={() => setShowQuickActions(!showQuickActions)}
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {showQuickActions && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className={`justify-start h-auto p-2 bg-gradient-to-r ${action.color} hover:opacity-90 text-white`}
                >
                  <div className="flex items-center">
                    {action.icon}
                    <div className="ml-2 text-left">
                      <div className="text-xs font-medium">{action.name}</div>
                      <div className="text-xs opacity-80">{action.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </AnimatePresence>
    </Card>
  );

  const renderChatHistory = () => (
    <Card className="bg-slate-800 border-slate-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-purple-400 flex items-center">
            <History className="h-4 w-4 mr-2" />
            Chat History
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
            onClick={() => setShowHistory(!showHistory)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="text-center text-slate-400 py-4">
              <History className="h-8 w-8 mx-auto mb-2 text-slate-500" />
              <p className="text-xs">No chat history yet</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`p-2 bg-slate-700 rounded cursor-pointer hover:bg-slate-600 transition-colors ${currentChatId === chat.id ? 'ring-2 ring-blue-500' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0" onClick={() => loadChatHistory(chat.id)}>
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-slate-600 text-slate-200">
                        {chat.category}
                      </Badge>
                      {chat.isPinned && <Star className="h-3 w-3 text-yellow-400 fill-current" />}
                    </div>
                    <p className="text-xs text-slate-200 font-medium truncate mt-1">{chat.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {chat.timestamp.toLocaleDateString()} • {chat.messages.length} messages
                    </p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-yellow-400 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinChat(chat.id);
                      }}
                    >
                      {chat.isPinned ? <Star className="h-3 w-3 fill-current" /> : <Star className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatHistory(chat.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderMessageWithEnhancements = (message: Message) => {
    const messageTypeConfig = {
      analysis: { icon: <Bug className="h-3 w-3" />, color: 'text-emerald-400' },
      recommendation: { icon: <TrendingUp className="h-3 w-3" />, color: 'text-blue-400' },
      alert: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-red-400' },
      diagnosis: { icon: <AlertCircle className="h-3 w-3" />, color: 'text-orange-400' },
      general: { icon: <Info className="h-3 w-3" />, color: 'text-slate-400' },
      proactive: { icon: <Activity className="h-3 w-3" />, color: 'text-cyan-400' },
      prediction: { icon: <TrendingUp className="h-3 w-3" />, color: 'text-purple-400' },
      autonomous: { icon: <Zap className="h-3 w-3" />, color: 'text-violet-400' }
    };

    const urgencyConfig = {
      low: { color: 'bg-green-600', label: 'Low' },
      medium: { color: 'bg-yellow-600', label: 'Med' },
      high: { color: 'bg-orange-600', label: 'High' },
      critical: { color: 'bg-red-600', label: 'Critical' }
    };

    return (
      <div>
        {message.studyPlan && (
          <div className="mb-2">
            {renderStudyPlan(message.studyPlan)}
          </div>
        )}
        {message.multiQuiz && (
          <div className="mb-2">
            {renderQuiz(message.multiQuiz, message.id)}
          </div>
        )}
        {message.actionPlan && (
          <div className="mb-2">
            {renderActionPlan(message.actionPlan)}
          </div>
        )}
        {message.patternAnalysis && (
          <div className="mb-2">
            {renderPatternAnalysis(message.patternAnalysis)}
          </div>
        )}
        {message.content && (
          <div>
            <div className={`p-3 rounded-lg text-sm ${message.type === 'user'
                ? 'bg-blue-600 text-white ml-auto'
                : message.type === 'agentic'
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                  : 'bg-slate-700 text-slate-200'
              }`}>
              {/* Message type indicator */}
              {(message.type === 'assistant' || message.type === 'agentic') && message.messageType && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className={messageTypeConfig[message.messageType]?.color || 'text-slate-400'}>
                    {messageTypeConfig[message.messageType]?.icon || <Info className="h-3 w-3" />}
                  </span>
                  <span className={`text-xs capitalize ${messageTypeConfig[message.messageType]?.color || 'text-slate-400'}`}>
                    {message.messageType}
                  </span>
                  {message.type === 'agentic' && (
                    <Badge className="bg-violet-500 text-white text-xs">
                      AI-Generated
                    </Badge>
                  )}
                  {message.urgency && (
                    <Badge className={`${urgencyConfig[message.urgency].color} text-white text-xs`}>
                      {urgencyConfig[message.urgency].label}
                    </Badge>
                  )}
                </div>
              )}

              {/* Image display */}
              {message.image && (
                <div className="mb-2">
                  <img src={message.image} alt="Plant analysis" className="w-full rounded" />
                </div>
              )}

              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Confidence score */}
              {typeof message.confidence === 'number' && (
                <div className="mt-2 flex items-center space-x-2">
                  {(() => {
                    const normalizedConfidence = Math.min(
                      100,
                      message.confidence > 1 ? message.confidence : message.confidence * 100
                    );
                    const confidenceColor = normalizedConfidence > 80
                      ? 'bg-green-500'
                      : normalizedConfidence > 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500';

                    return (
                      <>
                        <div className="flex-1 bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${confidenceColor}`}
                            style={{ width: `${normalizedConfidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{normalizedConfidence.toFixed(0)}%</span>
                      </>
                    );
                  })()}
                </div>
              )}

              {message.thinking && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-purple-400 hover:text-purple-300">
                    🧠 Thinking Process
                  </summary>
                  <div className="mt-1 p-2 bg-slate-800 rounded text-slate-300">
                    {message.thinking}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
        <div className={`flex items-center justify-between mt-1 text-xs ${message.type === 'user' ? 'text-blue-200' :
            message.type === 'agentic' ? 'text-violet-200' : 'text-slate-400'
          }`}>
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {(message.type === 'assistant' || message.type === 'agentic') && message.content && (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${feedbackMap[message.id] === 'up' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-200'}`}
                onClick={() => handleFeedback(message, 'up')}
                disabled={!!feedbackMap[message.id]}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Helpful
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`h-7 px-2 text-xs ${feedbackMap[message.id] === 'down' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200'}`}
                onClick={() => handleFeedback(message, 'down')}
                disabled={!!feedbackMap[message.id]}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Not helpful
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {message.type === 'agentic' && (
              <Badge className="bg-violet-600 text-white text-xs">
                <Zap className="h-2 w-2 mr-1" />
                Autonomous
              </Badge>
            )}
            {message.context?.model && (
              <span className="ml-2">{message.context.provider}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const modeInfo = allModes[chatMode];

  return (
    <div className={`fixed z-50 ${className}`}>
      {/* Floating button when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="relative"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className={`bg-gradient-to-r ${modeInfo.color} hover:opacity-90 text-white rounded-full shadow-lg border-2 border-white/20 h-14 w-14 sm:h-auto sm:w-auto sm:px-4`}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999
              }}
            >
              <Bot className="h-6 w-6 sm:mr-2" />
              <span className="hidden sm:inline">AI Assistant</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </Button>

            {/* Context tooltip */}
            <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs p-2 rounded-lg shadow-lg whitespace-nowrap max-w-xs">
              <div className="flex items-center space-x-2 mb-1">
                {modeInfo.icon}
                <span className="font-medium">{modeInfo.name}</span>
              </div>
              <div className="text-slate-300">{modeInfo.description}</div>
              <div className="absolute bottom-0 right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden ${isMinimized ? 'h-auto' : 'h-[500px] sm:h-[600px]'} w-[calc(100vw-2rem)] sm:w-[350px] md:w-[450px] max-w-[450px]`}
            style={{
              position: 'fixed',
              bottom: isDragging ? `${position.y}px` : '20px',
              right: isDragging ? (position.x > window.innerWidth - 470 ? '20px' : `${position.x}px`) : '20px',
              left: isDragging && position.x <= window.innerWidth - 470 ? `${position.x}px` : 'auto',
              transform: isDragging && position.x <= window.innerWidth - 470 ? 'none' : 'translateX(0)',
              zIndex: 9999
            }}
          >
            {/* Header */}
            <div
              className={`bg-gradient-to-r ${modeInfo.color} text-white p-3 flex items-center justify-between cursor-move touch-none no-select`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span className="font-semibold">CannaAI Assistant</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {agenticEnabled && (
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3 w-3 text-violet-300" />
                    <span className="text-xs text-violet-200">Agentic</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`text-white hover:bg-white/20 h-8 w-8 p-0 ${agenticEnabled ? 'bg-violet-600/30' : ''}`}
                  onClick={() => setAgenticEnabled(!agenticEnabled)}
                  title={agenticEnabled ? 'Disable Agentic Mode' : 'Enable Agentic Mode'}
                >
                  <Zap className={`h-4 w-4 ${agenticEnabled ? 'text-violet-200' : ''}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setShowModeSelector(!showModeSelector)}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mode selector */}
            <AnimatePresence>
              {showModeSelector && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-800 border-b border-slate-600 p-3"
                >
                  <div className="space-y-3">
                    {Object.entries(modeCategories).map(([category, { icon, modes }]) => (
                      <div key={category}>
                        <div className="flex items-center space-x-2 mb-2 text-xs font-medium text-slate-400 uppercase">
                          {icon}
                          <span>{category}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {modes.map((mode) => {
                            const modeData = allModes[mode as ChatMode];
                            return (
                              <Button
                                key={mode}
                                size="sm"
                                variant={chatMode === mode ? "default" : "outline"}
                                className={`text-xs justify-start ${chatMode === mode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                                onClick={() => {
                                  setChatMode(mode as ChatMode);
                                  setShowModeSelector(false);
                                }}
                              >
                                {modeData.icon}
                                <span className="ml-1 truncate">{modeData.name}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context bar */}
            {!isMinimized && (
              <div className="bg-slate-800 px-3 py-2 border-b border-slate-600">
                {renderContextIndicator()}
              </div>
            )}

            {/* Chat History Sidebar */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  className="absolute inset-0 bg-slate-900 z-10"
                >
                  {renderChatHistory()}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages area */}
            {!isMinimized && !showHistory && (
              <div className="flex flex-col h-[calc(100%-160px)]">
                <ScrollArea className="flex-1 p-3 scrollbar-chat chat-container" style={{ height: '100%', maxHeight: 'calc(600px - 160px)' }}>
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <div className="space-y-3">
                        {renderAgenticControls()}
                        {renderPlantContext()}
                        {renderQuickActions()}
                        <div className="text-center text-slate-400 py-8">
                          <Bot className="h-12 w-12 mx-auto mb-3 text-slate-500" />
                          <p className="text-sm font-medium">{getContextualGreeting()}</p>
                          <p className="text-xs mt-1">Click the grid icon to explore all modes!</p>
                          {agenticEnabled && (
                            <p className="text-xs mt-2 text-violet-400">
                              🧠 Agentic AI is actively monitoring your plants
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {messages.length > 0 && (
                      <>
                        {renderAgenticControls()}
                        {renderPlantContext()}
                        {renderQuickActions()}
                      </>
                    )}

                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%]`}>
                          {renderMessageWithEnhancements(message)}
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-slate-700 text-slate-200 p-3 rounded-lg text-sm max-w-[85%]">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span>Processing in {modeInfo.name} mode...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Camera preview */}
                {cameraActive && (
                  <div className="border-t border-slate-600 p-3 bg-slate-800">
                    <div className="bg-slate-700 rounded-lg p-4 text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      <p className="text-sm text-slate-300 mb-3">Camera Preview</p>
                      <div className="flex space-x-2 justify-center">
                        <Button
                          size="sm"
                          onClick={handleCameraCapture}
                          className="bg-green-600 hover:bg-green-500 text-white"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Capture
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setCameraActive(false)}
                          variant="outline"
                          className="bg-slate-600 text-slate-200 hover:bg-slate-500"
                        >
                          <CameraOff className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Captured image preview */}
                {capturedImage && (
                  <div className="border-t border-slate-600 p-3 bg-slate-800">
                    <div className="bg-slate-700 rounded-lg p-2">
                      <div className="relative">
                        <img src={capturedImage} alt="Captured plant" className="w-full rounded" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white h-6 w-6 p-0"
                          onClick={() => setCapturedImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="border-t border-slate-600 p-3">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`bg-slate-700 text-slate-200 hover:bg-slate-600 ${cameraActive ? 'bg-red-600' : ''}`}
                      onClick={() => setCameraActive(!cameraActive)}
                    >
                      {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-slate-700 text-slate-200 hover:bg-slate-600"
                      onClick={triggerImageUpload}
                      title="Upload plant photo"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleImageUploadChange}
                    />
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask about cultivation (${modeInfo.name} mode)...`}
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!input.trim() || isLoading}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
