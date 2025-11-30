import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { settingsAPI } from './api-client';
import {
  Settings,
  AIProviderType,
  AIModel,
  TestConnectionResponse,
  AgentEvolverSettings,
  SettingsTab,
  SettingsUIState,
  LMStudioResponse,
  EvolutionRecord,
  CustomPrompt
} from './types';

interface SettingsStore extends SettingsUIState {
  // Data state
  settings: Settings | null;
  defaultSettings: Settings | null;
  availableModels: Record<AIProviderType, AIModel[]>;
  lmStudioData: LMStudioResponse | null;

  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => void;
  setActiveTab: (tab: SettingsTab) => void;
  setSelectedProvider: (provider: AIProviderType | null) => void;

  // AI Provider actions
  switchProvider: (provider: AIProviderType) => Promise<void>;
  updateProviderConfig: (provider: AIProviderType, config: any) => Promise<void>;
  testProviderConnection: (provider: AIProviderType) => Promise<void>;
  loadProviderModels: (provider: AIProviderType) => Promise<void>;

  // LM Studio actions
  loadLMStudioModels: (url?: string) => Promise<void>;
  saveLMStudioUrl: (url: string) => Promise<void>;

  // Agent Evolver actions
  loadAgentEvolverSettings: () => Promise<void>;
  updateAgentEvolverSettings: (updates: Partial<AgentEvolverSettings>) => Promise<void>;
  addEvolutionRecord: (record: Partial<EvolutionRecord>) => Promise<void>;
  clearEvolutionHistory: () => Promise<void>;
  resetAgentEvolver: () => Promise<void>;

  // Custom Prompt actions
  addCustomPrompt: (prompt: Omit<CustomPrompt, 'id' | 'createdAt' | 'lastUsed'>) => Promise<void>;
  updateCustomPrompt: (id: string, updates: Partial<CustomPrompt>) => Promise<void>;
  deleteCustomPrompt: (id: string) => Promise<void>;
  toggleCustomPrompt: (id: string, enabled: boolean) => Promise<void>;

  // Utility actions
  exportSettings: (format: 'json' | 'csv') => Promise<void>;
  importSettings: (file: File) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;

  // Validation
  validateProviderConfig: (provider: AIProviderType, config: any) => boolean;
  hasUnsavedChanges: () => boolean;
}

const createDefaultSettings = (): Settings => ({
  aiProvider: 'lm-studio',
  lmStudio: {
    url: 'http://localhost:1234',
    apiKey: '',
    model: 'llama-3-8b-instruct',
    connected: false,
  },
  openRouter: {
    apiKey: '',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    connected: false,
  },
  openai: {
    apiKey: '',
    model: '',
    baseUrl: 'https://api.openai.com/v1',
    connected: false,
  },
  gemini: {
    apiKey: '',
    model: 'gemini-2.0-flash-exp',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    connected: false,
  },
  groq: {
    apiKey: '',
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    connected: false,
  },
  anthropic: {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://ai.gigamind.dev/claude-code',
    connected: false,
  },
  agentEvolver: {
    enabled: false,
    evolutionLevel: 'basic',
    learningRate: 0.1,
    performanceThreshold: 0.8,
    autoOptimization: false,
    riskTolerance: 'moderate',
    customPrompts: [],
    performanceMetrics: {
      accuracy: 0.85,
      responseTime: 2.3,
      resourceUsage: 0.45,
      evolutionProgress: 0.0,
      totalOptimizations: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      averageImprovement: 0.0,
    },
    evolutionHistory: [],
    integrationSettings: {
      aiProviderIntegration: true,
      automationSync: false,
      dataAnalysisIntegration: true,
      realTimeOptimization: false,
      crossAgentLearning: false,
    },
  },
  notifications: {
    enabled: true,
    sound: false,
    desktop: true,
    email: false,
    notificationTypes: [
      {
        id: 'system_alerts',
        name: 'System Alerts',
        category: 'system',
        enabled: true,
        level: 'warning',
      },
      {
        id: 'analysis_complete',
        name: 'Analysis Complete',
        category: 'analysis',
        enabled: true,
        level: 'success',
      },
      {
        id: 'automation_triggered',
        name: 'Automation Triggered',
        category: 'automation',
        enabled: true,
        level: 'info',
      },
    ],
  },
  units: {
    temperature: 'celsius',
    weight: 'grams',
    distance: 'centimeters',
    pressure: 'psi',
    light: 'lux',
  },
  system: {
    darkMode: true,
    autoSave: true,
    autoSaveInterval: 5,
    dataRetention: 30,
    debugMode: false,
    betaFeatures: false,
    language: 'en',
    timezone: 'UTC',
  },
  display: {
    compactMode: false,
    showNotifications: true,
    showStatusBar: true,
    animationsEnabled: true,
    chartRefreshRate: 30,
    itemsPerPage: 10,
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
  },
  data: {
    exportFormat: 'json',
    backupEnabled: true,
    backupInterval: 24,
    cloudSync: false,
    compressionEnabled: true,
    dataValidation: true,
    cachingEnabled: true,
    cacheSize: 100,
  },
  integrations: {
    apiEndpoints: [],
    webhooks: [],
    thirdPartyServices: [],
    securitySettings: {
      apiRateLimit: 100,
      enableCORS: true,
      allowedOrigins: ['http://localhost:3000'],
      requireAuthentication: false,
      sessionTimeout: 60,
      encryptionEnabled: true,
      auditLogging: false,
    },
  },
});

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: null,
        defaultSettings: createDefaultSettings(),
        availableModels: {} as Record<AIProviderType, AIModel[]>,
        lmStudioData: null,
        isLoading: false,
        isSaving: false,
        isTesting: false,
        hasChanges: false,
        error: '',
        success: '',
        activeTab: 'ai-providers',
        selectedProvider: null,
        testResult: null,

        // Core actions
        loadSettings: async () => {
          set({ isLoading: true, error: '' });
          try {
            const settings = await settingsAPI.getSettings();
            set({
              settings,
              selectedProvider: settings.aiProvider,
              isLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load settings',
              isLoading: false
            });
          }
        },

        saveSettings: async () => {
          const { settings } = get();
          if (!settings) return;

          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.batchUpdateSettings(settings);
            set({
              defaultSettings: { ...settings },
              hasChanges: false,
              isSaving: false,
              success: 'Settings saved successfully'
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to save settings',
              isSaving: false
            });
          }
        },

        resetSettings: async () => {
          const defaultSettings = createDefaultSettings();
          set({
            settings: defaultSettings,
            hasChanges: true
          });
        },

        updateSettings: (updates) => {
          const { settings } = get();
          if (settings) {
            set({
              settings: { ...settings, ...updates },
              hasChanges: true
            });
          }
        },

        setActiveTab: (tab) => set({ activeTab: tab }),
        setSelectedProvider: (provider) => set({ selectedProvider: provider }),

        // AI Provider actions
        switchProvider: async (provider) => {
          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.switchProvider(provider);
            const { settings } = get();
            if (settings) {
              set({
                settings: { ...settings, aiProvider: provider },
                selectedProvider: provider,
                hasChanges: true,
                isSaving: false,
                success: `Switched to ${provider}`
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to switch provider',
              isSaving: false
            });
          }
        },

        updateProviderConfig: async (provider, config) => {
          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.updateProviderConfig(provider, config);
            const { settings } = get();
            if (settings) {
              const providerKey = provider === 'lm-studio' ? 'lmStudio' :
                               provider === 'openrouter' ? 'openRouter' :
                               provider;
              set({
                settings: {
                  ...settings,
                  [providerKey]: {
                    ...(settings as any)[providerKey] || {},
                    ...config,
                  }
                },
                hasChanges: true,
                isSaving: false,
                success: `${provider} configuration updated`
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update provider config',
              isSaving: false
            });
          }
        },

        testProviderConnection: async (provider) => {
          set({ isTesting: true, error: '', testResult: null });
          try {
            const result = await settingsAPI.testConnection(provider);
            set({ testResult: result, isTesting: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to test connection',
              isTesting: false,
              testResult: {
                success: false,
                message: 'Connection test failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
              }
            });
          }
        },

        loadProviderModels: async (provider) => {
          set({ isLoading: true, error: '' });
          try {
            const response = await settingsAPI.getProviderModels(provider);
            const { availableModels } = get();
            set({
              availableModels: { ...availableModels, [provider]: response.models },
              isLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load models',
              isLoading: false
            });
          }
        },

        // LM Studio actions
        loadLMStudioModels: async (url) => {
          set({ isLoading: true, error: '' });
          try {
            const response = await settingsAPI.getLMStudioModels(url);
            set({ lmStudioData: response, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load LM Studio models',
              isLoading: false
            });
          }
        },

        saveLMStudioUrl: async (url) => {
          const { settings } = get();
          if (!settings) return;

          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.saveLMStudioUrl({ ...settings.lmStudio, url });
            set({
              settings: {
                ...settings,
                lmStudio: { ...settings.lmStudio, url }
              },
              hasChanges: true,
              isSaving: false,
              success: 'LM Studio URL saved'
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to save LM Studio URL',
              isSaving: false
            });
          }
        },

        // Agent Evolver actions (simplified for now)
        loadAgentEvolverSettings: async () => {
          try {
            const settings = await settingsAPI.getAgentEvolverSettings();
            const currentSettings = get().settings;
            if (currentSettings) {
              set({
                settings: { ...currentSettings, agentEvolver: settings }
              });
            }
          } catch (error) {
            console.error('Failed to load Agent Evolver settings:', error);
          }
        },

        updateAgentEvolverSettings: async (updates) => {
          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.updateAgentEvolverSettings(updates);
            const { settings } = get();
            if (settings) {
              set({
                settings: {
                  ...settings,
                  agentEvolver: { ...settings.agentEvolver, ...updates }
                },
                hasChanges: true,
                isSaving: false,
                success: 'Agent Evolver settings updated'
              });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update Agent Evolver settings',
              isSaving: false
            });
          }
        },

        // Placeholder implementations for remaining methods
        addEvolutionRecord: async (record) => {
          console.log('addEvolutionRecord not implemented yet', record);
        },

        clearEvolutionHistory: async () => {
          console.log('clearEvolutionHistory not implemented yet');
        },

        resetAgentEvolver: async () => {
          console.log('resetAgentEvolver not implemented yet');
        },

        addCustomPrompt: async (promptData) => {
          const newPrompt: CustomPrompt = {
            ...promptData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          };

          const { settings } = get();
          if (settings) {
            set({
              settings: {
                ...settings,
                agentEvolver: {
                  ...settings.agentEvolver,
                  customPrompts: [...settings.agentEvolver.customPrompts, newPrompt]
                }
              },
              hasChanges: true,
              success: 'Custom prompt added successfully'
            });
          }
        },

        updateCustomPrompt: async (id, updates) => {
          const { settings } = get();
          if (settings) {
            const updatedPrompts = settings.agentEvolver.customPrompts.map(p =>
              p.id === id ? { ...p, ...updates } : p
            );
            set({
              settings: {
                ...settings,
                agentEvolver: {
                  ...settings.agentEvolver,
                  customPrompts: updatedPrompts
                }
              },
              hasChanges: true,
              success: 'Custom prompt updated successfully'
            });
          }
        },

        deleteCustomPrompt: async (id) => {
          const { settings } = get();
          if (settings) {
            const updatedPrompts = settings.agentEvolver.customPrompts.filter(p => p.id !== id);
            set({
              settings: {
                ...settings,
                agentEvolver: {
                  ...settings.agentEvolver,
                  customPrompts: updatedPrompts
                }
              },
              hasChanges: true,
              success: 'Custom prompt deleted successfully'
            });
          }
        },

        toggleCustomPrompt: async (id, enabled) => {
          const { settings } = get();
          if (settings) {
            const updatedPrompts = settings.agentEvolver.customPrompts.map(p =>
              p.id === id ? { ...p, enabled } : p
            );
            set({
              settings: {
                ...settings,
                agentEvolver: {
                  ...settings.agentEvolver,
                  customPrompts: updatedPrompts
                }
              },
              hasChanges: true
            });
          }
        },

        exportSettings: async (format) => {
          try {
            const blob = await settingsAPI.exportSettings(format);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cannai-settings.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            set({ success: `Settings exported as ${format.toUpperCase()}` });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to export settings' });
          }
        },

        importSettings: async (file) => {
          try {
            await settingsAPI.importSettings(file);
            await get().loadSettings();
            set({ success: 'Settings imported successfully' });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to import settings' });
          }
        },

        clearError: () => set({ error: '' }),
        clearSuccess: () => set({ success: '' }),

        validateProviderConfig: (provider, config) => {
          switch (provider) {
            case 'lm-studio':
              return !!config.url && !!config.model;
            case 'openrouter':
            case 'openai':
            case 'gemini':
            case 'groq':
            case 'anthropic':
              return !!config.apiKey && !!config.model;
            default:
              return false;
          }
        },

        hasUnsavedChanges: () => {
          const { settings, defaultSettings } = get();
          return !!(settings && defaultSettings && JSON.stringify(settings) !== JSON.stringify(defaultSettings));
        },
      }),
      {
        name: 'cannai-settings-store',
        partialize: (state) => ({
          settings: state.settings,
          defaultSettings: state.defaultSettings,
          activeTab: state.activeTab,
        }),
      }
    ),
    {
      name: 'cannai-settings-store',
    }
  )
);