import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { AnalysisResponse, Strain } from '../types/scanner';

export interface ChatApiResponse {
  response: string;
  metadata?: Record<string, unknown>;
}

export interface StrainsApiResponse {
  strains: Strain[];
}

export interface CustomStrainApiResponse {
  strain?: Strain;
  success?: boolean;
  error?: { message?: string } | string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

export const API_ORIGIN = import.meta.env.VITE_API_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001');
export const apiUrl = (path: string): string => `${API_ORIGIN}/api${path.startsWith('/') ? path : `/${path}`}`;

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = `${API_ORIGIN}/api`) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('cannai_token') : null)
          || import.meta.env.VITE_CANNAAI_API_TOKEN;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          status: error.response?.status,
          data: error.response?.data,
        };
        return Promise.reject(apiError);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // File upload method
  async upload<T>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
    }

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual API methods for specific endpoints
export const api = {
  // Plant Analysis - Enhanced
  analyze: (data: any) => apiClient.post<AnalysisResponse>('/analyze', data),
  analyzeSimple: (data: any) => apiClient.post('/analyze-simple', data),
  autoAnalyze: (file: File) => apiClient.upload('/auto-analyze', file),
  trichomeAnalysis: (file: File) => apiClient.upload('/trichome-analysis', file),

  // Scanner-specific endpoints
  scanner: {
    // Image processing
    uploadImage: (file: File, metadata?: any) => {
      const formData = new FormData();
      formData.append('image', file);
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
      }
      return apiClient.post('/scanner/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },

    // Analysis history
    getHistory: (params?: { limit?: number; offset?: number; strain?: string }) =>
      apiClient.get('/scanner/history', params),

    deleteAnalysis: (id: string) => apiClient.delete(`/scanner/history/${id}`),

    // Batch operations
    batchAnalyze: (files: File[], formData: any) => {
      const formDataObj = new FormData();
      files.forEach((file, index) => {
        formDataObj.append(`images[${index}]`, file);
      });
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, value as string);
      });
      return apiClient.post('/scanner/batch-analyze', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },

    // Export and reports
    exportAnalysis: (id: string, format: 'pdf' | 'json' | 'csv' = 'pdf') =>
      apiClient.get(`/scanner/export/${id}`, { format }),

    generateReport: (id: string) => apiClient.post(`/scanner/report/${id}`),

    // Scanner settings
    getSettings: () => apiClient.get('/scanner/settings'),
    updateSettings: (settings: any) => apiClient.put('/scanner/settings', settings),

    // Statistics and analytics
    getStats: (timeRange?: 'week' | 'month' | 'year') =>
      apiClient.get('/scanner/stats', { timeRange }),

    getCommonIssues: () => apiClient.get('/scanner/common-issues'),

    // Camera and capture
    getCameraDevices: () => apiClient.get('/scanner/camera/devices'),

    // Strain management
    addCustomStrain: (strain: Partial<Strain>) => apiClient.post<CustomStrainApiResponse>('/scanner/strains', strain),
    updateCustomStrain: (id: string, strain: any) => apiClient.put(`/scanner/strains/${id}`, strain),
    deleteCustomStrain: (id: string) => apiClient.delete(`/scanner/strains/${id}`),
  },

  // Chat & AI
  chat: (message: string) => apiClient.post<ChatApiResponse>('/chat', { message }),
  advisors: {
    status: () => apiClient.get('/advisors'),
    run: (data: { task: string; context?: string; provider?: string }) => apiClient.post('/advisors', data),
  },
  lmstudio: {
    chat: (message: string) => apiClient.post('/lmstudio/chat', { message }),
    models: () => apiClient.get('/lmstudio/models'),
    scan: (data: any) => apiClient.post('/debug/lmstudio-scan', data),
  },

  // Data Management
  strains: {
    list: () => apiClient.get<StrainsApiResponse>('/strains'),
    create: (data: any) => apiClient.post('/strains', data),
    update: (id: string, data: any) => apiClient.put(`/strains/${id}`, data),
    delete: (id: string) => apiClient.delete(`/strains/${id}`),
  },

  history: {
    list: (params?: any) => apiClient.get('/history', params),
    create: (data: any) => apiClient.post('/history', data),
  },

  sensors: {
    data: () => apiClient.get('/sensors'),
    update: (data: any) => apiClient.post('/sensors', data),
  },

  settings: {
    get: () => apiClient.get('/settings'),
    update: (data: any) => apiClient.post('/settings', data),
  },

  // Utility
  health: () => apiClient.get('/health'),
  version: () => apiClient.get('/version'),
  costs: () => apiClient.get('/costs'),
};

export default api;
