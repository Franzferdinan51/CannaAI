import { toast } from 'sonner';

// Types for API responses and requests
export interface AnalysisRequest {
  strain: string;
  leafSymptoms: string;
  phLevel: string;
  temperature: string;
  humidity: string;
  medium: string;
  growthStage: string;
  plantImage?: string;
  pestDiseaseFocus: string;
  urgency: string;
  additionalNotes: string;
}

export interface AnalysisResponse {
  analysis: {
    diagnosis: string;
    urgency: string;
    confidence: number;
    healthScore: number;
    causes: string[];
    strainSpecificAdvice?: string;
    reasoning: Array<{
      step: string;
      weight: number;
      explanation: string;
    }>;
    recommendations: {
      immediate?: string[];
      shortTerm?: string[];
      longTerm?: string[];
    };
  };
  metadata?: {
    provider: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
}

export interface ChatMessage {
  message: string;
  image?: string;
  context?: any;
  sensorData?: any;
  mode: 'chat';
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
  provider: string;
  processingTime: string;
  fallback?: boolean;
  providerInfo?: any;
  agentEvolver?: any;
  error?: {
    userMessage?: string;
    message?: string;
  };
}

export interface SensorData {
  temperature: number;
  humidity: number;
  soilMoisture: number;
  lightIntensity: number;
  ph: number;
  ec: number;
  co2: number;
  vpd: number;
}

export interface Strain {
  id: string;
  name: string;
  type: string;
  lineage: string;
  description: string;
  isPurpleStrain: boolean;
  optimalConditions: {
    ph: { range: [number, number]; medium: string };
    temperature: { veg: [number, number]; flower: [number, number] };
    humidity: { veg: [number, number]; flower: [number, number] };
    light: { veg: string; flower: string };
  };
  commonDeficiencies: string[];
}

export interface Settings {
  aiProviders: any;
  lmStudio: any;
  agentEvolver: any;
}

// API base URL configuration
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    // In development, use port 3000 for the backend
    const backendPort = hostname === 'localhost' ? '3000' : port;
    return `${protocol}//${hostname}:${backendPort}/api`;
  }
  return '/api'; // Fallback for SSR
};

// Generic API client with error handling
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Analysis API
  async analyzePlant(data: AnalysisRequest): Promise<AnalysisResponse> {
    return this.request<AnalysisResponse>('/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chat API
  async sendMessage(data: ChatMessage): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Sensor data API
  async getSensorData(): Promise<SensorData> {
    return this.request<SensorData>('/sensors');
  }

  // Strains API
  async getStrains(): Promise<{ strains: Strain[] }> {
    return this.request<{ strains: Strain[] }>('/strains');
  }

  async createStrain(strain: Omit<Strain, 'id'>): Promise<Strain> {
    return this.request<Strain>('/strains', {
      method: 'POST',
      body: JSON.stringify(strain),
    });
  }

  async updateStrain(id: string, strain: Partial<Strain>): Promise<Strain> {
    return this.request<Strain>(`/strains/${id}`, {
      method: 'PUT',
      body: JSON.stringify(strain),
    });
  }

  async deleteStrain(id: string): Promise<void> {
    return this.request<void>(`/strains/${id}`, {
      method: 'DELETE',
    });
  }

  // Settings API
  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    return this.request<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // AI Providers API
  async getAIProviders(): Promise<any> {
    return this.request<any>('/ai/providers');
  }

  async updateAIProviders(providers: any): Promise<any> {
    return this.request<any>('/ai/providers', {
      method: 'PUT',
      body: JSON.stringify(providers),
    });
  }

  // LM Studio API
  async getLMStudioStatus(): Promise<any> {
    return this.request<any>('/lmstudio');
  }

  async getLMStudioModels(): Promise<any> {
    return this.request<any>('/lmstudio/models');
  }

  async sendLMStudioMessage(data: any): Promise<any> {
    return this.request<any>('/lmstudio/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// React Query hooks for better caching and state management
export const createApiHooks = () => {
  // Note: These would be used with @tanstack/react-query
  // For now, we'll create the structure and they can be implemented later

  return {
    // Analysis hooks
    useAnalysis: () => {
      // Implementation for React Query would go here
      return {
        mutate: async (data: AnalysisRequest) => {
          try {
            const result = await apiClient.analyzePlant(data);
            toast.success('Analysis completed successfully');
            return result;
          } catch (error) {
            toast.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        },
      };
    },

    // Chat hooks
    useChat: () => {
      return {
        mutate: async (data: ChatMessage) => {
          try {
            const result = await apiClient.sendMessage(data);
            return result;
          } catch (error) {
            toast.error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        },
      };
    },

    // Sensor data hooks
    useSensorData: () => {
      return {
        data: null, // Would be cached data from React Query
        refetch: async () => {
          try {
            return await apiClient.getSensorData();
          } catch (error) {
            console.error('Failed to fetch sensor data:', error);
            throw error;
          }
        },
      };
    },

    // Strains hooks
    useStrains: () => {
      return {
        data: [], // Would be cached data from React Query
        refetch: async () => {
          try {
            return await apiClient.getStrains();
          } catch (error) {
            console.error('Failed to fetch strains:', error);
            throw error;
          }
        },
      };
    },

    // Settings hooks
    useSettings: () => {
      return {
        data: {}, // Would be cached data from React Query
        refetch: async () => {
          try {
            return await apiClient.getSettings();
          } catch (error) {
            console.error('Failed to fetch settings:', error);
            throw error;
          }
        },
        update: async (settings: Partial<Settings>) => {
          try {
            const result = await apiClient.updateSettings(settings);
            toast.success('Settings updated successfully');
            return result;
          } catch (error) {
            toast.error(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        },
      };
    },
  };
};

export const apiHooks = createApiHooks();

// Error boundary helper
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Utility functions
export const isNetworkError = (error: unknown): boolean => {
  return error instanceof Error && (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('ERR_INTERNET_DISCONNECTED')
  );
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};