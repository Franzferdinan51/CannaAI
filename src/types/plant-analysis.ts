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
