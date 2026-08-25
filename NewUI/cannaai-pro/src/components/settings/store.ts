import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { settingsAPI } from './api-client';
import {
  Settings,
  AIProviderType,
  AIModel,
  TestConnectionResponse,
  SettingsTab,
  SettingsUIState,
  LMStudioResponse
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
    // Blank means discover the currently available LM Studio chat model.
    // A configured value is treated as an explicit model override.
    model: '',
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
  grok: {
    model: 'grok-4.20-0309-reasoning',
    baseUrl: 'openclaw://xai',
    connected: false,
    managedAuth: true,
    description: 'Grok through your OpenClaw-managed xAI OAuth session',
  },
  openclaw: {
    model: '',
    baseUrl: 'openclaw://local',
    connected: false,
    managedAuth: true,
    description: 'Uses the connected OpenClaw agent and its active provider',
  },
  hermes: {
    model: '',
    baseUrl: 'hermes://local',
    connected: false,
    managedAuth: true,
    description: 'Uses the connected Hermes Agent and its active provider',
  },
  anthropic: {
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    baseUrl: 'https://ai.gigamind.dev/claude-code',
    connected: false,
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
            case 'grok':
            case 'openclaw':
            case 'hermes':
              return !!config.baseUrl;
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
        // Schema changed as provider integrations were added. Use a new
        // storage key so older persisted settings cannot hydrate incompatible
        // component state and crash the Settings route (React #130).
        name: 'cannai-settings-store-v2',
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
