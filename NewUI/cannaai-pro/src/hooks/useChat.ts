'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { apiUrl } from '../lib/api';

import {
  ChatMessage,
  ChatConversation,
  ChatTemplate,
  ChatSettings,
  ChatAnalytics,
  QuickResponse,
  FileAttachment,
  ChatNotification,
  VoiceChatSettings,
  ChatSession,
  IChatMessage,
  ChatMessageMetadata,
  ChatMessageContext
} from '../components/chat/types';

function normalizeChatMessage(message: any, index: number): IChatMessage {
  const rawContent = message?.content ?? message?.text ?? message?.message ?? '';
  const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
  return {
    ...message,
    id: String(message?.id || `legacy-message-${index}`),
    role: message?.role === 'assistant' || message?.role === 'system' ? message.role : 'user',
    content: content || '',
    timestamp: new Date(message?.timestamp || Date.now()),
  } as IChatMessage;
}

function normalizeChatMessages(messages: any[]): IChatMessage[] {
  return messages.map((message, index) => normalizeChatMessage(message, index));
}

function apiAuthHeaders(): Record<string, string> {
  const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('cannai_token') : null)
    || import.meta.env.VITE_CANNAAI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Default settings
const defaultSettings: ChatSettings = {
  providers: {
    lmStudio: {
      enabled: false,
      url: 'http://localhost:1234',
      model: '',
      timeout: 120000,
      maxTokens: 2000,
      temperature: 0.3
    },
    openRouter: {
      enabled: false,
      apiKey: '',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      timeout: 30000,
      maxTokens: 2000,
      temperature: 0.3
    }
  },
  ui: {
    theme: 'dark',
    fontSize: 'medium',
    messageStyle: 'comfortable',
    showTimestamps: true,
    showModelInfo: true,
    showProcessingTime: true,
    enableSoundEffects: true,
    enableAnimations: true
  },
  features: {
    enableVoiceInput: true,
    enableVoiceOutput: false,
    enableImageAnalysis: true,
    enableFileSharing: true,
    enableQuickTemplates: true,
    enableConversationHistory: true,
    enableAnalytics: true,
    enableRealTimeSync: false
  },
  privacy: {
    saveHistory: true,
    enableDataAnalysis: true,
    shareAnonymousUsage: false,
    encryptLocalStorage: true
  },
  notifications: {
    desktopNotifications: true,
    soundAlerts: false,
    responseAlerts: true,
    errorAlerts: true,
    maintenanceAlerts: true
  }
};

// Default templates
const defaultTemplates: ChatTemplate[] = [
  {
    id: '1',
    name: 'Plant Health Check',
    description: 'General assessment of plant health and condition',
    category: 'plant-care',
    prompt: 'Please analyze my cannabis plant\'s overall health. Current conditions: Temperature: {temperature}°F, Humidity: {humidity}%, pH: {ph}. I\'m observing: {symptoms}. What should I focus on?',
    variables: [
      { name: 'temperature', label: 'Temperature (°F)', type: 'number', defaultValue: 75, required: false },
      { name: 'humidity', label: 'Humidity (%)', type: 'number', defaultValue: 60, required: false },
      { name: 'ph', label: 'pH Level', type: 'number', defaultValue: 6.5, required: false },
      { name: 'symptoms', label: 'Observed Symptoms', type: 'text', placeholder: 'Describe any issues you notice', required: true }
    ],
    icon: '🌱',
    isQuickAction: true,
    sortOrder: 1
  },
  {
    id: '2',
    name: 'Nutrient Deficiency',
    description: 'Diagnose and treat nutrient deficiencies',
    category: 'troubleshooting',
    prompt: 'I suspect a nutrient deficiency in my cannabis plants. Growing in {medium}, currently in {growth_stage} stage. Symptoms: {symptoms}. Current nutrients: {nutrient_regimen}. Can you help identify the issue and suggest treatments?',
    variables: [
      { name: 'medium', label: 'Growing Medium', type: 'select', options: ['Soil', 'Coco Coir', 'Hydroponic', 'Aeroponic'], required: true },
      { name: 'growth_stage', label: 'Growth Stage', type: 'select', options: ['Seedling', 'Vegetative', 'Flowering', 'Harvest'], required: true },
      { name: 'symptoms', label: 'Symptoms', type: 'text', required: true },
      { name: 'nutrient_regimen', label: 'Current Nutrient Regimen', type: 'text', required: false }
    ],
    icon: '🔬',
    isQuickAction: false,
    sortOrder: 2
  },
  {
    id: '3',
    name: 'Environmental Optimization',
    description: 'Optimize growing conditions for better results',
    category: 'environment',
    prompt: 'Help me optimize my grow room conditions. Current setup: {setup_details}. Target strain: {strain}. Current environment: Temp {temperature}°F, Humidity {humidity}%, Light intensity {light_intensity}μmol. What improvements would you recommend?',
    variables: [
      { name: 'setup_details', label: 'Setup Details', type: 'text', placeholder: 'Room size, ventilation, CO2, etc.', required: true },
      { name: 'strain', label: 'Strain Name', type: 'text', required: false },
      { name: 'temperature', label: 'Temperature (°F)', type: 'number', required: true },
      { name: 'humidity', label: 'Humidity (%)', type: 'number', required: true },
      { name: 'light_intensity', label: 'Light Intensity (μmol)', type: 'number', required: true }
    ],
    icon: '🌡️',
    isQuickAction: false,
    sortOrder: 3
  },
  {
    id: '4',
    name: 'Pest & Disease Control',
    description: 'Identify and treat pests and diseases',
    category: 'pest-disease',
    prompt: 'I found pests or signs of disease on my cannabis plants. Symptoms: {symptoms}. Affected areas: {affected_areas}. Growing conditions: {conditions}. Current treatments: {current_treatments}. What is this and how should I treat it?',
    variables: [
      { name: 'symptoms', label: 'Symptoms', type: 'text', required: true },
      { name: 'affected_areas', label: 'Affected Areas', type: 'text', required: true },
      { name: 'conditions', label: 'Growing Conditions', type: 'text', required: false },
      { name: 'current_treatments', label: 'Current Treatments', type: 'text', required: false }
    ],
    icon: '🐛',
    isQuickAction: false,
    sortOrder: 4
  }
];

// Default quick responses
const defaultQuickResponses: QuickResponse[] = [
  {
    id: '1',
    text: 'What are the optimal temperature and humidity levels for cannabis?',
    category: 'general',
    icon: '🌡️',
    shortcut: 'temp',
    sortOrder: 1,
    isCustom: false
  },
  {
    id: '2',
    text: 'How often should I water my cannabis plants?',
    category: 'plant-care',
    icon: '💧',
    shortcut: 'water',
    sortOrder: 2,
    isCustom: false
  },
  {
    id: '3',
    text: 'What nutrients do cannabis plants need during flowering?',
    category: 'nutrients',
    icon: '🌻',
    shortcut: 'flower',
    sortOrder: 3,
    isCustom: false
  },
  {
    id: '4',
    text: 'How do I identify and treat nutrient burn?',
    category: 'troubleshooting',
    icon: '⚠️',
    shortcut: 'burn',
    sortOrder: 4,
    isCustom: false
  },
  {
    id: '5',
    text: 'When is the best time to harvest cannabis?',
    category: 'harvesting',
    icon: '✂️',
    shortcut: 'harvest',
    sortOrder: 5,
    isCustom: false
  }
];

interface UseChatOptions {
  initialConversation?: string;
  sensorData?: any;
}

interface UseChatReturn {
  // State
  messages: IChatMessage[];
  conversations: ChatConversation[];
  currentConversation: ChatConversation | null;
  isLoading: boolean;
  isConnected: boolean;
  currentProvider: string;
  activeTemplates: ChatTemplate[];
  quickResponses: QuickResponse[];
  analytics: ChatAnalytics | null;
  notifications: ChatNotification[];
  settings: ChatSettings;

  // Actions
  sendMessage: (content: string, image?: string, attachments?: FileAttachment[]) => Promise<void>;
  updateMessage: (messageId: string, updates: Partial<IChatMessage>) => void;
  deleteMessage: (messageId: string) => void;
  createConversation: (title: string) => ChatConversation | null;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  starConversation: (conversationId: string) => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  clearChat: () => void;
  exportChat: (format: 'json' | 'csv' | 'txt', conversationId?: string) => void;
  importChat: (file: File) => void;

  // AI Provider management
  testProvider: (provider: string) => Promise<boolean>;
  switchProvider: (provider: string) => Promise<boolean>;
  getProviderStatus: () => Promise<any>;
}

export function useChat({ initialConversation, sensorData = {} }: UseChatOptions = {}): UseChatReturn {
  // Core state
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('fallback');

  // UI state
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [settings, setSettingsState] = useState<ChatSettings>(defaultSettings);
  const [templates] = useState<ChatTemplate[]>(defaultTemplates);
  const [quickResponses] = useState<QuickResponse[]>(defaultQuickResponses);

  // Analytics state
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    loadDataFromStorage();
    checkConnection();
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (hasLoadedConversations && settings.privacy.saveHistory) {
      saveConversationsToStorage();
    }
  }, [conversations, hasLoadedConversations, settings.privacy.saveHistory]);

  // Load data from localStorage
  const loadDataFromStorage = useCallback(() => {
    try {
      // Load settings
      const savedSettings = localStorage.getItem('cannai-chat-settings');
      if (savedSettings) {
        setSettingsState(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }

      // Load conversations
      const savedConversations = localStorage.getItem('cannai-chat-conversations');
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: Array.isArray(conv.messages)
            ? normalizeChatMessages(conv.messages)
            : []
        }));
        setConversations(conversationsWithDates);
        setHasLoadedConversations(true);

        // Select from the freshly parsed list. Calling switchConversation here
        // would use the callback from the previous render, whose conversations
        // array is still empty during the initial storage load.
        const selectedConversation = initialConversation
          ? conversationsWithDates.find((conversation: ChatConversation) => conversation.id === initialConversation)
          : conversationsWithDates
              .filter((conversation: ChatConversation) => !conversation.isArchived)
              .sort((a: ChatConversation, b: ChatConversation) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              )[0];
        if (selectedConversation) {
          setCurrentConversation(selectedConversation);
          setMessages(selectedConversation.messages || []);
        }
      }

      if (!savedConversations) setHasLoadedConversations(true);

      // Load notifications
      const savedNotifications = localStorage.getItem('cannai-chat-notifications');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }

    } catch (error) {
      console.error('Failed to load chat data:', error);
    }
  }, [initialConversation]);

  // Save conversations to localStorage
  const saveConversationsToStorage = useCallback(() => {
    try {
      localStorage.setItem('cannai-chat-conversations', JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  }, [conversations]);

  // Save settings to localStorage
  const saveSettingsToStorage = useCallback((newSettings: ChatSettings) => {
    try {
      localStorage.setItem('cannai-chat-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  // Check AI connection
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/chat'), { headers: apiAuthHeaders() });
      const data = await response.json();

      if (data.success && data.currentProvider !== 'fallback') {
        setIsConnected(true);
        setCurrentProvider(data.currentProvider);
      } else {
        setIsConnected(false);
        setCurrentProvider('fallback');
      }
    } catch (error) {
      setIsConnected(false);
      setCurrentProvider('fallback');
    }
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async (
    content: string,
    image?: string,
    attachments?: FileAttachment[]
  ) => {
    if (!content.trim() && !image && !attachments?.length) return;

    // Create or get current conversation
    let conversation = currentConversation;
    if (!conversation) {
      conversation = createConversation('New Chat');
      if (!conversation) return;
    }

    // Create user message
    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      image,
      attachments,
      metadata: {
        tokens: content.split(' ').length
      }
    };

    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setConversations(prev => prev.map(conv =>
      conv.id === conversation!.id
        ? { ...conv, messages: [...conv.messages, userMessage], updatedAt: new Date() }
        : conv
    ));

    setIsLoading(true);

    // Create typing indicator
    const typingId = (Date.now() + 1).toString();
    const typingMessage: IChatMessage = {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      // Keep the UI recoverable when a local model is unloaded, crashes, or
      // never completes. The server has its own provider timeout, but fetch
      // itself otherwise leaves the composer disabled indefinitely.
      const requestTimeout = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 180000);

      try {
        const response = await fetch(apiUrl('/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...apiAuthHeaders(),
          },
          body: JSON.stringify({
            message: content,
            image,
            attachments,
            context: {
              page: 'chat',
              title: conversation.title,
              data: {
                sensorData,
                conversationHistory: messages.slice(-5) // Last 5 messages for context
              }
            },
            sensorData,
            mode: 'chat',
            // Pass the arbitrary LM Studio model selected in Settings through
            // to the server instead of silently using only its env default.
            model: settings.providers.lmStudio.model.trim() || undefined,
            baseUrl: settings.providers.lmStudio.url.trim() || undefined,
            primaryProvider: settings.providers.lmStudio.enabled ? 'lmstudio' : undefined
          }),
          signal: abortControllerRef.current.signal
        });

        const data = await response.json().catch(() => ({
          success: false,
          error: `AI service returned an invalid response (HTTP ${response.status}).`
        }));

        if (!response.ok && data.success !== true) {
          data.success = false;
          data.error = data.error || `AI service request failed (HTTP ${response.status}).`;
        }

        // Remove typing indicator
        setMessages(prev => prev.filter(msg => msg.id !== typingId));

      if (data.success) {
        // Create AI response message
        const aiMessage: IChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          model: data.model,
          provider: data.provider,
          processingTime: data.processingTime,
          context: {
            fallback: data.fallback,
            providerInfo: data.providerInfo
          },
          metadata: {
            tokens: data.usage?.total_tokens,
            confidence: data.confidence,
            analysisType: 'general'
          }
        };

        // Add AI message to conversation
        setMessages(prev => [...prev, aiMessage]);
        setConversations(prev => prev.map(conv =>
          conv.id === conversation.id
            ? { ...conv, messages: [...conv.messages, aiMessage], updatedAt: new Date() }
            : conv
        ));

        // Update analytics
        updateAnalytics('message_sent', {
          provider: data.provider,
          model: data.model,
          processingTime: parseInt(data.processingTime),
          tokens: data.usage?.total_tokens || 0,
          success: true
        });

        // Show notification if fallback was used
        if (data.fallback?.used) {
          addNotification({
            type: 'warning',
            title: 'Fallback Response',
            message: `Used fallback provider. Reason: ${data.fallback.reason}`,
            actionable: true,
            action: {
              label: 'Configure AI',
              handler: 'open-settings'
            }
          });
        }

      } else {
        // Handle error response
        const errorMessage: IChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: data.error?.userMessage || data.error || 'Sorry, I encountered an error. Please check your AI provider configuration.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorMessage]);
        setConversations(prev => prev.map(conv =>
          conv.id === conversation.id
            ? { ...conv, messages: [...conv.messages, errorMessage], updatedAt: new Date() }
            : conv
        ));

        addNotification({
          type: 'error',
          title: 'AI Error',
          message: data.error?.message || 'Failed to get AI response',
          actionable: true,
          action: {
            label: 'Check Settings',
            handler: 'open-settings'
          }
        });

        updateAnalytics('message_sent', {
          provider: 'error',
          model: 'unknown',
          processingTime: 0,
          tokens: 0,
          success: false
        });
        }
      } finally {
        clearTimeout(requestTimeout);
      }

    } catch (error) {
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      const errorMessage: IChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: error instanceof DOMException && error.name === 'AbortError'
          ? 'The AI request timed out. Confirm LM Studio is running with the selected model loaded, then try again.'
          : 'Connection to the AI service failed. Check the provider status in Settings and try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: error instanceof DOMException && error.name === 'AbortError'
          ? 'The AI request timed out'
          : 'Failed to connect to AI service'
      });

      updateAnalytics('message_sent', {
        provider: 'error',
        model: 'connection_error',
        processingTime: 0,
        tokens: 0,
        success: false
      });

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentConversation, sensorData, messages]);

  // Update message
  const updateMessage = useCallback((messageId: string, updates: Partial<IChatMessage>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, ...updates, timestamp: new Date() } : msg
    ));

    if (currentConversation) {
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation.id
          ? {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === messageId ? { ...msg, ...updates, timestamp: new Date() } : msg
              ),
              updatedAt: new Date()
            }
          : conv
      ));
    }
  }, [currentConversation]);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    if (currentConversation) {
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation.id
          ? {
              ...conv,
              messages: conv.messages.filter(msg => msg.id !== messageId),
              updatedAt: new Date()
            }
          : conv
      ));
    }
  }, [currentConversation]);

  // Create new conversation
  const createConversation = useCallback((title: string): ChatConversation | null => {
    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        enableMemory: true,
        enableVision: settings.features.enableImageAnalysis
      }
    };

    setConversations(prev => [...prev, newConversation]);
    setCurrentConversation(newConversation);
    setMessages([]);

    addNotification({
      type: 'success',
      title: 'New Conversation',
      message: `Started "${title}"`
    });

    return newConversation;
  }, [settings.features.enableImageAnalysis]);

  // Switch conversation
  const switchConversation = useCallback((conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      setMessages(conversation.messages || []);
    }
  }, [conversations]);

  // Delete conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }

    addNotification({
      type: 'info',
      title: 'Conversation Deleted',
      message: 'The conversation has been permanently deleted'
    });
  }, [currentConversation]);

  // Archive conversation
  const archiveConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, isArchived: true, updatedAt: new Date() }
        : conv
    ));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [currentConversation]);

  // Star conversation
  const starConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, isStarred: !conv.isStarred, updatedAt: new Date() }
        : conv
    ));
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettingsState(updatedSettings);
    saveSettingsToStorage(updatedSettings);
  }, [settings, saveSettingsToStorage]);

  // Clear chat
  const clearChat = useCallback(() => {
    if (currentConversation) {
      setMessages([]);
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation.id
          ? { ...conv, messages: [], updatedAt: new Date() }
          : conv
      ));

      addNotification({
        type: 'info',
        title: 'Chat Cleared',
        message: 'All messages have been removed from this conversation'
      });
    }
  }, [currentConversation]);

  // Export chat
  const exportChat = useCallback((format: 'json' | 'csv' | 'txt', conversationId?: string) => {
    const conversationsToExport = conversationId
      ? conversations.filter(c => c.id === conversationId)
      : conversations;

    let content = '';
    let filename = `cannai-chat-${new Date().toISOString().split('T')[0]}`;
    let mimeType = 'text/plain';

    switch (format) {
      case 'json':
        content = JSON.stringify(conversationsToExport, null, 2);
        filename += '.json';
        mimeType = 'application/json';
        break;

      case 'csv':
        content = 'Conversation,Message,Role,Timestamp,Content\n';
        conversationsToExport.forEach(conv => {
          conv.messages.forEach(msg => {
            const messageContent = String(msg.content || '');
            content += `"${conv.title}","${msg.id}","${msg.role}","${msg.timestamp.toISOString()}","${messageContent.replace(/"/g, '""')}"\n`;
          });
        });
        filename += '.csv';
        mimeType = 'text/csv';
        break;

      case 'txt':
        conversationsToExport.forEach(conv => {
          content += `=== ${conv.title} ===\n`;
          content += `Created: ${conv.createdAt.toLocaleString()}\n`;
          content += `Updated: ${conv.updatedAt.toLocaleString()}\n\n`;
          conv.messages.forEach(msg => {
            content += `[${msg.timestamp.toLocaleString()}] ${String(msg.role || 'user').toUpperCase()}:\n${String(msg.content || '')}\n\n`;
          });
          content += '\n\n';
        });
        filename += '.txt';
        break;
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addNotification({
      type: 'success',
      title: 'Chat Exported',
      message: `Exported ${conversationsToExport.length} conversation(s) as ${format.toUpperCase()}`
    });
  }, [conversations]);

  // Import chat
  const importChat = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);

        if (Array.isArray(imported)) {
          const conversationsWithIds = imported.map((conv: any, index: number) => ({
            ...conv,
            id: conv.id || `imported_${Date.now()}_${index}`,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: normalizeChatMessages(conv.messages || [])
          }));

          setConversations(prev => [...prev, ...conversationsWithIds]);

          addNotification({
            type: 'success',
            title: 'Chat Imported',
            message: `Successfully imported ${conversationsWithIds.length} conversation(s)`
          });
        }
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Import Failed',
          message: 'Invalid file format. Please export chat as JSON first.'
        });
      }
    };
    reader.readAsText(file);
  }, []);

  // Test AI provider
  const testProvider = useCallback(async (provider: string): Promise<boolean> => {
    try {
      const response = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...apiAuthHeaders() },
        body: JSON.stringify({
          message: 'Test message',
          testProvider: provider
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Switch AI provider
  const switchProvider = useCallback(async (provider: string): Promise<boolean> => {
    const success = await testProvider(provider);
    if (success) {
      setCurrentProvider(provider);
      addNotification({
        type: 'success',
        title: 'Provider Changed',
        message: `Switched to ${provider}`
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Provider Error',
        message: `Failed to switch to ${provider}`
      });
    }
    return success;
  }, [testProvider]);

  // Get provider status
  const getProviderStatus = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/chat'), { headers: apiAuthHeaders() });
      return await response.json();
    } catch {
      return { success: false, error: 'Connection failed' };
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: ChatNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification if enabled
    if (settings.notifications.desktopNotifications && notification.type !== 'info') {
      toast(notification.message, {
        icon: notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '⚠️'
      });
    }
  }, [settings.notifications.desktopNotifications]);

  // Update analytics
  const updateAnalytics = useCallback((event: string, data: any) => {
    setAnalytics(prev => {
      if (!prev) return null;

      const updated = { ...prev };

      switch (event) {
        case 'message_sent':
          updated.totalMessages++;
          updated.providerUsage[data.provider] = (updated.providerUsage[data.provider] || 0) + 1;
          updated.modelUsage[data.model] = (updated.modelUsage[data.model] || 0) + 1;

          // Update average response time
          if (data.processingTime > 0) {
            const totalTime = updated.averageResponseTime * (updated.totalMessages - 1) + data.processingTime;
            updated.averageResponseTime = totalTime / updated.totalMessages;
          }

          // Update error rate
          if (!data.success) {
            updated.errorRate = ((updated.errorRate * (updated.totalMessages - 1)) + 1) / updated.totalMessages;
          } else {
            updated.errorRate = (updated.errorRate * (updated.totalMessages - 1)) / updated.totalMessages;
          }

          // Update daily usage
          const today = new Date().toISOString().split('T')[0];
          const todayIndex = updated.dailyUsage.findIndex(d => d.date === today);
          if (todayIndex >= 0) {
            updated.dailyUsage[todayIndex].messages++;
          } else {
            updated.dailyUsage.push({ date: today, messages: 1, conversations: 0 });
          }

          break;
      }

      return updated;
    });

    // Also update sessions
    setSessions(prev => {
      const sessionId = currentConversation?.id || 'default';
      const existingSession = prev.find(s => s.id === sessionId);

      if (existingSession) {
        return prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                messageCount: s.messageCount + 1,
                tokensUsed: s.tokensUsed + (data.tokens || 0),
                averageResponseTime: (s.averageResponseTime * s.messageCount + (data.processingTime || 0)) / (s.messageCount + 1),
                errors: s.errors + (data.success ? 0 : 1)
              }
            : s
        );
      } else {
        const newSession: ChatSession = {
          id: sessionId,
          conversationId: currentConversation?.id || '',
          startTime: new Date(),
          messageCount: 1,
          tokensUsed: data.tokens || 0,
          provider: data.provider,
          model: data.model,
          averageResponseTime: data.processingTime || 0,
          errors: data.success ? 0 : 1
        };
        return [...prev, newSession];
      }
    });
  }, [currentConversation]);

  // Generate analytics from current data
  useEffect(() => {
    const generateAnalytics = (): ChatAnalytics => {
      const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
      const totalConversations = conversations.length;

      const providerUsage: Record<string, number> = {};
      const modelUsage: Record<string, number> = {};
      let totalProcessingTime = 0;
      let messageCountWithTime = 0;
      let assistantMessageCount = 0;
      let failedAssistantMessages = 0;
      const topicDistribution: Record<string, number> = {};
      const topicKeywords = ['nutrient', 'temperature', 'humidity', 'ph', 'light', 'water', 'harvest', 'flower', 'vegetative', 'pest', 'disease'];

      conversations.forEach(conv => {
        conv.messages.forEach(msg => {
          if (msg.provider) {
            providerUsage[msg.provider] = (providerUsage[msg.provider] || 0) + 1;
          }
          if (msg.model) {
            modelUsage[msg.model] = (modelUsage[msg.model] || 0) + 1;
          }
          if (msg.role === 'assistant') {
            assistantMessageCount++;
            if (msg.provider === 'error') failedAssistantMessages++;
          }
          if (msg.role === 'user') {
            const content = typeof msg.content === 'string' ? msg.content.toLowerCase() : '';
            topicKeywords.forEach(topic => {
              if (content.includes(topic)) topicDistribution[topic] = (topicDistribution[topic] || 0) + 1;
            });
          }
          if (msg.processingTime) {
            const time = parseInt(msg.processingTime.replace('ms', ''));
            if (!isNaN(time)) {
              totalProcessingTime += time;
              messageCountWithTime++;
            }
          }
        });
      });

      // Generate daily usage for last 30 days
      const dailyUsage = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayMessages = conversations.reduce((sum, conv) => {
          const dayConvMessages = conv.messages.filter(msg =>
            msg.timestamp.toISOString().split('T')[0] === dateStr
          );
          return sum + dayConvMessages.length;
        }, 0);

        dailyUsage.push({
          date: dateStr,
          messages: dayMessages,
          conversations: conversations.filter(conv =>
            conv.createdAt.toISOString().split('T')[0] === dateStr
          ).length
        });
      }

      return {
        totalMessages,
        totalConversations,
        averageResponseTime: messageCountWithTime > 0 ? totalProcessingTime / messageCountWithTime : 0,
        providerUsage,
        modelUsage,
        dailyUsage,
        topicDistribution,
        errorRate: assistantMessageCount > 0 ? failedAssistantMessages / assistantMessageCount : 0
      };
    };

    setAnalytics(generateAnalytics());
  }, [conversations]);

  return {
    // State
    messages,
    conversations,
    currentConversation,
    isLoading,
    isConnected,
    currentProvider,
    activeTemplates: templates,
    quickResponses,
    analytics,
    notifications,
    settings,

    // Actions
    sendMessage,
    updateMessage,
    deleteMessage,
    createConversation,
    switchConversation,
    deleteConversation,
    archiveConversation,
    starConversation,
    updateSettings,
    clearChat,
    exportChat,
    importChat,

    // AI Provider management
    testProvider,
    switchProvider,
    getProviderStatus
  };
}
