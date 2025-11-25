import axios, { AxiosResponse } from 'axios';
import {
  Settings,
  SettingsAPIResponse,
  TestConnectionResponse,
  GetModelsResponse,
  AgentEvolverSettings,
  LMStudioResponse,
  LMStudioConfig,
  AIProviderType
} from './types';

// API base URL - adjust as needed for your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SettingsAPIClient {
  private api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Settings API Error:', error);
        throw this.handleError(error);
      }
    );
  }

  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.statusText || 'Server error';
      return new Error(`API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: Unable to connect to server');
    } else {
      // Something else happened
      return new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Fetch all settings
   */
  async getSettings(): Promise<Settings> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.get('/api/settings');

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch settings');
      }

      return response.data.settings!;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error fetching settings');
    }
  }

  /**
   * Switch AI provider
   */
  async switchProvider(provider: AIProviderType): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'switch_provider',
        provider,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to switch provider');
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
      throw error instanceof Error ? error : new Error('Unknown error switching provider');
    }
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(provider: AIProviderType, config: any): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'update_provider',
        provider,
        config,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update provider config');
      }
    } catch (error) {
      console.error('Failed to update provider config:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating provider config');
    }
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(provider: AIProviderType): Promise<TestConnectionResponse> {
    try {
      const response: AxiosResponse<TestConnectionResponse> = await this.api.post('/api/settings', {
        action: 'test_connection',
        provider,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to test connection:', error);
      throw error instanceof Error ? error : new Error('Unknown error testing connection');
    }
  }

  /**
   * Get available models for a provider
   */
  async getProviderModels(provider: AIProviderType): Promise<GetModelsResponse> {
    try {
      const response: AxiosResponse<GetModelsResponse> = await this.api.post('/api/settings', {
        action: 'get_models',
        provider,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get provider models:', error);
      throw error instanceof Error ? error : new Error('Unknown error getting provider models');
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(config: any): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'update_notifications',
        config,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update notification settings');
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating notification settings');
    }
  }

  /**
   * Update unit settings
   */
  async updateUnitSettings(config: any): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'update_units',
        config,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update unit settings');
      }
    } catch (error) {
      console.error('Failed to update unit settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating unit settings');
    }
  }

  /**
   * Get Agent Evolver settings
   */
  async getAgentEvolverSettings(): Promise<AgentEvolverSettings> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'get_agent_evolver',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get Agent Evolver settings');
      }

      return response.data.agentEvolverSettings!;
    } catch (error) {
      console.error('Failed to get Agent Evolver settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error getting Agent Evolver settings');
    }
  }

  /**
   * Update Agent Evolver settings
   */
  async updateAgentEvolverSettings(settings: Partial<AgentEvolverSettings>): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'update_agent_evolver',
        settings,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update Agent Evolver settings');
      }
    } catch (error) {
      console.error('Failed to update Agent Evolver settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error updating Agent Evolver settings');
    }
  }

  /**
   * Add evolution record
   */
  async addEvolutionRecord(record: any): Promise<string> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'add_evolution_record',
        settings: { record },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to add evolution record');
      }

      return response.data.recordId!;
    } catch (error) {
      console.error('Failed to add evolution record:', error);
      throw error instanceof Error ? error : new Error('Unknown error adding evolution record');
    }
  }

  /**
   * Clear evolution history
   */
  async clearEvolutionHistory(): Promise<void> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'clear_evolution_history',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to clear evolution history');
      }
    } catch (error) {
      console.error('Failed to clear evolution history:', error);
      throw error instanceof Error ? error : new Error('Unknown error clearing evolution history');
    }
  }

  /**
   * Reset Agent Evolver to defaults
   */
  async resetAgentEvolver(): Promise<AgentEvolverSettings> {
    try {
      const response: AxiosResponse<SettingsAPIResponse> = await this.api.post('/api/settings', {
        action: 'reset_agent_evolver',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to reset Agent Evolver');
      }

      return response.data.agentEvolverSettings!;
    } catch (error) {
      console.error('Failed to reset Agent Evolver:', error);
      throw error instanceof Error ? error : new Error('Unknown error resetting Agent Evolver');
    }
  }

  /**
   * Get LM Studio models
   */
  async getLMStudioModels(url?: string): Promise<LMStudioResponse> {
    try {
      const searchUrl = url ? `?url=${encodeURIComponent(url)}` : '';
      const response: AxiosResponse<LMStudioResponse> = await this.api.get(`/api/lmstudio/models${searchUrl}`);

      return response.data;
    } catch (error) {
      console.error('Failed to get LM Studio models:', error);
      throw error instanceof Error ? error : new Error('Unknown error getting LM Studio models');
    }
  }

  /**
   * Save LM Studio URL
   */
  async saveLMStudioUrl(config: LMStudioConfig): Promise<void> {
    try {
      await this.updateProviderConfig('lm-studio', config);
    } catch (error) {
      console.error('Failed to save LM Studio URL:', error);
      throw error instanceof Error ? error : new Error('Unknown error saving LM Studio URL');
    }
  }

  /**
   * Get AI providers status
   */
  async getAIProvidersStatus(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await this.api.get('/api/ai/providers');
      return response.data;
    } catch (error) {
      console.error('Failed to get AI providers status:', error);
      throw error instanceof Error ? error : new Error('Unknown error getting AI providers status');
    }
  }

  /**
   * Test AI provider with specific model
   */
  async testAIProvider(providerId: string, modelId: string): Promise<TestConnectionResponse> {
    try {
      const response: AxiosResponse<TestConnectionResponse> = await this.api.post('/api/ai/providers', {
        action: 'test',
        providerId,
        modelId,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to test AI provider:', error);
      throw error instanceof Error ? error : new Error('Unknown error testing AI provider');
    }
  }

  /**
   * Batch update settings
   */
  async batchUpdateSettings(updates: Partial<Settings>): Promise<void> {
    try {
      // This would need to be implemented on the backend
      // For now, we'll update each section separately
      const promises: Promise<void>[] = [];

      if (updates.notifications) {
        promises.push(this.updateNotificationSettings(updates.notifications));
      }

      if (updates.units) {
        promises.push(this.updateUnitSettings(updates.units));
      }

      if (updates.agentEvolver) {
        promises.push(this.updateAgentEvolverSettings(updates.agentEvolver));
      }

      // Handle provider updates
      if (updates.lmStudio) {
        promises.push(this.updateProviderConfig('lm-studio', updates.lmStudio));
      }
      if (updates.openRouter) {
        promises.push(this.updateProviderConfig('openrouter', updates.openRouter));
      }
      if (updates.openai) {
        promises.push(this.updateProviderConfig('openai', updates.openai));
      }
      if (updates.gemini) {
        promises.push(this.updateProviderConfig('gemini', updates.gemini));
      }
      if (updates.groq) {
        promises.push(this.updateProviderConfig('groq', updates.groq));
      }
      if (updates.anthropic) {
        promises.push(this.updateProviderConfig('anthropic', updates.anthropic));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to batch update settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error batch updating settings');
    }
  }

  /**
   * Export settings
   */
  async exportSettings(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const settings = await this.getSettings();

      if (format === 'json') {
        return new Blob([JSON.stringify(settings, null, 2)], {
          type: 'application/json',
        });
      } else {
        // CSV export would need more complex logic
        // For now, convert to JSON and format as CSV
        const csv = this.convertSettingsToCSV(settings);
        return new Blob([csv], {
          type: 'text/csv',
        });
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error exporting settings');
    }
  }

  /**
   * Import settings
   */
  async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      // Validate settings structure
      if (!this.validateSettings(settings)) {
        throw new Error('Invalid settings file format');
      }

      await this.batchUpdateSettings(settings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error instanceof Error ? error : new Error('Unknown error importing settings');
    }
  }

  private validateSettings(settings: any): boolean {
    // Basic validation - check for required top-level properties
    return (
      typeof settings === 'object' &&
      settings !== null &&
      typeof settings.aiProvider === 'string' &&
      typeof settings.lmStudio === 'object' &&
      typeof settings.openRouter === 'object'
    );
  }

  private convertSettingsToCSV(settings: Settings): string {
    // Simple CSV conversion - in a real implementation, you'd want more sophisticated handling
    const headers = ['Category', 'Setting', 'Value'];
    const rows: string[][] = [headers];

    // Add settings rows
    rows.push(['AI Provider', 'Default Provider', settings.aiProvider]);
    rows.push(['LM Studio', 'URL', settings.lmStudio.url]);
    rows.push(['LM Studio', 'Model', settings.lmStudio.model]);
    rows.push(['OpenRouter', 'Model', settings.openRouter.model]);
    rows.push(['Notifications', 'Enabled', settings.notifications.enabled.toString()]);
    rows.push(['Units', 'Temperature', settings.units.temperature]);
    rows.push(['Units', 'Weight', settings.units.weight]);

    return rows.map(row => row.join(',')).join('\n');
  }
}

// Create singleton instance
export const settingsAPI = new SettingsAPIClient();
export default settingsAPI;