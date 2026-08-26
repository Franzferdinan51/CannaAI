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
  loadLMStudioModels: (url?: string) => Promise<boolean>;
  saveLMStudioUrl: (url: string, options?: { suppressError?: boolean }) => Promise<boolean>;

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

// The server intentionally returns only the settings it has stored. Older
// installs therefore do not contain newer UI sections (or notificationTypes).
// Normalize at the boundary so every settings panel can safely render and the
// UI remains forward-compatible with existing databases.
const normalizeSettings = (value: Partial<Settings>): Settings => {
  const defaults = createDefaultSettings();
  const source = value as any;
  return {
    ...defaults,
    ...source,
    lmStudio: { ...defaults.lmStudio, ...source.lmStudio },
    openRouter: { ...defaults.openRouter, ...source.openRouter },
    openai: { ...defaults.openai, ...source.openai },
    gemini: { ...defaults.gemini, ...source.gemini },
    groq: { ...defaults.groq, ...source.groq },
    grok: { ...defaults.grok, ...source.grok },
    openclaw: { ...defaults.openclaw, ...source.openclaw },
    hermes: { ...defaults.hermes, ...source.hermes },
    anthropic: { ...defaults.anthropic, ...source.anthropic },
    notifications: {
      ...defaults.notifications,
      ...source.notifications,
      notificationTypes: source.notifications?.notificationTypes || defaults.notifications.notificationTypes,
    },
    units: { ...defaults.units, ...source.units },
    system: { ...defaults.system, ...source.system },
    display: { ...defaults.display, ...source.display },
    data: { ...defaults.data, ...source.data },
    integrations: { ...defaults.integrations, ...source.integrations },
  };
};

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
            const settings = normalizeSettings(await settingsAPI.getSettings());
            set({
              settings,
              defaultSettings: settings,
              hasChanges: false,
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
          set({ isSaving: true, error: '', success: '' });
          try {
            await settingsAPI.batchUpdateSettings(defaultSettings);
            set({ settings: defaultSettings, defaultSettings: { ...defaultSettings }, hasChanges: false, isSaving: false, success: 'Settings reset to defaults' });
          } catch (error) {
            set({ isSaving: false, error: error instanceof Error ? error.message : 'Failed to reset settings' });
            throw error;
          }
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
              const nextSettings = { ...settings, aiProvider: provider };
              const { defaultSettings } = get();
              set({
                settings: nextSettings,
                defaultSettings: defaultSettings ? { ...defaultSettings, aiProvider: provider } : nextSettings,
                selectedProvider: provider,
                hasChanges: Boolean(defaultSettings && JSON.stringify(nextSettings) !== JSON.stringify({ ...defaultSettings, aiProvider: provider })),
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
              const nextSettings = {
                ...settings,
                [providerKey]: {
                  ...(settings as any)[providerKey] || {},
                  ...config,
                }
              } as Settings;
              const { defaultSettings } = get();
              set({
                settings: nextSettings,
                defaultSettings: defaultSettings ? { ...defaultSettings, [providerKey]: (nextSettings as any)[providerKey] } : nextSettings,
                hasChanges: Boolean(defaultSettings && JSON.stringify(nextSettings) !== JSON.stringify({ ...defaultSettings, [providerKey]: nextSettings[providerKey] })),
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
            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load LM Studio models',
              isLoading: false
            });
            return false;
          }
        },

        saveLMStudioUrl: async (url, options) => {
          const { settings } = get();
          if (!settings) return false;

          set({ isSaving: true, error: '' });
          try {
            await settingsAPI.saveLMStudioUrl({ ...settings.lmStudio, url });
            const nextSettings = {
              ...settings,
              lmStudio: { ...settings.lmStudio, url }
            };
            const { defaultSettings } = get();
            const nextDefaults = defaultSettings
              ? { ...defaultSettings, lmStudio: { ...defaultSettings.lmStudio, url } }
              : nextSettings;
            set({
              settings: nextSettings,
              defaultSettings: nextDefaults,
              // The URL was persisted by this action. Preserve the dirty
              // state only for unrelated edits made in the same session.
              hasChanges: JSON.stringify(nextSettings) !== JSON.stringify(nextDefaults),
              isSaving: false,
              success: 'LM Studio URL saved'
            });
            return true;
          } catch (error) {
            set({
              error: options?.suppressError ? '' : (error instanceof Error ? error.message : 'Failed to save LM Studio URL'),
              isSaving: false
            });
            return false;
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
              // An empty model means automatic discovery: LM Studio may have
              // any loaded chat/vision model, so selecting one is optional.
              return !!config.url;
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
        version: 1,
        migrate: (persistedState: any, version) => {
          if (version === 0 && persistedState?.settings?.lmStudio?.model === 'llama-3-8b-instruct') {
            return {
              ...persistedState,
              settings: {
                ...persistedState.settings,
                lmStudio: { ...persistedState.settings.lmStudio, model: '' },
              },
            };
          }
          return persistedState;
        },
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
