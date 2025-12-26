// Scanner-related TypeScript definitions

export interface PlantAnalysis {
  diagnosis: string;
  scientificName?: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  symptomsMatched: string[];
  causes: string[];
  treatment: string[];
  healthScore: number;
  strainSpecificAdvice?: string;
  reasoning?: Array<{
    step: string;
    explanation: string;
    weight: number;
    evidence?: string;
  }>;
  isPurpleStrain?: boolean;
  purpleAnalysis?: {
    isGenetic: boolean;
    isDeficiency: boolean;
    analysis: string;
  };
  pestsDetected?: Array<{
    name: string;
    scientificName?: string;
    severity: string;
    treatment: string;
  }>;
  diseasesDetected?: Array<{
    name: string;
    pathogen?: string;
    severity: string;
    treatment: string;
  }>;
  nutrientDeficiencies?: Array<{
    nutrient: string;
    severity: string;
    currentLevel?: string;
    optimalLevel?: string;
    treatment: string;
  }>;
  environmentalFactors?: Array<{
    factor: string;
    currentValue?: string;
    optimalRange?: string;
    correction: string;
  }>;
  recommendations?: {
    immediate?: string[];
    shortTerm?: string[];
    longTerm?: string[];
  };
  imageAnalysis?: {
    hasImage: boolean;
    visualFindings: string[];
    confidence: number;
    imageQuality?: string;
    additionalNotes?: string;
  };
  followUpSchedule?: string;
  researchReferences?: string[];
  prognosis?: string;
  analysisMetadata?: {
    inputParameters: AnalysisFormData;
    imageAnalysis: boolean;
    processingTime: number;
    provider: string;
    enhancedAt: string;
    version: string;
  };
  aiResponse?: string;
  provider?: string;
}

export interface AnalysisFormData {
  strain: string;
  leafSymptoms: string;
  phLevel: string;
  temperature: string;
  humidity: string;
  medium: string;
  growthStage: string;
  temperatureUnit: 'C' | 'F';
  pestDiseaseFocus: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  additionalNotes: string;
}

export interface PlantImage {
  id: string;
  url: string;
  timestamp: string;
  status: 'Processing' | 'Healthy' | 'Warning' | 'Critical';
  batchId?: string;
  strain?: string;
  analysis?: PlantAnalysis;
  formData?: AnalysisFormData;
}

export interface Strain {
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

export interface AnalysisResponse {
  success: boolean;
  analysis: PlantAnalysis;
  imageInfo?: ImageProcessingInfo;
  metadata: {
    analysisId: string;
    processingTime: number;
    timestamp: string;
    version: string;
  };
  diagnosticCapabilities: {
    imageAnalysis: boolean;
    visualDiagnostics: string[];
    textBasedDiagnostics: string[];
    strainSpecificAnalysis: boolean;
    usHempResearchIntegration: boolean;
    exactDosageCalculations: boolean;
    confidenceScoring: boolean;
    treatmentProtocols: boolean;
  };
  provider: {
    used: string;
    primary: string;
    available: string[];
    recommendations: string[];
    status: string;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    window: number;
  };
}

export interface ImageProcessingInfo {
  originalSize: number;
  compressedSize: number;
  dimensions: string;
  format: string;
  originalDimensions: string;
  megapixels: string;
  qualityLevel: number;
  compressionEfficiency: string;
  isHighResolution: boolean;
  isUltraHighResolution: boolean;
}

export interface ScannerSettings {
  enableCamera: boolean;
  autoCapture: boolean;
  imageQuality: 'low' | 'medium' | 'high' | 'ultra';
  analysisProvider: 'auto' | 'lmstudio' | 'openrouter';
  showAdvancedOptions: boolean;
  defaultStrain?: string;
  notifications: {
    analysisComplete: boolean;
    criticalIssues: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    saveImages: boolean;
    shareData: boolean;
    anonymizeData: boolean;
  };
}

export interface ScannerStats {
  totalScans: number;
  healthyPlants: number;
  plantsNeedingAttention: number;
  criticalIssues: number;
  averageHealthScore: number;
  lastScanTime?: string;
  mostCommonIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
  }>;
}

export interface ScannerError {
  type: 'validation_error' | 'timeout_error' | 'service_unavailable' | 'rate_limit_error' | 'image_error' | 'network_error' | 'internal_error';
  message: string;
  userMessage: string;
  details?: string;
  timestamp: string;
  requestId: string;
  canRetry?: boolean;
}

export interface AnalysisHistory {
  id: string;
  timestamp: string;
  plantId: string;
  strain: string;
  healthScore: number;
  diagnosis: string;
  urgency: string;
  hasImage: boolean;
  recommendations: string[];
  followUpCompleted: boolean;
}

export interface ScheduledAnalysis {
  id: string;
  plantId: string;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  nextAnalysis: string;
  lastAnalysis?: string;
  enabled: boolean;
  notifications: boolean;
}

export type ViewMode = 'grid' | 'list';
export type ScannerTab = 'capture' | 'analysis' | 'history' | 'settings';

export interface ScannerState {
  images: PlantImage[];
  selectedImageId: string;
  isAnalyzing: boolean;
  cameraActive: boolean;
  viewMode: ViewMode;
  showAdvanced: boolean;
  strains: Strain[];
  currentImage: string;
  formData: AnalysisFormData;
  settings: ScannerSettings;
  stats: ScannerStats;
  error?: ScannerError;
}

// API Request/Response types
export interface AnalyzeRequest extends AnalysisFormData {
  plantImage?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis: PlantAnalysis;
  metadata: any;
  imageInfo?: ImageProcessingInfo;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    userMessage: string;
    details?: string;
    timestamp: string;
    requestId: string;
  };
  alternatives?: {
    textOnlyAnalysis?: boolean;
    retryRecommendations?: string[];
    setupRequired?: boolean;
  };
  support?: {
    helpText: string;
    canRetry: boolean;
  };
}

// Camera types
export interface CameraSettings {
  facingMode: 'user' | 'environment';
  width: number;
  height: number;
  deviceId?: string;
}

export interface CapturedImage {
  blob: Blob;
  dataUrl: string;
  timestamp: string;
  metadata?: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
  };
}

// Notification types
export interface ScannerNotification {
  id: string;
  type: 'analysis_complete' | 'critical_issue' | 'weekly_report' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Export type guards and utilities
export function isValidPlantAnalysis(obj: any): obj is PlantAnalysis {
  return obj &&
    typeof obj.diagnosis === 'string' &&
    typeof obj.confidence === 'number' &&
    ['mild', 'moderate', 'severe', 'critical'].includes(obj.severity) &&
    ['low', 'medium', 'high', 'critical'].includes(obj.urgency) &&
    typeof obj.healthScore === 'number' &&
    Array.isArray(obj.symptomsMatched) &&
    Array.isArray(obj.causes) &&
    Array.isArray(obj.treatment);
}

export function isValidAnalysisFormData(obj: any): obj is AnalysisFormData {
  return obj &&
    typeof obj.strain === 'string' &&
    typeof obj.leafSymptoms === 'string' &&
    typeof obj.phLevel === 'string' &&
    typeof obj.temperature === 'string' &&
    typeof obj.humidity === 'string' &&
    typeof obj.medium === 'string' &&
    typeof obj.growthStage === 'string' &&
    ['C', 'F'].includes(obj.temperatureUnit) &&
    typeof obj.pestDiseaseFocus === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(obj.urgency) &&
    typeof obj.additionalNotes === 'string';
}

export function createDefaultFormData(): AnalysisFormData {
  return {
    strain: '',
    leafSymptoms: '',
    phLevel: '',
    temperature: '',
    humidity: '',
    medium: 'soil',
    growthStage: 'vegetative',
    temperatureUnit: 'F',
    pestDiseaseFocus: 'general',
    urgency: 'medium',
    additionalNotes: ''
  };
}

export function createDefaultScannerSettings(): ScannerSettings {
  return {
    enableCamera: true,
    autoCapture: false,
    imageQuality: 'high',
    analysisProvider: 'auto',
    showAdvancedOptions: false,
    notifications: {
      analysisComplete: true,
      criticalIssues: true,
      weeklyReports: false
    },
    privacy: {
      saveImages: true,
      shareData: false,
      anonymizeData: true
    }
  };
}