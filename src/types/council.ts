// AI Council System Type Definitions for CannaAI

export type SessionMode =
  | 'proposal'           // Present and evaluate proposals
  | 'deliberation'       // Multi-bot deliberation on a topic
  | 'inquiry'            // Question-answering with research
  | 'research'           // Deep research with cited sources
  | 'swarm'              // Swarm intelligence consensus
  | 'swarm-coding'       // Multi-phase code generation pipeline
  | 'prediction'         // Prediction market & superforecasting
  | 'advisory'           // Get advice from specialist council
  | 'arbitration'        // Resolve disputes between conflicting views
  | 'negotiation'        // Find middle ground in decisions
  | 'brainstorming'      // Generate diverse ideas
  | 'peer-review'        // Review plans with critical feedback
  | 'strategic-planning' // Long-term grow strategy development
  | 'design-review'      // Review grow room designs
  | 'risk-assessment';   // Evaluate risks of decisions

export type VoteType = 'agree' | 'disagree' | 'abstain';

export interface CouncilPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  expertise: string[];
  modelId: string;           // Which AI model this bot uses
  temperature: number;
  systemPrompt: string;
  voteWeight: number;        // Weight for voting (1-5)
  avatar?: string;
  isActive: boolean;
}

// Cultivation-specific personas
export const CULTIVATION_PERSONAS: CouncilPersona[] = [
  {
    id: 'master-grower',
    name: 'Dr. Sylvia Green',
    role: 'Master Grower',
    description: '30+ years cultivating cannabis, expert in all growth stages',
    expertise: ['nutrient-management', 'pest-control', 'harvesting', 'curing', 'yield-optimization'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    systemPrompt: 'You are Dr. Sylvia Green, a master cannabis cultivator with 30+ years of experience. Provide practical, proven advice based on real-world growing experience.',
    voteWeight: 5,
    isActive: true
  },
  {
    id: 'botanist',
    name: 'Dr. James Chen',
    role: 'Plant Botanist',
    description: 'PhD in Plant Physiology, expert in plant biology and pathology',
    expertise: ['plant-physiology', 'nutrient-uptake', 'diseases', 'genetics', 'cloning'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.8,
    systemPrompt: 'You are Dr. James Chen, a plant botanist specializing in cannabis. Provide scientifically accurate explanations with biological context.',
    voteWeight: 4,
    isActive: true
  },
  {
    id: 'horticulturist',
    name: 'Maria Rodriguez',
    role: 'Horticulturist',
    description: 'Expert in controlled environment agriculture and lighting',
    expertise: ['lighting', 'climate-control', 'hydroponics', 'aeroponics', 'automation'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    systemPrompt: 'You are Maria Rodriguez, a horticulturist specializing in controlled environment agriculture. Focus on optimizing growing conditions.',
    voteWeight: 4,
    isActive: true
  },
  {
    id: 'pest-expert',
    name: 'Tom Patterson',
    role: 'IPM Specialist',
    description: 'Integrated Pest Management expert, organic solutions focus',
    expertise: ['pests', 'diseases', 'organic-treatments', 'prevention', 'beneficial-insects'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.6,
    systemPrompt: 'You are Tom Patterson, an IPM specialist. Prioritize organic and preventative solutions for pest and disease issues.',
    voteWeight: 4,
    isActive: true
  },
  {
    id: 'breeder',
    name: 'Sarah Kushman',
    role: 'Cannabis Breeder',
    description: '15+ years breeding, expert in genetics and phenotype hunting',
    expertise: ['breeding', 'genetics', 'phenotype-hunting', 'stabilization', 'lineage'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    systemPrompt: 'You are Sarah Kushman, a cannabis breeder. Provide insights on genetics, breeding projects, and phenotype selection.',
    voteWeight: 3,
    isActive: true
  },
  {
    id: 'tech-expert',
    name: 'Alex Tech',
    role: 'Cultivation Technology Expert',
    description: 'Specialist in grow automation, sensors, and data analytics',
    expertise: ['automation', 'sensors', 'data-analysis', 'software', 'hardware'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.6,
    systemPrompt: 'You are Alex Tech, a cultivation technology expert. Recommend tech solutions for automation, monitoring, and data analysis.',
    voteWeight: 3,
    isActive: true
  },
  {
    id: 'business-advisor',
    name: 'Prof. Michael Stone',
    role: 'Cannabis Business Advisor',
    description: 'Expert in cannabis business operations and compliance',
    expertise: ['business', 'compliance', 'regulations', 'scaling', 'efficiency'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.5,
    systemPrompt: 'You are Prof. Michael Stone, a cannabis business advisor. Consider business implications, compliance, and operational efficiency.',
    voteWeight: 2,
    isActive: true
  },
  {
    id: 'chemist',
    name: 'Dr. Lisa Chang',
    role: 'Cannabis Chemist',
    description: 'Expert in cannabinoids, terpenes, and extraction science',
    expertise: ['cannabinoids', 'terpenes', 'extraction', 'testing', 'potency'],
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    systemPrompt: 'You are Dr. Lisa Chang, a cannabis chemist. Explain chemical aspects of cannabis, including cannabinoids, terpenes, and plant chemistry.',
    voteWeight: 3,
    isActive: true
  }
];

export interface CouncilMessage {
  id: string;
  sessionId: string;
  personaId: string;
  personaName: string;
  content: string;
  timestamp: string;
  metadata?: {
    sources?: string[];
    confidence?: number;
    tokens?: number;
  };
}

export interface CouncilVote {
  personaId: string;
  personaName: string;
  vote: VoteType;
  reasoning: string;
  confidence: number; // 0-1
}

export interface VotingResult {
  agree: number;
  disagree: number;
  abstain: number;
  totalWeightedScore: number;
  consensus: 'strong-agree' | 'weak-agree' | 'neutral' | 'weak-disagree' | 'strong-disagree';
  votes: CouncilVote[];
}

export interface ArgumentClaim {
  id: string;
  claim: string;
  evidence: string[];
  conclusion: string;
  confidence: number;
  proposedBy: string;
}

export interface PredictionMarketItem {
  id: string;
  question: string;
  category: 'yield' | 'harvest-date' | 'potency' | 'quality' | 'risk';
  predictedOutcome: string;
  confidence: number;
  reasoning: string;
  botId: string;
  botName: string;
  timestamp: string;
  resolution?: {
    actualOutcome: string;
    accuracy: number;
    resolvedAt: string;
  };
}

export interface SwarmPhase {
  id: string;
  name: string;
  description: string;
  assignees: string[]; // persona IDs
  status: 'pending' | 'in-progress' | 'completed';
  output?: string;
}

export interface SwarmCodingPipeline {
  id: string;
  task: string;
  phases: SwarmPhase[];
  currentPhase: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  timestamp: string;
}

export interface MemoryEntry {
  id: string;
  personaId: string;
  sessionId: string;
  topic: string;
  content: string;
  importance: number; // 0-1
  createdAt: string;
  expiresAt: string; // 30 days default
  accessCount: number;
  lastAccessed: string;
}

export interface SessionMetrics {
  sessionId: string;
  totalMessages: number;
  averageResponseTime: number;
  consensusRate: number; // 0-1
  participantEngagement: Map<string, number>; // personaId -> engagement score
  predictionAccuracy?: number; // for resolved predictions
  userSatisfaction?: number; // 0-1
}

export interface CouncilSession {
  id: string;
  mode: SessionMode;
  topic: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  participants: string[]; // persona IDs
  messages: CouncilMessage[];
  votes?: VotingResult;
  arguments?: ArgumentClaim[];
  predictions?: PredictionMarketItem[];
  swarmPipeline?: SwarmCodingPipeline;
  metrics?: SessionMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CouncilConfig {
  maxParticipants: number;
  sessionTimeout: number; // minutes
  memoryRetentionDays: number;
  votingThreshold: number; // minimum weighted score to pass
  enableConsensus: boolean;
  enablePrediction: boolean;
  defaultModel: string;
  defaultTemperature: number;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    sessionId?: string;
    personaId?: string;
    category: string;
    timestamp: string;
    tags: string[];
  };
}

export interface SemanticSearchResult {
  document: VectorDocument;
  similarity: number;
  highlight?: string;
}

export interface AdaptiveOrchestrationConfig {
  enableAutoOptimization: boolean;
  optimizationInterval: number; // minutes
  metricsWindow: number; // number of sessions to consider
  qualityThreshold: number; // minimum quality score
  consensusThreshold: number; // minimum consensus rate
  predictionWindow: number; // sessions to look ahead for predictions
}

export interface OrchestrationAction {
  type: 'add-participant' | 'remove-participant' | 'adjust-model' | 'adjust-temperature' | 'change-mode' | 'none';
  reasoning: string;
  personaId?: string;
  newModelId?: string;
  newTemperature?: string;
  newMode?: SessionMode;
}
