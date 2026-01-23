
export interface TrainingConfig {
  model_name: string;
  environment: 'AppWorld' | 'WebShop' | 'CannabisGrower-v2' | 'CryptoTrader-Pro' | 'CyberSecSim' | 'PyBoy-PokemonRed' | 'PyBoy-SuperMario' | 'GBA-FireEmblem' | 'GBA-Zelda' | 'ProteinFolding-Alpha' | 'MuJoCo-Ant' | 'SWE-Bench-Lite' | 'SocialSim-Village' | 'TrafficControl-AI';
  api_key: string;
  // Local / Custom LLM Support
  llm_base_url?: string;
  llm_provider?: 'OpenAI' | 'Anthropic' | 'LM Studio' | 'Ollama' | 'vLLM' | 'Google Gemini';

  learning_rate: number;
  batch_size: number;
  epochs: number;
  mode: 'Basic GRPO' | 'Full AgentEvolver';
  use_reme: boolean;

  // --- AgentEvolver Specifics ---
  evolution_strategy?: 'genetic' | 'evolutionary_strategy' | 'random_search';
  population_size?: number;
  generations?: number;
  mutation_rate?: number;
  crossover_rate?: number;
  fitness_metric?: 'success_rate' | 'reward' | 'efficiency';

  // External App Connections
  external_api_url?: string;
  external_api_token?: string;
  webhook_url?: string;
  // Output
  output_dir: string;
}

export interface GeminiConfig {
  useSearchGrounding: boolean;
  useMapsGrounding: boolean;
  useThinkingMode: boolean;
  thinkingBudget: number;
  voiceName: string;
}

export interface IntegrationConfig {
    serviceKey: string; // The key external apps use to call US
    webhookUrl: string; // The URL we call events to
    webhookSecret: string;
    enabled: boolean;
}

export interface AppSettings {
  // LLM Connection (Chat Interface)
  provider: 'OpenAI' | 'Anthropic' | 'LM Studio' | 'Ollama' | 'vLLM' | 'Google Gemini';
  baseUrl: string;
  apiKey: string;
  modelId: string;
  contextWindow: number;
  temperature: number;

  // UI & Experience
  theme: 'default' | 'high-contrast' | 'cyberpunk';
  soundEffects: boolean;
  streamResponse: boolean;
  autoScroll: boolean;

  // System
  logRetention: number; // lines
  analyticsEnabled: boolean;

  // Gemini Specifics
  gemini: GeminiConfig;

  // External Integration
  integration?: IntegrationConfig;
}

// --- NEW AGENT SPECIFIC SETTINGS ---
export interface AgentSettings {
  provider: 'Google Gemini' | 'OpenRouter' | 'LM Studio' | 'Ollama';
  apiKey: string;
  model: string;
  baseUrl?: string; // Optional for local
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface MetricPoint {
  step: number;
  reward: number;
  success_rate: number;
  loss: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' | 'HUMAN_FEEDBACK' | 'METRIC';
  message: string;
}

export interface ExperienceItem {
  id: string;
  task: string;
  trajectory: string;
  outcome: 'Success' | 'Failure';
  reflection: string;
  timestamp: string;
  // New Fields for Enhanced View
  reward?: number;
  environment?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  // Advanced UI features
  thought?: string;      // Deep thinking chain-of-thought
  sources?: { title: string; url: string }[]; // Web search citations
  images?: string[];     // Game screenshots or artifacts
  videos?: string[];
  audio?: string;        // Base64 audio
  isTrainingTrigger?: boolean; // Visual indicator if this started a job
}

export interface SystemStatus {
  training_active: boolean;
  env_service: 'online' | 'offline';
  reme_service: 'online' | 'offline';
  backend_connection: boolean;
}

export type View = 'dashboard' | 'config' | 'autotrain' | 'logs' | 'memory' | 'chat' | 'settings' | 'media';

// --- AGENT ARCHITECT TYPES ---

export type AgentToolType =
  | 'navigate'
  | 'updateConfig'
  | 'startTraining'
  | 'stopTraining'
  | 'analyzeLogs'
  | 'searchMemory'
  | 'terminal';

export interface AgentAction {
  tool: AgentToolType;
  parameters: any;
  reasoning: string;
}

export interface AgentResponse {
  thought_process: string[]; // Steps like "Scanning state...", "Deciding action..."
  response_text: string;
  action?: AgentAction;
}

export interface ContextSnapshot {
  currentView: View;
  activeConfig: Partial<TrainingConfig>;
  lastLog?: string;
  systemStatus: SystemStatus;
}

// --- NEW TYPES FOR FEATURES ---

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: string;
  model: string;
  metadata?: {
    resolution?: string;
    aspectRatio?: string;
  };
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
