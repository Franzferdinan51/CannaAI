/**
 * Comprehensive Plant Management Types for CannaAI Pro
 * Migrated from legacy dashboard with enhanced functionality
 */

// Core Plant Types
export interface Plant {
  id: string;
  name: string;
  strainId: string;
  strain?: PlantStrain;
  stage: GrowthStage;
  health: PlantHealth;
  age: number; // days
  plantedDate: string;
  location: PlantLocation;
  images: PlantImage[];
  notes: string;
  tags: string[];
  isActive: boolean;
  metadata: PlantMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface PlantStrain {
  id: string;
  name: string;
  type: StrainType;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: OptimalConditions;
  commonDeficiencies: string[];
  characteristics: StrainCharacteristics;
  images: PlantImage[];
  growingDifficulty: DifficultyLevel;
  floweringTime: number; // days
  thcLevel?: number;
  cbdLevel?: number;
  effects?: string[];
  medicalUses?: string[];
  flavors?: string[];
  aroma?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlantHealth {
  score: number; // 0-100
  status: HealthStatus;
  lastAnalysis?: string;
  issues: PlantIssue[];
  recommendations: string[];
  warnings: PlantWarning[];
  nextCheckDate?: string;
  history: HealthRecord[];
}

export interface PlantIssue {
  id: string;
  type: IssueType;
  severity: SeverityLevel;
  description: string;
  symptoms: string[];
  possibleCauses: string[];
  recommendations: string[];
  detectedAt: string;
  resolvedAt?: string;
  images: PlantImage[];
}

export interface PlantWarning {
  id: string;
  type: WarningType;
  message: string;
  level: WarningLevel;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface HealthRecord {
  id: string;
  date: string;
  score: number;
  status: HealthStatus;
  notes?: string;
  analysisResult?: AnalysisResult;
  environmentalData?: EnvironmentalData;
}

// Growth and Lifecycle
export type GrowthStage =
  | 'germination'
  | 'seedling'
  | 'vegetative'
  | 'pre-flowering'
  | 'flowering'
  | 'ripening'
  | 'harvesting'
  | 'cured'
  | 'archived';

export interface PlantLocation {
  id: string;
  name: string;
  type: LocationType;
  room?: string;
  rack?: string;
  position?: string;
  environment: EnvironmentalProfile;
}

export interface PlantMetadata {
  source: PlantSource;
  genetics?: string;
  phenotype?: string;
  batchNumber?: string;
  motherPlantId?: string;
  cloneGeneration?: number;
  isMotherPlant: boolean;
  expectedYield?: number; // grams
  actualYield?: number; // grams
  harvestDate?: string;
  cureDate?: string;
  quality?: QualityGrade;
}

// Environmental Data
export interface EnvironmentalData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightIntensity: number;
  ph: number;
  ec: number;
  co2: number;
  vpd: number;
  timestamp: string;
  deviceId?: string;
  location: string;
}

export interface EnvironmentalProfile {
  idealTemperature: { min: number; max: number };
  idealHumidity: { min: number; max: number };
  idealPH: { min: number; max: number };
  idealEC: { min: number; max: number };
  lightSchedule: LightSchedule;
  medium: GrowthMedium;
}

export interface LightSchedule {
  vegetativeHours: number;
  floweringHours: number;
  currentSchedule: number;
  lastChanged?: string;
  sunriseTime?: string;
  sunsetTime?: string;
}

// Analysis and AI Integration
export interface AnalysisResult {
  id: string;
  plantId: string;
  diagnosis?: string;
  urgency: UrgencyLevel;
  confidence: number;
  healthScore: number;
  causes?: string[];
  strainSpecificAdvice?: string;
  reasoning?: AnalysisReasoning[];
  recommendations: AnalysisRecommendations;
  provider: AnalysisProvider;
  metadata: AnalysisMetadata;
  createdAt: string;
}

export interface AnalysisReasoning {
  step: string;
  explanation: string;
  weight: number;
  confidence: number;
}

export interface AnalysisRecommendations {
  immediate?: string[];
  shortTerm?: string[];
  longTerm?: string[];
  overall?: string[];
}

export interface AnalysisMetadata {
  provider: string;
  model?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  processingTime: number;
  dataPoints: number;
  confidence: number;
}

// Images and Media
export interface PlantImage {
  id: string;
  url: string;
  filename: string;
  description?: string;
  type: ImageType;
  analysis?: ImageAnalysis;
  capturedAt: string;
  fileSize: number;
  dimensions: ImageDimensions;
  isPrimary: boolean;
  tags: string[];
}

export interface ImageAnalysis {
  healthScore?: number;
  detectedIssues?: string[];
  recommendations?: string[];
  confidence?: number;
  analysisDate: string;
  model?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// Plant Actions and Operations
export interface PlantAction {
  id: string;
  plantId: string;
  type: ActionType;
  description: string;
  scheduledAt?: string;
  completedAt?: string;
  status: ActionStatus;
  assignedTo?: string;
  notes?: string;
  images?: PlantImage[];
  createdAt: string;
}

export interface PlantTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  plantIds: string[];
  schedule: TaskSchedule;
  status: TaskStatus;
  assignedTo?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  materials?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskSchedule {
  type: ScheduleType;
  frequency?: string; // cron expression
  startDate?: string;
  endDate?: string;
  nextRun?: string;
  lastRun?: string;
  isActive: boolean;
}

// Inventory and Categories
export interface PlantCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  criteria: CategoryCriteria[];
  plantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'inRange';
  value: any;
  value2?: any; // for range operators
}

export interface PlantInventory {
  totalPlants: number;
  activePlants: number;
  archivedPlants: number;
  byStage: Record<GrowthStage, number>;
  byHealth: Record<HealthStatus, number>;
  byLocation: Record<string, number>;
  byStrain: Record<string, number>;
  estimatedYield: number;
  averageHealth: number;
  upcomingTasks: number;
  overdueTasks: number;
}

// Filtering and Search
export interface PlantFilter {
  search?: string;
  strainIds?: string[];
  stages?: GrowthStage[];
  healthStatuses?: HealthStatus[];
  locations?: string[];
  tags?: string[];
  ageRange?: { min: number; max: number };
  healthRange?: { min: number; max: number };
  isActive?: boolean;
  hasImages?: boolean;
  hasIssues?: boolean;
  sortBy?: PlantSortField;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PlantSearchResult {
  plants: Plant[];
  total: number;
  filters: PlantFilter;
  facets: SearchFacets;
  took: number; // milliseconds
}

export interface SearchFacets {
  strains: Array<{ id: string; name: string; count: number }>;
  stages: Array<{ stage: GrowthStage; count: number }>;
  healthStatuses: Array<{ status: HealthStatus; count: number }>;
  locations: Array<{ id: string; name: string; count: number }>;
  tags: Array<{ tag: string; count: number }>;
}

// UI State and Forms
export interface PlantManagementState {
  plants: Plant[];
  strains: PlantStrain[];
  inventory: PlantInventory;
  selectedPlant?: Plant;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  filter: PlantFilter;
  searchResults?: PlantSearchResult;
  viewMode: 'grid' | 'list';
  activeTab: PlantTab;
  error?: string;
  success?: string;
}

export interface PlantFormData {
  name: string;
  strainId: string;
  stage: GrowthStage;
  plantedDate: string;
  locationId: string;
  notes: string;
  tags: string[];
  images: File[];
  metadata: Partial<PlantMetadata>;
}

export interface StrainFormData {
  name: string;
  type: StrainType;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: OptimalConditions;
  commonDeficiencies: string[];
  characteristics: StrainCharacteristics;
  growingDifficulty: DifficultyLevel;
  floweringTime: number;
  thcLevel?: number;
  cbdLevel?: number;
  effects: string[];
  medicalUses: string[];
  flavors: string[];
  aroma: string[];
}

// API Response Types
export interface PlantAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PlantsResponse extends PlantAPIResponse {
  data?: {
    plants: Plant[];
    inventory: PlantInventory;
    facets: SearchFacets;
  };
}

export interface PlantResponse extends PlantAPIResponse {
  data?: Plant;
}

export interface StrainsResponse extends PlantAPIResponse {
  data?: {
    strains: PlantStrain[];
    total: number;
  };
}

export interface AnalysisResponse extends PlantAPIResponse {
  data?: {
    result: AnalysisResult;
    recommendations?: string[];
  };
}

// Enum Types
export type StrainType = 'indica' | 'sativa' | 'hybrid' | 'ruderalis' | 'autoflowering';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type IssueType = 'nutrient' | 'pest' | 'disease' | 'environmental' | 'physical' | 'genetic';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type WarningType = 'environment' | 'maintenance' | 'harvest' | 'health' | 'system';
export type WarningLevel = 'info' | 'warning' | 'error' | 'critical';
export type LocationType = 'room' | 'tent' | 'greenhouse' | 'outdoor' | 'container';
export type GrowthMedium = 'soil' | 'hydroponic' | 'aeroponic' | 'coco' | 'rockwool';
export type PlantSource = 'seed' | 'clone' | 'tissue' | 'mother';
export type QualityGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnalysisProvider = 'ai' | 'rule-based' | 'hybrid';
export type ImageType = 'overview' | 'leaf' | 'flower' | 'root' | 'issue' | 'harvest' | 'macro';
export type ActionType = 'watering' | 'feeding' | 'pruning' | 'training' | 'treating' | 'harvesting' | 'transplanting' | 'cleaning';
export type ActionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
export type TaskType = 'watering' | 'feeding' | 'pruning' | 'monitoring' | 'maintenance' | 'harvest' | 'analysis';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom' | 'triggered';
export type PlantSortField = 'name' | 'age' | 'health' | 'stage' | 'plantedDate' | 'updatedAt';
export type PlantTab = 'overview' | 'plants' | 'strains' | 'analysis' | 'inventory' | 'tasks' | 'settings';

// Supporting Interfaces
export interface OptimalConditions {
  ph: { range: [number, number]; medium: GrowthMedium };
  temperature: { veg: [number, number]; flower: [number, number] };
  humidity: { veg: [number, number]; flower: [number, number] };
  light: { veg: string; flower: string };
  ec?: { range: [number, number] };
  vpd?: { range: [number, number] };
}

export interface StrainCharacteristics {
  growthPattern: string;
  plantSize: 'small' | 'medium' | 'large' | 'extra-large';
  floweringTime: number;
  yield: 'low' | 'medium' | 'high' | 'extra-high';
  resistance: {
    mold: ResistanceLevel;
    pests: ResistanceLevel;
    disease: ResistanceLevel;
  };
  climate: ClimateType[];
}

export type ResistanceLevel = 'low' | 'medium' | 'high' | 'very-high';
export type ClimateType = 'tropical' | 'temperate' | 'mediterranean' | 'arid' | 'continental' | 'maritime';

// Component Props
export interface PlantCardProps {
  plant: Plant;
  onSelect: (plant: Plant) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (plantId: string) => void;
  onAnalyze: (plantId: string) => void;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
}

export interface PlantFormProps {
  plant?: Plant;
  onSubmit: (data: PlantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface PlantDetailsProps {
  plant: Plant;
  onEdit: (plant: Plant) => void;
  onDelete: (plantId: string) => void;
  onAnalyze: (plantId: string) => void;
  onUpdate: (updates: Partial<Plant>) => void;
}

export interface StrainFormProps {
  strain?: PlantStrain;
  onSubmit: (data: StrainFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface PlantSearchProps {
  filter: PlantFilter;
  onFilterChange: (filter: PlantFilter) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
}