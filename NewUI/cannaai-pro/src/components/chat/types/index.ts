/**
 * TypeScript definitions for Chat system
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  image?: string;
  model?: string;
  provider?: string;
  processingTime?: string;
  isTyping?: boolean;
  context?: ChatMessageContext;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageContext {
  fallback?: {
    used: boolean;
    reason: string;
    recommendations: string[];
  };
  providerInfo?: {
    primary: string;
    available: string[];
  };
  agentEvolver?: {
    enabled: boolean;
    evolutionMetrics?: any;
    agentLearning?: any[];
    selfEvolutionCapabilities?: {
      selfQuestioning: boolean;
      selfNavigating: boolean;
      selfAttributing: boolean;
      continuousLearning: boolean;
    };
  };
}

export interface ChatMessageMetadata {
  tokens?: number;
  confidence?: number;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  healthScore?: number;
  strainSpecificAdvice?: string;
  analysisType?: 'general' | 'plant-health' | 'environmental' | 'nutrient' | 'pest-disease';
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ConversationSettings;
  tags?: string[];
  isArchived?: boolean;
  isStarred?: boolean;
}

export interface ConversationSettings {
  aiProvider?: 'lm-studio' | 'openrouter' | 'auto';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableMemory?: boolean;
  enableVision?: boolean;
  enableAnalytics?: boolean;
}

export interface ChatTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'plant-care' | 'troubleshooting' | 'nutrients' | 'environment' | 'harvesting';
  prompt: string;
  variables?: TemplateVariable[];
  icon?: string;
  isQuickAction?: boolean;
  sortOrder?: number;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  options?: string[];
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
}

export interface ChatSettings {
  providers: {
    lmStudio: {
      enabled: boolean;
      url: string;
      model: string;
      apiKey?: string;
      timeout: number;
      maxTokens: number;
      temperature: number;
    };
    openRouter: {
      enabled: boolean;
      apiKey: string;
      model: string;
      timeout: number;
      maxTokens: number;
      temperature: number;
    };
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    messageStyle: 'compact' | 'comfortable' | 'spacious';
    showTimestamps: boolean;
    showModelInfo: boolean;
    showProcessingTime: boolean;
    enableSoundEffects: boolean;
    enableAnimations: boolean;
  };
  features: {
    enableVoiceInput: boolean;
    enableVoiceOutput: boolean;
    enableImageAnalysis: boolean;
    enableFileSharing: boolean;
    enableQuickTemplates: boolean;
    enableConversationHistory: boolean;
    enableAnalytics: boolean;
    enableRealTimeSync: boolean;
  };
  privacy: {
    saveHistory: boolean;
    enableDataAnalysis: boolean;
    shareAnonymousUsage: boolean;
    autoDeleteAfterDays?: number;
    encryptLocalStorage: boolean;
  };
  notifications: {
    desktopNotifications: boolean;
    soundAlerts: boolean;
    responseAlerts: boolean;
    errorAlerts: boolean;
    maintenanceAlerts: boolean;
  };
}

export interface ChatAnalytics {
  totalMessages: number;
  totalConversations: number;
  averageResponseTime: number;
  providerUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  dailyUsage: Array<{
    date: string;
    messages: number;
    conversations: number;
  }>;
  topicDistribution: Record<string, number>;
  sentimentAnalysis?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  errorRate: number;
  userSatisfactionScore?: number;
}

export interface QuickResponse {
  id: string;
  text: string;
  category: string;
  icon?: string;
  shortcut?: string;
  sortOrder: number;
  isCustom: boolean;
}

export interface VoiceChatSettings {
  enabled: boolean;
  language: string;
  voiceName: string;
  speechRate: number;
  pitch: number;
  autoSend: boolean;
  activationPhrase?: string;
  maxRecordingTime: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  analysis?: {
    isImage: boolean;
    analyzed: boolean;
    insights?: string;
  };
}

export interface ChatSession {
  id: string;
  conversationId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  tokensUsed: number;
  provider: string;
  model: string;
  averageResponseTime: number;
  errors: number;
}

export interface ChatRealtimeEvent {
  type: 'message_sent' | 'message_received' | 'typing_started' | 'typing_stopped' | 'provider_changed' | 'error_occurred';
  timestamp: Date;
  sessionId: string;
  userId?: string;
  data?: any;
}

export interface ChatNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  action?: {
    label: string;
    handler: string;
    data?: any;
  };
}

export interface AILearningData {
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  userRating?: number;
  userFeedback?: string;
  context: any;
  effectiveness: number;
  improvedResponse?: string;
}

// Export types for external use
export type {
  ChatMessage,
  ChatConversation,
  ChatTemplate,
  ChatSettings,
  ChatAnalytics,
  QuickResponse,
  VoiceChatSettings,
  FileAttachment,
  ChatSession,
  ChatRealtimeEvent,
  ChatNotification,
  AILearningData
};