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
          set((state) => {
            state.isLoading = true;
            state.error = '';
          });

          try {
            const settings = await settingsAPI.getSettings();
            set((state) => {
              state.settings = settings;
              state.selectedProvider = settings.aiProvider;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load settings';
              state.isLoading = false;
            });
          }
        },

        saveSettings: async () => {
          const { settings, defaultSettings } = get();
          if (!settings || !defaultSettings) return;

          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.batchUpdateSettings(settings);
            set((state) => {
              state.defaultSettings = { ...settings };
              state.hasChanges = false;
              state.isSaving = false;
              state.success = 'Settings saved successfully';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to save settings';
              state.isSaving = false;
            });
          }
        },

        resetSettings: async () => {
          const defaultSettings = createDefaultSettings();
          set((state) => {
            state.settings = defaultSettings;
            state.hasChanges = true;
          });
        },

        updateSettings: (updates) => {
          set((state) => {
            if (state.settings) {
              Object.assign(state.settings, updates);
              state.hasChanges = true;
            }
          });
        },

        setActiveTab: (tab) => {
          set((state) => {
            state.activeTab = tab;
          });
        },

        setSelectedProvider: (provider) => {
          set((state) => {
            state.selectedProvider = provider;
          });
        },

        // AI Provider actions
        switchProvider: async (provider) => {
          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.switchProvider(provider);
            set((state) => {
              if (state.settings) {
                state.settings.aiProvider = provider;
                state.selectedProvider = provider;
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = `Switched to ${provider}`;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to switch provider';
              state.isSaving = false;
            });
          }
        },

        updateProviderConfig: async (provider, config) => {
          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.updateProviderConfig(provider, config);
            set((state) => {
              if (state.settings) {
                const providerKey = provider === 'lm-studio' ? 'lmStudio' :
                                 provider === 'openrouter' ? 'openRouter' :
                                 provider;
                (state.settings as any)[providerKey] = {
                  ...((state.settings as any)[providerKey] || {}),
                  ...config,
                };
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = `${provider} configuration updated`;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update provider config';
              state.isSaving = false;
            });
          }
        },

        testProviderConnection: async (provider) => {
          set((state) => {
            state.isTesting = true;
            state.error = '';
            state.testResult = null;
          });

          try {
            const result = await settingsAPI.testConnection(provider);
            set((state) => {
              state.testResult = result;
              state.isTesting = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to test connection';
              state.isTesting = false;
              state.testResult = {
                success: false,
                message: 'Connection test failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
              };
            });
          }
        },

        loadProviderModels: async (provider) => {
          set((state) => {
            state.isLoading = true;
            state.error = '';
          });

          try {
            const response = await settingsAPI.getProviderModels(provider);
            set((state) => {
              state.availableModels[provider] = response.models;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load models';
              state.isLoading = false;
            });
          }
        },

        // LM Studio actions
        loadLMStudioModels: async (url) => {
          set((state) => {
            state.isLoading = true;
            state.error = '';
          });

          try {
            const response = await settingsAPI.getLMStudioModels(url);
            set((state) => {
              state.lmStudioData = response;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load LM Studio models';
              state.isLoading = false;
            });
          }
        },

        saveLMStudioUrl: async (url) => {
          const { settings } = get();
          if (!settings) return;

          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.saveLMStudioUrl({ ...settings.lmStudio, url });
            set((state) => {
              if (state.settings) {
                state.settings.lmStudio.url = url;
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = 'LM Studio URL saved';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to save LM Studio URL';
              state.isSaving = false;
            });
          }
        },

        // Agent Evolver actions
        loadAgentEvolverSettings: async () => {
          try {
            const settings = await settingsAPI.getAgentEvolverSettings();
            set((state) => {
              if (state.settings) {
                state.settings.agentEvolver = settings;
              }
            });
          } catch (error) {
            console.error('Failed to load Agent Evolver settings:', error);
          }
        },

        updateAgentEvolverSettings: async (updates) => {
          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.updateAgentEvolverSettings(updates);
            set((state) => {
              if (state.settings) {
                Object.assign(state.settings.agentEvolver, updates);
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = 'Agent Evolver settings updated';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update Agent Evolver settings';
              state.isSaving = false;
            });
          }
        },

        addEvolutionRecord: async (record) => {
          try {
            const recordId = await settingsAPI.addEvolutionRecord(record);
            set((state) => {
              if (state.settings) {
                const newRecord = {
                  id: recordId,
                  timestamp: new Date().toISOString(),
                  ...record,
                };
                state.settings.agentEvolver.evolutionHistory.unshift(newRecord);
                state.hasChanges = true;
              }
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to add evolution record';
            });
          }
        },

        clearEvolutionHistory: async () => {
          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            await settingsAPI.clearEvolutionHistory();
            set((state) => {
              if (state.settings) {
                state.settings.agentEvolver.evolutionHistory = [];
                state.settings.agentEvolver.performanceMetrics = {
                  ...state.settings.agentEvolver.performanceMetrics,
                  totalOptimizations: 0,
                  successfulEvolutions: 0,
                  failedEvolutions: 0,
                  averageImprovement: 0,
                  evolutionProgress: 0,
                };
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = 'Evolution history cleared';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to clear evolution history';
              state.isSaving = false;
            });
          }
        },

        resetAgentEvolver: async () => {
          set((state) => {
            state.isSaving = true;
            state.error = '';
          });

          try {
            const defaultSettings = await settingsAPI.resetAgentEvolver();
            set((state) => {
              if (state.settings) {
                state.settings.agentEvolver = defaultSettings;
                state.hasChanges = true;
              }
              state.isSaving = false;
              state.success = 'Agent Evolver reset to defaults';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to reset Agent Evolver';
              state.isSaving = false;
            });
          }
        },

        // Custom Prompt actions
        addCustomPrompt: async (promptData) => {
          const newPrompt: CustomPrompt = {
            ...promptData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          };

          set((state) => {
            if (state.settings) {
              state.settings.agentEvolver.customPrompts.push(newPrompt);
              state.hasChanges = true;
              state.success = 'Custom prompt added successfully';
            }
          });
        },

        updateCustomPrompt: async (id, updates) => {
          set((state) => {
            if (state.settings) {
              const promptIndex = state.settings.agentEvolver.customPrompts.findIndex(p => p.id === id);
              if (promptIndex !== -1) {
                Object.assign(state.settings.agentEvolver.customPrompts[promptIndex], updates);
                state.hasChanges = true;
                state.success = 'Custom prompt updated successfully';
              }
            }
          });
        },

        deleteCustomPrompt: async (id) => {
          set((state) => {
            if (state.settings) {
              state.settings.agentEvolver.customPrompts = state.settings.agentEvolver.customPrompts.filter(p => p.id !== id);
              state.hasChanges = true;
              state.success = 'Custom prompt deleted successfully';
            }
          });
        },

        toggleCustomPrompt: async (id, enabled) => {
          set((state) => {
            if (state.settings) {
              const prompt = state.settings.agentEvolver.customPrompts.find(p => p.id === id);
              if (prompt) {
                prompt.enabled = enabled;
                state.hasChanges = true;
              }
            }
          });
        },

        // Utility actions
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

            set((state) => {
              state.success = `Settings exported as ${format.toUpperCase()}`;
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to export settings';
            });
          }
        },

        importSettings: async (file) => {
          try {
            await settingsAPI.importSettings(file);
            await get().loadSettings();

            set((state) => {
              state.success = 'Settings imported successfully';
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to import settings';
            });
          }
        },

        clearError: () => {
          set((state) => {
            state.error = '';
          });
        },

        clearSuccess: () => {
          set((state) => {
            state.success = '';
          });
        },

        // Validation
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
      })),
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