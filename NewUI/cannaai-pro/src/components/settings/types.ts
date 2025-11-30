/**
 * Comprehensive Settings Types for CannaAI Pro
 * Matches all functionality from the legacy UI
 */

export interface Settings {
  aiProvider: AIProviderType;
  lmStudio: LMStudioConfig;
  openRouter: OpenRouterConfig;
  openai: OpenAIConfig;
  gemini: GeminiConfig;
  groq: GroqConfig;
  anthropic: AnthropicConfig;
  agentEvolver: AgentEvolverSettings;
  notifications: NotificationSettings;
  units: UnitSettings;
  system: SystemSettings;
  display: DisplaySettings;
  data: DataSettings;
  integrations: IntegrationSettings;
}

export type AIProviderType =
  | 'lm-studio'
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'anthropic';

export interface LMStudioConfig {
  url: string;
  apiKey: string;
  model: string;
  connected: boolean;
  lastConnected?: string;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  connected: boolean;
  availableModels?: AIModel[];
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  connected: boolean;
  organization?: string;
  projectId?: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  connected: boolean;
  enableSafety?: boolean;
}

export interface GroqConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  connected: boolean;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  connected: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderType;
  capabilities: ModelCapability[];
  contextLength?: number;
  size?: string;
  quantization?: string;
  pricing?: ModelPricing;
  description?: string;
  provider_name?: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

export type ModelCapability =
  | 'text-generation'
  | 'vision'
  | 'image-analysis'
  | 'plant-analysis'
  | 'classification'
  | 'code-generation'
  | 'long-context'
  | 'function-calling'
  | 'embedding'
  | 'multimodal';

export interface ModelPricing {
  prompt?: string;
  completion?: string;
  request?: string;
  image?: string;
}

export interface AgentEvolverSettings {
  enabled: boolean;
  evolutionLevel: EvolutionLevel;
  learningRate: number;
  performanceThreshold: number;
  autoOptimization: boolean;
  riskTolerance: RiskTolerance;
  customPrompts: CustomPrompt[];
  performanceMetrics: PerformanceMetrics;
  evolutionHistory: EvolutionRecord[];
  integrationSettings: AgentIntegrationSettings;
}

export type EvolutionLevel = 'basic' | 'advanced' | 'expert';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type PromptCategory = 'analysis' | 'automation' | 'troubleshooting' | 'optimization' | 'custom';

export interface CustomPrompt {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: PromptCategory;
  enabled: boolean;
  createdAt: string;
  lastUsed: string;
  successRate: number;
  variables?: string[];
  evolutionTarget?: string;
}

export interface PerformanceMetrics {
  accuracy: number;
  responseTime: number;
  resourceUsage: number;
  evolutionProgress: number;
  totalOptimizations: number;
  successfulEvolutions: number;
  failedEvolutions: number;
  averageImprovement: number;
  totalEvolutions?: number;
  successRate?: number;
  activeTemplates?: number;
  contextDepth?: number;
}

export interface EvolutionRecord {
  id: string;
  timestamp: string;
  type: EvolutionType;
  description: string;
  success: boolean;
  improvement: number;
  metadata: Record<string, any>;
}

export type EvolutionType =
  | 'optimization'
  | 'prompt_evolution'
  | 'parameter_tuning'
  | 'architecture_change'
  | 'configuration_change';

export interface AgentIntegrationSettings {
  aiProviderIntegration: boolean;
  automationSync: boolean;
  dataAnalysisIntegration: boolean;
  realTimeOptimization: boolean;
  crossAgentLearning: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  emailAddress?: string;
  notificationTypes: NotificationType[];
}

export interface NotificationType {
  id: string;
  name: string;
  category: 'system' | 'analysis' | 'automation' | 'alerts' | 'updates';
  enabled: boolean;
  level: 'info' | 'warning' | 'error' | 'success';
}

export interface UnitSettings {
  temperature: TemperatureUnit;
  weight: WeightUnit;
  distance: DistanceUnit;
  pressure: PressureUnit;
  light: LightUnit;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit' | 'kelvin';
export type WeightUnit = 'grams' | 'ounces' | 'pounds' | 'kilograms';
export type DistanceUnit = 'centimeters' | 'inches' | 'meters' | 'feet';
export type PressureUnit = 'psi' | 'bar' | 'kpa' | 'hpa';
export type LightUnit = 'lux' | 'foot_candles' | 'ppfd' | 'umol_m2_s';

export interface SystemSettings {
  darkMode: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // in minutes
  dataRetention: number; // in days
  debugMode: boolean;
  betaFeatures: boolean;
  language: string;
  timezone: string;
}

export interface DisplaySettings {
  compactMode: boolean;
  showNotifications: boolean;
  showStatusBar: boolean;
  animationsEnabled: boolean;
  chartRefreshRate: number; // in seconds
  itemsPerPage: number;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface DataSettings {
  exportFormat: ExportFormat;
  backupEnabled: boolean;
  backupInterval: number; // in hours
  cloudSync: boolean;
  compressionEnabled: boolean;
  dataValidation: boolean;
  cachingEnabled: boolean;
  cacheSize: number; // in MB
}

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf' | 'xml';

export interface IntegrationSettings {
  apiEndpoints: APIEndpoint[];
  webhooks: Webhook[];
  thirdPartyServices: ThirdPartyService[];
  securitySettings: SecuritySettings;
}

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  enabled: boolean;
  lastUsed?: string;
  successRate?: number;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  retryAttempts: number;
  lastTriggered?: string;
}

export interface ThirdPartyService {
  id: string;
  name: string;
  type: 'analytics' | 'monitoring' | 'automation' | 'storage' | 'communication';
  config: Record<string, any>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

export interface SecuritySettings {
  apiRateLimit: number;
  enableCORS: boolean;
  allowedOrigins: string[];
  requireAuthentication: boolean;
  sessionTimeout: number; // in minutes
  encryptionEnabled: boolean;
  auditLogging: boolean;
}

// API Response Types
export interface SettingsAPIResponse {
  success: boolean;
  settings?: Settings;
  error?: string;
  message?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details: Record<string, any>;
  provider?: string;
  models?: AIModel[];
}

export interface GetModelsResponse {
  success: boolean;
  models: AIModel[];
  provider: string;
  count: number;
  message: string;
}

// LM Studio Specific Types
export interface LMStudioModel {
  id: string;
  name: string;
  filename: string;
  author: string;
  sizeFormatted: string;
  sizeGB: number;
  quantization: string;
  capabilities: ModelCapability[];
  contextLength: number;
  modified: string;
  filepath: string;
  metadata: Record<string, any>;
}

export interface LMStudioResponse {
  status: string;
  lmStudioRunning: boolean;
  models: LMStudioModel[];
  summary: LMStudioSummary;
  timestamp: string;
}

export interface LMStudioSummary {
  total: number;
  vision: number;
  textOnly: number;
  plantAnalysis: number;
}

// Enhanced AI Evolution Types
export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  evolutionTarget: string;
  variables: string[];
  basePrompt: string;
  evolvedPrompt?: string;
  successRate?: number;
  lastEvolved?: string;
}

export interface EvolutionContext {
  plantData?: PlantData;
  userPreferences?: UserPreferences;
  environmentalFactors?: EnvironmentalFactors;
  historicalData?: HistoricalData;
}

export interface PlantData {
  strain: string;
  symptoms: string[];
  growthStage: string;
  healthScore?: number;
  age?: number;
}

export interface UserPreferences {
  riskTolerance: RiskTolerance;
  focusAreas: string[];
  preferredResponseStyle: 'concise' | 'detailed' | 'technical';
}

export interface EnvironmentalFactors {
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  lightIntensity: number;
  co2: number;
  vpd?: number;
}

export interface HistoricalData {
  previousAnalyses: number;
  successRate: number;
  commonIssues: string[];
  improvements: string[];
}

// UI State Types
export interface SettingsUIState {
  isLoading: boolean;
  isSaving: boolean;
  isTesting: boolean;
  hasChanges: boolean;
  error: string;
  success: string;
  activeTab: SettingsTab;
  selectedProvider: AIProviderType | null;
  testResult: TestConnectionResponse | null;
}

export type SettingsTab =
  | 'ai-providers'
  | 'lm-studio'
  | 'agent-evolver'
  | 'notifications'
  | 'units'
  | 'system'
  | 'display'
  | 'data'
  | 'integrations';

// Component Props Types
export interface AIProviderCardProps {
  provider: AIProviderType;
  config: any;
  isSelected: boolean;
  onProviderSelect: (provider: AIProviderType) => void;
  onTestConnection: (provider: AIProviderType) => void;
  onConfigUpdate: (provider: AIProviderType, config: any) => void;
  testResult?: TestConnectionResponse | null;
  isTesting: boolean;
  models: AIModel[];
}

export interface ModelSelectorProps {
  provider: AIProviderType;
  selectedModel: string;
  models: AIModel[];
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export interface EvolutionTabProps {
  settings: AgentEvolverSettings;
  onSettingsUpdate: (updates: Partial<AgentEvolverSettings>) => void;
  isSaving: boolean;
}

export interface IntegrationCardProps {
  integration: ThirdPartyService;
  onToggle: (id: string, enabled: boolean) => void;
  onConfigure: (id: string, config: Record<string, any>) => void;
  onTest: (id: string) => void;
}