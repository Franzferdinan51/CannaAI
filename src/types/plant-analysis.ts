// Plant Health Analysis Types - Adapted from NexusDocs for CannaAI

export interface ProcessedPlantDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  images: string[];
  analysis?: PlantHealthAnalysis;
  status: 'pending' | 'processing' | 'verifying' | 'completed' | 'error';
  isCriticalIssue?: boolean;
  lineage?: string[]; // Tracks which models were used
  contentBlob?: Blob;
  group?: string; // Batch name
}

export interface PlantEntity {
  name: string;
  type: 'strain' | 'nutrient' | 'pest' | 'disease' | 'deficiency' | 'symptom';
  role: string;
  context: string;
  isConfirmed?: boolean;
}

export interface PlantHealthAnalysis {
  summary: string;
  entities: PlantEntity[];
  keyInsights: string[];
  sentiment: 'healthy' | 'warning' | 'critical' | 'unknown';
  analysisDate?: string;
  flaggedIssues: string[];
  locations?: string[]; // Parts of plant affected
  recommendations?: string[]; // Treatment suggestions
  visualObjects?: string[]; // Objects found in images (mites, spots, etc.)
  issueType?: string; // e.g., "Nutrient Deficiency", "Pest Infestation", "Disease"
  confidenceScore?: number; // 0-100 score of analysis certainty
  timelineEvents?: { date: string; event: string }[]; // Growth timeline
  strainInfo?: {
    strainName?: string;
    phenotype?: string;
    stage?: string;
    floweringDays?: number;
  };
  environmentalConditions?: {
    temperature?: string;
    humidity?: string;
    ph?: string;
    ec?: string;
  };
  provider?: string;
  timestamp?: string;
  rawResponse?: string;
}

export type PlantAnalysisUrgency = 'low' | 'medium' | 'high' | 'critical';
export type PlantAnalysisSeverity =
  | 'none'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'critical'
  | PlantAnalysisUrgency
  | string;

export interface PlantAnalysisLikelyCause {
  cause: string;
  confidence: number;
  evidence: string;
}

export interface HealthScoreBreakdownEntry {
  category: string;
  score: number;
  reason: string;
}

export interface DetectedIssue {
  type: string;
  name: string;
  severity: PlantAnalysisSeverity;
  confidence: number;
  evidence: string[];
}

export interface EnvironmentRiskFactor {
  factor: string;
  currentValue?: string;
  optimalRange?: string;
  riskLevel: PlantAnalysisUrgency;
  reason: string;
}

export interface EnvironmentRiskAssessment {
  overallRisk: PlantAnalysisUrgency;
  summary: string;
  contributingFactors: EnvironmentRiskFactor[];
  monitoringPriorities: string[];
}

export interface PrioritizedActionItem {
  priority: number;
  action: string;
  reason: string;
  relatedIssue?: string;
}

export interface PrioritizedActionPlan {
  immediate: PrioritizedActionItem[];
  within24Hours: PrioritizedActionItem[];
  within7Days: PrioritizedActionItem[];
}

export interface LegacyPlantAnalysisRecommendations {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

export interface PlantAnalysisExplainabilityReport {
  urgencyReasons: string[];
  healthScoreBreakdown: HealthScoreBreakdownEntry[];
  detectedIssues: DetectedIssue[];
  environmentRiskAssessment: EnvironmentRiskAssessment;
  prioritizedActionPlan: PrioritizedActionPlan;
  likelyCauses: PlantAnalysisLikelyCause[];
  evidenceObservations: string[];
  uncertainties: string[];
  rawResponseText?: string;
  rawFallbackText?: string;
  reportVersion: 'report-v2';
  reportSchemaVersion: string;
}

/**
 * Extended explainability report with enriched explanations
 */
export interface PlantAnalysisEnrichedReport extends PlantAnalysisExplainabilityReport {
  // Confidence assessment
  confidenceAssessment?: ConfidenceAssessment;
  // Follow-up planning
  followUpSchedule?: FollowUpSchedule;
  // Prognosis
  prognosis?: Prognosis;
  // Urgency deep dive
  urgencyDeepDive?: UrgencyDeepDive;
  // Health score analysis
  healthScoreAnalysis?: HealthScoreAnalysis;
  // Evidence narrative
  evidenceNarrative?: EvidenceNarrative;
  // Uncertainty analysis
  uncertaintyAnalysis?: UncertaintyAnalysis;
  // Recommendation rationale
  recommendationRationale?: RecommendationRationale;
}

export interface PlantAnalysisApiResult extends PlantAnalysisExplainabilityReport {
  diagnosis: string;
  confidence: number;
  severity: PlantAnalysisSeverity;
  healthScore: number;
  urgency: PlantAnalysisUrgency;
  recommendations: LegacyPlantAnalysisRecommendations;
  priorityActions: string[];
  analysisMetadata?: Record<string, unknown>;
  [key: string]: any;
}

export interface StrainRelationship {
  id: string;
  name: string;
  type: 'sativa' | 'indica' | 'hybrid';
  connections: string[];
  isParent?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface ModelConfig {
  priority: ('gemini' | 'openrouter' | 'lmstudio' | 'lmstudio2' | 'lmstudio3' | 'lmstudio4')[];
  enabled: {
    gemini: boolean;
    openrouter: boolean;
    lmstudio: boolean;
    lmstudio2: boolean;
    lmstudio3: boolean;
    lmstudio4: boolean;
  };
  geminiKey: string;
  geminiModel: string;
  openRouterModel: string;
  openRouterKey: string;
  lmStudioEndpoint: string;
  lmStudioModel: string;
  lmStudioEndpoint2: string;
  lmStudioModel2: string;
  lmStudioEndpoint3: string;
  lmStudioModel3: string;
  lmStudioEndpoint4: string;
  lmStudioModel4: string;
  dualCheckMode: boolean; // Enable cross-verification
  preferredVerifier: 'auto' | 'gemini' | 'openrouter' | 'lmstudio' | 'lmstudio2' | 'lmstudio3' | 'lmstudio4';
  parallelAnalysis: boolean; // Enable parallel execution
  swarmMode: 'consensus' | 'distributed'; // 'consensus' = all on 1 doc; 'distributed' = each on different doc
}

// V2 Enhanced Structured Output Types for Explainable Analysis
export interface HealthScoreBreakdownEntryV2 {
  score: number;
  rationale: string;
}

export interface HealthScoreBreakdownV2 {
  vigor: HealthScoreBreakdownEntryV2;
  leafCondition: HealthScoreBreakdownEntryV2;
  pestFree: HealthScoreBreakdownEntryV2;
  environmentOptimal: HealthScoreBreakdownEntryV2;
  growthStageAppropriate: HealthScoreBreakdownEntryV2;
  rootHealth: HealthScoreBreakdownEntryV2;
}

export interface PlantAnalysisLikelyCauseV2 {
  cause: string;
  confidence: number;
  evidence: string;
  rationale: string;
}

export interface RecommendationItem {
  action: string;
  dosage?: string;
  method?: string;
  timing?: string;
  rationale?: string;
  expectedResponse?: string;
}

export interface PlantAnalysisRecommendationsV2 {
  immediate: (string | RecommendationItem)[];
  shortTerm: (string | RecommendationItem)[];
  longTerm: (string | RecommendationItem)[];
}

export interface ConfidenceAssessment {
  overall: number;
  drivers: string[];
  limitations: string[];
}

export interface FollowUpSchedule {
  checkAfterDays: number;
  whatToMonitor: string[];
  successIndicators: string[];
  escalationTriggers: string[];
}

export interface Prognosis {
  expectedOutcome: string;
  timeframe: string;
  factorsAffectingOutcome: string[];
  fullRecoveryExpected: boolean;
}

/**
 * Enriched Report Types for Production-Quality Explanations
 */
export interface UrgencyDeepDive {
  urgencyLevel: PlantAnalysisUrgency;
  primaryDrivers: string[];
  contributingFactors: string[];
  escalationRisk: string;
  timeSensitivity: string;
  comparisonToBaseline: string;
}

export interface HealthCategoryDetail {
  category: string;
  score: number;
  interpretation: string;
  contributingFactors: string[];
  improvementSuggestions: string[];
}

export interface ScoreDriver {
  factor: string;
  impactOnScore: 'positive' | 'negative' | 'neutral';
  magnitude: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface HealthScoreAnalysis {
  overallScore: number;
  scoreInterpretation: string;
  categoryAnalysis: HealthCategoryDetail[];
  biggestStrengths: string[];
  areasNeedingAttention: string[];
  scoreDrivers: ScoreDriver[];
}

export interface ConflictingSignal {
  observation1: string;
  observation2: string;
  resolution: string;
}

export interface EvidenceQuality {
  overallQuality: 'high' | 'medium' | 'low';
  imageContribution: string;
  dataCompleteness: string;
  reliabilityFactors: string[];
}

export interface EvidenceNarrative {
  keyFindings: string[];
  supportingObservations: string[];
  conflictingSignals: ConflictingSignal[];
  evidenceQuality: EvidenceQuality;
}

export interface UncertaintyAnalysis {
  knownUnknowns: string[];
  dataGaps: string[];
  diagnosticLimitations: string[];
  confidenceReducingFactors: string[];
  additionalDataNeeded: string[];
}

export interface RecommendationDetail {
  action: string;
  rationale: string;
  scientificBasis: string;
  alternativeApproaches: string[];
  successMetrics: string[];
}

export interface RecommendationRationale {
  immediate: RecommendationDetail[];
  shortTerm: RecommendationDetail[];
  longTerm: RecommendationDetail[];
  prioritizationLogic: string;
  expectedOutcomes: string[];
}

/**
 * V2 Enhanced Plant Analysis Result - Structured for explainability
 */
export interface PlantAnalysisResultV2 {
  // Core diagnosis
  diagnosis: string;
  summary: string;
  confidence: number;
  severity: PlantAnalysisSeverity;

  // Urgency with explicit reasoning
  urgency: PlantAnalysisUrgency;
  urgencyReasons: string[];

  // Health scoring with breakdown
  healthScore: number;
  healthScoreBreakdown: HealthScoreBreakdownV2;

  // Causal analysis with confidence
  likelyCauses: PlantAnalysisLikelyCauseV2[];

  // Evidence-based observations
  evidenceObservations: string[];

  // Transparency about limitations
  uncertainties: string[];

  // Actionable recommendations by timeframe
  recommendations: PlantAnalysisRecommendationsV2;

  // Detected issues (legacy compatibility)
  detectedIssues?: DetectedIssue[];

  // Environment risk assessment
  environmentRiskAssessment?: EnvironmentRiskAssessment;

  // Prioritized action plan
  prioritizedActionPlan?: PrioritizedActionPlan;

  // Confidence assessment
  confidenceAssessment?: ConfidenceAssessment;

  // Follow-up planning
  followUpSchedule?: FollowUpSchedule;

  // Prognosis
  prognosis?: Prognosis;

  // Metadata
  analysisMetadata?: {
    provider?: string;
    model?: string;
    processingTime?: number;
    imageAnalysis?: boolean;
    schemaVersion: '2.0.0';
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  references?: string[];
}

export interface CultivationState {
  documents: ProcessedPlantDocument[];
  strains: StrainRelationship[];
  selectedDocId: string | null;
  isProcessing: boolean;
  view: 'dashboard' | 'documents' | 'analytics' | 'strains' | 'chat' | 'settings' | 'document_detail';
  config: ModelConfig;
  chatHistory: ChatMessage[];
  processingQueue: string[];
  busyProviders: string[]; // Tracks which models are currently busy
}
