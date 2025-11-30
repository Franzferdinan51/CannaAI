// Core message and chat types
export interface Message {
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

export interface StudyPlan {
  title: string;
  duration: string;
  objectives: string[];
  dailyTopics: { day: number; topic: string; activities: string[] }[];
}

export interface MultiQuiz {
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    userAnswerIndex?: number;
  }[];
}

export interface PageContext {
  page: string;
  title: string;
  data?: any;
  sensorData?: any;
}

export interface PageSnapshot {
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

export interface PlantContext {
  strain: string;
  growthStage: 'seedling' | 'vegetative' | 'flowering' | 'harvest';
  age: number;
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

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  mode: ChatMode;
  color: string;
}

// Agentic interfaces
export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  steps: ActionStep[];
  estimatedTime: string;
  resources: string[];
  contingencies: string[];
}

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  type: 'analysis' | 'adjustment' | 'monitoring' | 'intervention' | 'observation';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimatedDuration: string;
  dependencies?: string[];
}

export interface AutonomousAction {
  id: string;
  type: 'environment_adjustment' | 'monitoring' | 'alert' | 'recommendation' | 'automation';
  title: string;
  description: string;
  executed: boolean;
  scheduledTime?: Date;
  result?: any;
  impact: 'low' | 'medium' | 'high';
}

export interface PatternAnalysis {
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

export interface AgenticContext {
  plantData: PlantContext;
  environmentalHistory: EnvironmentalData[];
  userPreferences: UserPreferences;
  systemCapabilities: SystemCapabilities;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export interface EnvironmentalData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  co2?: number;
  lightIntensity?: number;
  vpd?: number;
}

export interface UserPreferences {
  automationLevel: 'manual' | 'semi' | 'full';
  notificationFrequency: 'minimal' | 'normal' | 'frequent';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredStrains: string[];
  goals: string[];
}

export interface SystemCapabilities {
  environmentalControls: boolean;
  irrigationSystem: boolean;
  lightingControl: boolean;
  monitoringSensors: string[];
  automationEnabled: boolean;
}

export interface AgenticTrigger {
  id: string;
  type: 'threshold' | 'pattern' | 'schedule' | 'anomaly' | 'prediction';
  condition: any;
  action: string;
  enabled: boolean;
  lastTriggered?: Date;
}

export interface ChatHistory {
  id: string;
  title: string;
  category: 'Harvest' | 'Nutrients' | 'Health' | 'Genetics' | 'General';
  messages: Message[];
  timestamp: Date;
  isPinned: boolean;
  plantContext?: PlantContext;
}

export type ChatMode =
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

export interface UnifiedAIAssistantProps {
  initialContext?: PageContext;
  className?: string;
}
