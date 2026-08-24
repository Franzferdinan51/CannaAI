// API Types for CannaAI Backend Integration

// =============================================================================
// Base API Types
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
  buildMode: 'server' | 'static';
  clientSide?: boolean;
}

export interface ApiError {
  type: string;
  message: string;
  userMessage?: string;
  details?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  count?: number;
}

// =============================================================================
// Plant Analysis Types
// =============================================================================

export interface PlantAnalysisRequest {
  strain: string;
  leafSymptoms: string;
  phLevel?: number;
  temperature?: number;
  humidity?: number;
  medium?: string;
  growthStage?: string;
  temperatureUnit?: 'C' | 'F';
  plantImage?: string; // base64 encoded image
  pestDiseaseFocus?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  additionalNotes?: string;
}

export interface PlantAnalysisResponse {
  success: boolean;
  analysis: PlantAnalysisResult;
  imageInfo?: ImageInfo;
  metadata: AnalysisMetadata;
  diagnosticCapabilities: DiagnosticCapabilities;
  provider: ProviderInfo;
  rateLimit?: RateLimitInfo;
  security: SecurityInfo;
}

export interface PlantAnalysisResult {
  diagnosis: string;
  scientificName?: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  symptomsMatched: string[];
  causes: string[];
  treatment: string[];
  healthScore: number;
  strainSpecificAdvice: string;
  reasoning: {
    step: string;
    explanation: string;
    weight: number;
    evidence: string;
  }[];
  isPurpleStrain: boolean;
  purpleAnalysis: {
    isGenetic: boolean;
    isDeficiency: boolean;
    analysis: string;
  };
  pestsDetected: PestInfo[];
  diseasesDetected: DiseaseInfo[];
  nutrientDeficiencies: NutrientDeficiency[];
  environmentalFactors: EnvironmentalFactor[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  preventativeMeasures: string[];
  imageAnalysis: ImageAnalysis;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  followUpSchedule: string;
  researchReferences: string[];
  prognosis: string;
}

export interface ImageInfo {
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

export interface AnalysisMetadata {
  analysisId: string;
  processingTime: number;
  timestamp: string;
  version: string;
}

export interface DiagnosticCapabilities {
  imageAnalysis: boolean;
  visualDiagnostics: string[];
  textBasedDiagnostics: string[];
  strainSpecificAnalysis: boolean;
  usHempResearchIntegration: boolean;
  exactDosageCalculations: boolean;
  confidenceScoring: boolean;
  treatmentProtocols: boolean;
}

export interface ProviderInfo {
  used: string;
  primary: string;
  available: string[];
  recommendations: string[];
  status: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  window: number;
}

export interface SecurityInfo {
  inputValidation: string;
  sanitization: string;
  rateLimiting: string;
}

export interface PestInfo {
  name: string;
  scientificName: string;
  severity: 'mild' | 'moderate' | 'severe';
  treatment: string;
}

export interface DiseaseInfo {
  name: string;
  pathogen: string;
  severity: 'mild' | 'moderate' | 'severe';
  treatment: string;
}

export interface NutrientDeficiency {
  nutrient: string;
  severity: 'mild' | 'moderate' | 'severe';
  currentLevel?: string;
  optimalLevel: string;
  treatment: string;
}

export interface EnvironmentalFactor {
  factor: string;
  currentValue?: string;
  optimalRange: string;
  correction: string;
}

export interface ImageAnalysis {
  hasImage: boolean;
  visualFindings: string[];
  confidence: number;
  imageQuality: string;
  additionalNotes: string;
}

// =============================================================================
// AI Chat Types
// =============================================================================

export interface ChatRequest {
  message: string;
  mode?: 'chat' | 'thinking';
  context?: PageContext;
  sensorData?: SensorData;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
  provider: string;
  usage?: TokenUsage;
  timestamp: string;
  processingTime: string;
  mode: string;
  buildMode: string;
  fallback: FallbackInfo;
  providerInfo: {
    primary: string;
    available: string[];
  };
  agentEvolver: AgentEvolverInfo;
}

export interface PageContext {
  title?: string;
  page?: string;
  description?: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface FallbackInfo {
  used: boolean;
  reason: string;
  recommendations: string[];
}

export interface AgentEvolverInfo {
  enabled: boolean;
  evolutionMetrics?: any;
  agentLearning?: any[];
  selfEvolutionCapabilities?: {
    selfQuestioning: boolean;
    selfNavigating: boolean;
    selfAttributing: boolean;
    continuousLearning: boolean;
  };
  reason?: string;
}

// =============================================================================
// Sensor Data Types
// =============================================================================

export interface SensorData {
  temperature: number; // Fahrenheit for display
  humidity: number;
  soilMoisture: number;
  lightIntensity: number;
  ph: number;
  ec: number;
  co2: number;
  vpd: number;
  lastUpdated: string;
}

export interface Room {
  id: string;
  name: string;
  temp: number; // Fahrenheit for display
  humidity: number;
  co2: number;
  active: boolean;
}

export interface AutomationSettings {
  watering: {
    enabled: boolean;
    threshold: number;
    schedule: string;
  };
  lighting: {
    enabled: boolean;
    vegSchedule: string;
    flowerSchedule: string;
  };
  climate: {
    enabled: boolean;
    tempMin: number; // Fahrenheit
    tempMax: number; // Fahrenheit
    humidityMin: number;
    humidityMax: number;
  };
}

export interface SensorsResponse {
  success: boolean;
  sensors: SensorData;
  rooms: Room[];
  automation: AutomationSettings;
  timestamp: string;
}

export interface SensorActionRequest {
  action: 'update_automation' | 'toggle_room' | 'water_now' | 'toggle_lights' | 'adjust_climate';
  data: any;
}

export interface SensorActionResponse {
  success: boolean;
  message: string;
  data: {
    sensors: SensorData;
    rooms: Room[];
    automation: AutomationSettings;
  };
}

// =============================================================================
// Strain Management Types
// =============================================================================

export interface Strain {
  id: string;
  name: string;
  type: string;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: {
    ph: {
      range: [number, number];
      medium: string;
    };
    temperature: {
      veg: [number, number];
      flower: [number, number];
    };
    humidity: {
      veg: [number, number];
      flower: [number, number];
    };
    light: {
      veg: string;
      flower: string;
    };
  };
  commonDeficiencies: string[];
  specialNotes: string;
  createdAt?: string;
}

export interface CreateStrainRequest {
  name: string;
  type?: string;
  lineage?: string;
  description?: string;
  isPurpleStrain?: boolean;
  optimalConditions?: Strain['optimalConditions'];
  commonDeficiencies?: string[];
  specialNotes?: string;
}

export interface UpdateStrainRequest extends Partial<CreateStrainRequest> {
  id: string;
}

export interface StrainsResponse {
  success: boolean;
  strains: Strain[];
  count: number;
}

// =============================================================================
// Settings Types
// =============================================================================

export interface Settings {
  aiProvider: string;
  lmStudio: {
    url: string;
    apiKey: string;
    model: string;
  };
  openRouter: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  openai: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  gemini: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  groq: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
    baseUrl: string;
  };
  agentEvolver: AgentEvolverSettings;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  units: {
    temperature: 'fahrenheit' | 'celsius';
    weight: 'grams' | 'ounces';
  };
}

export interface AgentEvolverSettings {
  enabled: boolean;
  evolutionLevel: 'basic' | 'advanced' | 'expert';
  learningRate: number;
  performanceThreshold: number;
  autoOptimization: boolean;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  customPrompts: CustomPrompt[];
  performanceMetrics: {
    accuracy: number;
    responseTime: number;
    resourceUsage: number;
    evolutionProgress: number;
    totalOptimizations: number;
    successfulEvolutions: number;
    failedEvolutions: number;
    averageImprovement: number;
  };
  evolutionHistory: EvolutionRecord[];
  integrationSettings: {
    aiProviderIntegration: boolean;
    automationSync: boolean;
    dataAnalysisIntegration: boolean;
    realTimeOptimization: boolean;
    crossAgentLearning: boolean;
  };
}

export interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'analysis' | 'automation' | 'troubleshooting' | 'optimization' | 'custom';
  enabled: boolean;
  createdAt: string;
  lastUsed: string;
  successRate: number;
}

export interface EvolutionRecord {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  success: boolean;
  improvement: number;
  metadata?: any;
}

export interface SettingsResponse {
  success: boolean;
  settings: Settings;
}

export interface SettingsUpdateRequest {
  action: 'update_provider' | 'switch_provider' | 'update_notifications' | 'update_units' |
         'test_connection' | 'get_models' | 'get_agent_evolver' | 'update_agent_evolver' |
         'add_evolution_record' | 'clear_evolution_history' | 'reset_agent_evolver';
  provider?: string;
  config?: any;
  settings?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ProviderModels {
  success: boolean;
  models: AIModel[];
  provider: string;
  count: number;
  message: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength?: number;
  pricing?: any;
  size?: string;
}

// =============================================================================
// History Types
// =============================================================================

export interface HistoryEntry {
  id: string;
  date: string;
  strain: string;
  diagnosis: string;
  confidence: number;
  healthScore: number;
  notes: string;
  isPurpleStrain: boolean;
  analysisData?: any;
  createdAt: string;
}

export interface CreateHistoryEntryRequest {
  strain: string;
  diagnosis: string;
  confidence?: number;
  healthScore?: number;
  notes?: string;
  isPurpleStrain?: boolean;
  analysisData?: any;
}

export interface HistoryResponse {
  success: boolean;
  history: HistoryEntry[];
  count: number;
}

// =============================================================================
// WebSocket Types
// =============================================================================

export interface SocketMessage {
  text: string;
  senderId: string;
  timestamp: string;
}

export interface SocketEvents {
  connect: () => void;
  disconnect: () => void;
  message: (data: SocketMessage) => void;
  sensor_update: (data: SensorData) => void;
  room_update: (data: Room) => void;
  automation_update: (data: AutomationSettings) => void;
  analysis_progress: (data: { progress: number; message: string }) => void;
  notification: (data: { type: string; message: string; level: 'info' | 'warning' | 'error' }) => void;
}

export interface SocketConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: string;
  reconnectAttempts: number;
}

// =============================================================================
// UI State Types
// =============================================================================

export interface LoadingState {
  isLoading: boolean;
  isFetching?: boolean;
  isMutating?: boolean;
  error?: string | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterState {
  search?: string;
  status?: string;
  dateRange?: [string, string];
  category?: string;
}

// =============================================================================
// Form Types
// =============================================================================

export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T = any> {
  data: T;
  errors: FormFieldError[];
  touched: string[];
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// =============================================================================
// Common Utility Types
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';