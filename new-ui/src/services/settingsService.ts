import { apiClient } from '@/lib/api/client';
import {
  Settings,
  SettingsUpdateRequest,
  SettingsResponse,
  ConnectionTestResult,
  ProviderModels,
  ApiResponse,
  AgentEvolverSettings
} from '@/types/api';

// =============================================================================
// Settings Service
// =============================================================================

export class SettingsService {
  private readonly basePath = '/api/settings';

  /**
   * Get all settings
   */
  async getSettings(): Promise<Settings> {
    try {
      const response = await apiClient.get<SettingsResponse>(this.basePath);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch settings');
      }

      return response.settings;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      throw error;
    }
  }

  /**
   * Update provider settings
   */
  async updateProvider(provider: string, config: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'update_provider',
        provider,
        config
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update provider settings');
      }

      return response;
    } catch (error) {
      console.error(`Failed to update ${provider} settings:`, error);
      throw error;
    }
  }

  /**
   * Switch AI provider
   */
  async switchProvider(provider: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'switch_provider',
        provider
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to switch provider');
      }

      return response;
    } catch (error) {
      console.error(`Failed to switch to ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(provider: string, config?: any): Promise<ConnectionTestResult> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'test_connection',
        provider,
        config
      });

      if (!response.success) {
        return {
          success: false,
          message: response.error?.message || 'Connection test failed',
          details: response.error
        };
      }

      return {
        success: true,
        message: response.message || 'Connection successful',
        details: response.details
      };
    } catch (error) {
      console.error(`Failed to test connection for ${provider}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Get available models for a provider
   */
  async getProviderModels(provider: string): Promise<ProviderModels> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'get_models',
        provider
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get provider models');
      }

      return {
        success: true,
        models: response.data?.models || [],
        provider,
        count: response.data?.models?.length || 0,
        message: response.message || 'Models retrieved successfully'
      };
    } catch (error) {
      console.error(`Failed to get models for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotifications(config: Settings['notifications']): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'update_notifications',
        config
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update notification settings');
      }

      return response;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  /**
   * Update unit settings
   */
  async updateUnits(config: Settings['units']): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'update_units',
        config
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update unit settings');
      }

      return response;
    } catch (error) {
      console.error('Failed to update unit settings:', error);
      throw error;
    }
  }

  // =============================================================================
  // Agent Evolver Settings
  // =============================================================================

  /**
   * Get Agent Evolver settings
   */
  async getAgentEvolverSettings(): Promise<AgentEvolverSettings> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'get_agent_evolver'
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get Agent Evolver settings');
      }

      return response.data!.agentEvolverSettings;
    } catch (error) {
      console.error('Failed to get Agent Evolver settings:', error);
      throw error;
    }
  }

  /**
   * Update Agent Evolver settings
   */
  async updateAgentEvolverSettings(settings: Partial<AgentEvolverSettings>): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'update_agent_evolver',
        settings
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update Agent Evolver settings');
      }

      return response;
    } catch (error) {
      console.error('Failed to update Agent Evolver settings:', error);
      throw error;
    }
  }

  /**
   * Add evolution record
   */
  async addEvolutionRecord(record: {
    type: string;
    description: string;
    success: boolean;
    improvement?: number;
    metadata?: any;
  }): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'add_evolution_record',
        settings: { record }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to add evolution record');
      }

      return response;
    } catch (error) {
      console.error('Failed to add evolution record:', error);
      throw error;
    }
  }

  /**
   * Clear evolution history
   */
  async clearEvolutionHistory(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'clear_evolution_history'
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to clear evolution history');
      }

      return response;
    } catch (error) {
      console.error('Failed to clear evolution history:', error);
      throw error;
    }
  }

  /**
   * Reset Agent Evolver to default settings
   */
  async resetAgentEvolver(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>(this.basePath, {
        action: 'reset_agent_evolver'
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to reset Agent Evolver');
      }

      return response;
    } catch (error) {
      console.error('Failed to reset Agent Evolver:', error);
      throw error;
    }
  }

  // =============================================================================
  // Batch Operations
  // =============================================================================

  /**
   * Batch update multiple settings
   */
  async batchUpdateSettings(updates: {
    providers?: Record<string, any>;
    notifications?: Settings['notifications'];
    units?: Settings['units'];
    agentEvolver?: Partial<AgentEvolverSettings>;
  }): Promise<ApiResponse> {
    try {
      const promises: Promise<ApiResponse>[] = [];

      // Update providers
      if (updates.providers) {
        Object.entries(updates.providers).forEach(([provider, config]) => {
          promises.push(this.updateProvider(provider, config));
        });
      }

      // Update notifications
      if (updates.notifications) {
        promises.push(this.updateNotifications(updates.notifications));
      }

      // Update units
      if (updates.units) {
        promises.push(this.updateUnits(updates.units));
      }

      // Update Agent Evolver
      if (updates.agentEvolver) {
        promises.push(this.updateAgentEvolverSettings(updates.agentEvolver));
      }

      const results = await Promise.allSettled(promises);
      const failures = results.filter(result => result.status === 'rejected');

      if (failures.length > 0) {
        throw new Error(`Failed to update ${failures.length} settings`);
      }

      return {
        success: true,
        message: 'All settings updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to batch update settings:', error);
      throw error;
    }
  }

  /**
   * Export settings
   */
  async exportSettings(): Promise<Blob> {
    try {
      const settings = await this.getSettings();
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        settings
      };

      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error;
    }
  }

  /**
   * Import settings
   */
  async importSettings(file: File): Promise<ApiResponse> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.settings) {
        throw new Error('Invalid settings file format');
      }

      const { settings } = importData;
      const updates: any = {};

      // Prepare updates for batch operation
      if (settings.lmStudio) updates.providers = { ...updates.providers, 'lm-studio': settings.lmStudio };
      if (settings.openRouter) updates.providers = { ...updates.providers, openrouter: settings.openRouter };
      if (settings.openai) updates.providers = { ...updates.providers, openai: settings.openai };
      if (settings.gemini) updates.providers = { ...updates.providers, gemini: settings.gemini };
      if (settings.groq) updates.providers = { ...updates.providers, groq: settings.groq };
      if (settings.anthropic) updates.providers = { ...updates.providers, anthropic: settings.anthropic };

      if (settings.notifications) updates.notifications = settings.notifications;
      if (settings.units) updates.units = settings.units;
      if (settings.agentEvolver) updates.agentEvolver = settings.agentEvolver;

      // Switch provider if specified
      if (settings.aiProvider) {
        await this.switchProvider(settings.aiProvider);
      }

      // Batch update other settings
      return await this.batchUpdateSettings(updates);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  /**
   * Reset all settings to defaults
   */
  async resetToDefaults(): Promise<ApiResponse> {
    try {
      const promises: Promise<ApiResponse>[] = [];

      // Reset Agent Evolver
      promises.push(this.resetAgentEvolver());

      // Reset to default provider
      promises.push(this.switchProvider('lm-studio'));

      const results = await Promise.allSettled(promises);
      const failures = results.filter(result => result.status === 'rejected');

      if (failures.length > 0) {
        throw new Error(`Failed to reset ${failures.length} settings`);
      }

      return {
        success: true,
        message: 'All settings reset to defaults',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to reset settings to defaults:', error);
      throw error;
    }
  }

  // =============================================================================
  // Validation and Utilities
  // =============================================================================

  /**
   * Validate provider configuration
   */
  validateProviderConfig(provider: string, config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (provider) {
      case 'lm-studio':
        if (!config.url?.trim()) {
          errors.push('LM Studio URL is required');
        } else {
          try {
            new URL(config.url);
          } catch {
            errors.push('Invalid LM Studio URL format');
          }
        }
        if (!config.model?.trim()) {
          errors.push('Model name is required');
        }
        break;

      case 'openrouter':
        if (!config.apiKey?.trim()) {
          errors.push('OpenRouter API key is required');
        }
        if (!config.model?.trim()) {
          errors.push('Model is required');
        }
        break;

      case 'openai':
        if (!config.apiKey?.trim()) {
          errors.push('API key is required');
        }
        if (!config.model?.trim()) {
          errors.push('Model is required');
        }
        break;

      case 'gemini':
        if (!config.apiKey?.trim()) {
          errors.push('Gemini API key is required');
        }
        if (!config.model?.trim()) {
          errors.push('Model is required');
        }
        break;

      case 'groq':
        if (!config.apiKey?.trim()) {
          errors.push('Groq API key is required');
        }
        if (!config.model?.trim()) {
          errors.push('Model is required');
        }
        break;

      case 'anthropic':
        if (!config.apiKey?.trim()) {
          errors.push('Anthropic API key is required');
        }
        if (!config.model?.trim()) {
          errors.push('Model is required');
        }
        break;

      default:
        errors.push(`Unknown provider: ${provider}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get provider requirements and setup instructions
   */
  getProviderInfo(provider: string): {
    name: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
    setupInstructions: string[];
    pros: string[];
    cons: string[];
  } {
    const providerInfo: Record<string, any> = {
      'lm-studio': {
        name: 'LM Studio',
        description: 'Local AI model runner for offline use',
        requiredFields: ['url', 'model'],
        optionalFields: ['apiKey'],
        setupInstructions: [
          'Download and install LM Studio from lmstudio.ai',
          'Start LM Studio and load a compatible model',
          'Find the server URL (usually http://localhost:1234)',
          'Enter the model name exactly as it appears in LM Studio',
          'Test the connection'
        ],
        pros: ['Free', 'Offline use', 'Privacy', 'Customizable models'],
        cons: ['Requires powerful computer', 'Manual setup', 'Limited to local hardware']
      },
      'openrouter': {
        name: 'OpenRouter',
        description: 'Cloud-based AI model API service',
        requiredFields: ['apiKey', 'model'],
        optionalFields: ['baseUrl'],
        setupInstructions: [
          'Create account at openrouter.ai',
          'Generate API key from dashboard',
          'Choose a model from their catalog',
          'Enter API key and model name',
          'Test the connection'
        ],
        pros: ['Easy setup', 'Multiple models', 'Good performance', 'Reliable'],
        cons: ['Paid service', 'Requires internet', 'Privacy concerns']
      },
      'openai': {
        name: 'OpenAI',
        description: 'OpenAI\'s GPT models',
        requiredFields: ['apiKey', 'model'],
        optionalFields: ['baseUrl'],
        setupInstructions: [
          'Create account at openai.com',
          'Generate API key from platform.openai.com',
          'Enter API key and choose GPT model',
          'Test the connection'
        ],
        pros: ['High quality', 'Fast response', 'Well documented'],
        cons: ['Expensive', 'Usage limits', 'Privacy concerns']
      },
      'gemini': {
        name: 'Google Gemini',
        description: 'Google\'s Gemini AI models',
        requiredFields: ['apiKey', 'model'],
        optionalFields: ['baseUrl'],
        setupInstructions: [
          'Create account at aistudio.google.com',
          'Generate API key from Google AI Studio',
          'Enter API key and choose Gemini model',
          'Test the connection'
        ],
        pros: ['Fast', 'Cost effective', 'Good reasoning'],
        cons: ['Newer service', 'Limited documentation']
      },
      'groq': {
        name: 'Groq',
        description: 'Ultra-fast AI inference platform',
        requiredFields: ['apiKey', 'model'],
        optionalFields: ['baseUrl'],
        setupInstructions: [
          'Create account at groq.com',
          'Generate API key from console',
          'Enter API key and choose model',
          'Test the connection'
        ],
        pros: ['Extremely fast', 'Good pricing', 'Reliable'],
        cons: ['Limited model selection', 'Newer service']
      },
      'anthropic': {
        name: 'Anthropic Claude',
        description: 'Anthropic\'s Claude AI models',
        requiredFields: ['apiKey', 'model'],
        optionalFields: ['baseUrl'],
        setupInstructions: [
          'Create account at console.anthropic.com',
          'Generate API key from dashboard',
          'Enter API key and choose Claude model',
          'Test the connection'
        ],
        pros: ['High quality', 'Safety focused', 'Good reasoning'],
        cons: ['Expensive', 'Rate limits', 'Privacy concerns']
      }
    };

    return providerInfo[provider] || {
      name: 'Unknown Provider',
      description: 'Unknown AI provider',
      requiredFields: [],
      optionalFields: [],
      setupInstructions: [],
      pros: [],
      cons: []
    };
  }

  /**
   * Get recommended models for each provider
   */
  getRecommendedModels(): Record<string, string[]> {
    return {
      'lm-studio': [
        'llama-3-8b-instruct',
        'llama-3.1-8b-instruct',
        'mistral-7b-instruct',
        'mixtral-8x7b-instruct',
        'qwen-7b-instruct'
      ],
      'openrouter': [
        'meta-llama/llama-3.1-8b-instruct:free',
        'meta-llama/llama-3.1-70b-instruct',
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4o-mini',
        'google/gemini-pro-1.5'
      ],
      'openai': [
        'gpt-4o-mini',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      'gemini': [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
      ],
      'groq': [
        'llama-3.3-70b-versatile',
        'mixtral-8x7b-32768',
        'llama-3.1-70b-versatile'
      ],
      'anthropic': [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229'
      ]
    };
  }
}

// Export singleton instance
export const settingsService = new SettingsService();

// Export service class for testing
export { SettingsService };